from __future__ import annotations

from datetime import datetime
import mimetypes
import logging

from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from kb.models import ArticleStatus, Attachment, IngestionRecord, KnowledgeArticle
from kb.permissions import IsEditorReviewerAdminOrReadOnly, get_roles
from kb.serializers import (
	ArticleRevisionSerializer,
	AttachmentSerializer,
	AttachmentUploadSerializer,
	IngestionRecordSerializer,
	KnowledgeArticleSerializer,
	LoginSerializer,
)
from kb.services import compute_sha256, create_revision, extract_text_from_attachment, seen_in_last_days
from kb.utils.ai_metadata import generate_metadata
from kb.utils.text_extraction import TextExtractionError, extract_text_from_file

logger = logging.getLogger(__name__)


def _parse_dt(value: str | None) -> datetime | None:
	if not value:
		return None
	parsed = parse_datetime(value)
	if parsed:
		return parsed
	parsed_date = parse_date(value)
	if parsed_date:
		return datetime.combine(parsed_date, datetime.min.time(), tzinfo=timezone.get_current_timezone())
	return None


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
	serializer_class = KnowledgeArticleSerializer
	permission_classes = [IsEditorReviewerAdminOrReadOnly]
	parser_classes = [JSONParser, FormParser, MultiPartParser]

	def get_queryset(self):
		qs = KnowledgeArticle.objects.select_related("creator")

		q = self.request.query_params.get("q")
		if q:
			qs = qs.filter(Q(title__icontains=q) | Q(summary__icontains=q) | Q(steps__icontains=q))

		status_param = self.request.query_params.get("status")
		if status_param:
			qs = qs.filter(status=status_param)

		tag = self.request.query_params.get("tag")
		if tag:
			qs = qs.filter(tags__icontains=tag)

		creator = self.request.query_params.get("creator")
		if creator:
			qs = qs.filter(creator__username__icontains=creator)

		from_dt = _parse_dt(self.request.query_params.get("from"))
		date_field = self.request.query_params.get("date_field") or "updated_at"
		if date_field not in {"updated_at", "created_at"}:
			date_field = "updated_at"
		if from_dt:
			qs = qs.filter(**{f"{date_field}__gte": from_dt})

		to_dt = _parse_dt(self.request.query_params.get("to"))
		if to_dt:
			qs = qs.filter(**{f"{date_field}__lte": to_dt})

		ordering = self.request.query_params.get("ordering") or "-updated_at"
		allowed = {"updated_at", "-updated_at", "created_at", "-created_at", "title", "-title"}
		if ordering in allowed:
			qs = qs.order_by(ordering)
		return qs

	def perform_create(self, serializer):
		article = serializer.save(creator=self.request.user)
		create_revision(article=article, changed_by=self.request.user, change_note="Created")

	def create(self, request, *args, **kwargs):
		ai_flag = (
			str(request.query_params.get("ai_generated") or request.data.get("ai_generated") or "")
			.strip()
			.lower()
		)
		ai_generated = ai_flag in {"1", "true", "yes", "y"}

		if not ai_generated:
			return super().create(request, *args, **kwargs)

		uploaded_file = request.FILES.get("file")
		if not uploaded_file:
			return Response({"error": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

		filename = getattr(uploaded_file, "name", "") or ""
		content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
		guessed_type, _ = mimetypes.guess_type(filename)
		effective_type = content_type or ((guessed_type or "").lower())

		allowed = {
			"text/plain",
			"application/pdf",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		}
		if effective_type not in allowed:
			return Response({"error": "Unsupported file type"}, status=status.HTTP_400_BAD_REQUEST)

		requested_status = str(request.data.get("status") or ArticleStatus.DRAFT).strip()
		if requested_status not in ArticleStatus.values:
			requested_status = ArticleStatus.DRAFT

		try:
			raw_text = extract_text_from_file(file=uploaded_file, mime_type=effective_type, filename=filename)
			meta = generate_metadata(raw_text)
			title = meta["title"]
			summary = meta["summary"]
			tags_list = meta["tags"]
			tags = ",".join(tags_list)

			steps = request.data.get("steps")
			if not steps:
				steps = raw_text

			article = KnowledgeArticle.objects.create(
				title=title,
				summary=summary,
				steps=steps,
				tags=tags,
				status=requested_status,
				creator=request.user,
			)
			revision = create_revision(article=article, changed_by=request.user, change_note="Created (AI-generated)")

			try:
				uploaded_file.seek(0)
			except Exception:
				pass

			Attachment.objects.create(
				article=article,
				revision=revision,
				file=uploaded_file,
				original_name=filename,
				content_type=effective_type,
				uploaded_by=request.user,
			)

			return Response(self.get_serializer(article).data, status=status.HTTP_201_CREATED)
		except TextExtractionError:
			logger.error("AI create: text extraction failed", exc_info=True)
			return Response({"error": "Text extraction failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
		except Exception as exc:
			logger.error("AI create: metadata generation failed", exc_info=True)
			payload = {"error": "AI generation failed"}
			if getattr(settings, "DEBUG", False):
				payload["detail"] = f"{type(exc).__name__}: {exc}"
			return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

	def perform_update(self, serializer):
		article = serializer.save()
		create_revision(article=article, changed_by=self.request.user, change_note="Updated")

	@action(
		detail=False,
		methods=["post"],
		url_path="generate-metadata",
		permission_classes=[IsEditorReviewerAdminOrReadOnly],
		parser_classes=[MultiPartParser, FormParser],
	)
	def generate_metadata_action(self, request):
		uploaded_file = request.FILES.get("file")
		if not uploaded_file:
			return Response({"error": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

		filename = getattr(uploaded_file, "name", "") or ""
		content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
		guessed_type, _ = mimetypes.guess_type(filename)
		effective_type = content_type or ((guessed_type or "").lower())

		try:
			warning = None
			try:
				raw_text = extract_text_from_file(file=uploaded_file, mime_type=effective_type, filename=filename)
			except TextExtractionError as exc:
				# Best-effort fallback: still generate metadata based on filename when the file
				# has no extractable text or OCR isn't configured.
				logger.warning("Generate metadata: text extraction failed; falling back to filename", exc_info=True)
				warning = "Text extraction failed; generated metadata from filename only."
				raw_text = (
					f"Filename: {filename}\n"
					f"MIME type: {effective_type or 'unknown'}\n\n"
					"The file content could not be extracted. Generate best-effort title, summary, and tags."
				)
				if getattr(settings, "DEBUG", False):
					warning = f"{warning} ({type(exc).__name__}: {exc})"

			meta = generate_metadata(raw_text)
			payload = {"title": meta["title"], "summary": meta["summary"], "tags": meta["tags"]}
			if warning:
				payload["warning"] = warning
			return Response(payload)
		except Exception as exc:
			logger.error("Generate metadata: AI generation failed", exc_info=True)
			payload = {"error": "AI generation failed"}
			if getattr(settings, "DEBUG", False):
				payload["detail"] = f"{type(exc).__name__}: {exc}"
			return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

	@action(detail=True, methods=["post"], url_path="transition", permission_classes=[IsEditorReviewerAdminOrReadOnly])
	def transition(self, request, pk=None):
		article: KnowledgeArticle = self.get_object()
		next_status = request.data.get("status")
		if next_status not in ArticleStatus.values:
			return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

		current = article.status
		allowed_next = {
			ArticleStatus.DRAFT: {ArticleStatus.REVIEWED},
			ArticleStatus.REVIEWED: {ArticleStatus.PUBLISHED},
			ArticleStatus.PUBLISHED: set(),
		}
		if next_status not in allowed_next.get(current, set()):
			return Response({"detail": "Invalid status transition."}, status=status.HTTP_400_BAD_REQUEST)

		roles = get_roles(request.user)
		if next_status == ArticleStatus.PUBLISHED and not (roles.is_reviewer or roles.is_admin):
			return Response({"detail": "Only reviewers/admin can publish."}, status=status.HTTP_403_FORBIDDEN)

		article.status = next_status
		article.save(update_fields=["status", "updated_at"])
		create_revision(
			article=article,
			changed_by=request.user,
			change_note=f"Status {current} → {next_status}",
		)
		return Response(self.get_serializer(article).data)

	@action(detail=True, methods=["get"], url_path="revisions")
	def revisions(self, request, pk=None):
		article: KnowledgeArticle = self.get_object()
		revisions = article.revisions.select_related("changed_by").all()
		return Response(ArticleRevisionSerializer(revisions, many=True).data)

	@action(detail=True, methods=["get"], url_path="attachments")
	def attachments(self, request, pk=None):
		article: KnowledgeArticle = self.get_object()
		attachments = article.attachments.select_related("uploaded_by").all()
		return Response(AttachmentSerializer(attachments, many=True, context={"request": request}).data)


class AttachmentViewSet(viewsets.ModelViewSet):
	queryset = Attachment.objects.select_related("article", "revision", "uploaded_by")
	permission_classes = [IsEditorReviewerAdminOrReadOnly]

	def get_serializer_class(self):
		if self.action in {"create"}:
			return AttachmentUploadSerializer
		return AttachmentSerializer

	def get_queryset(self):
		qs = super().get_queryset()
		article_id = self.request.query_params.get("article")
		if article_id:
			qs = qs.filter(article_id=article_id)
		return qs

	def perform_create(self, serializer):
		uploaded_file = serializer.validated_data["file"]
		article: KnowledgeArticle = serializer.validated_data["article"]

		revision = serializer.validated_data.get("revision")
		if revision is None:
			revision = article.revisions.first()

		serializer.save(
			revision=revision,
			original_name=uploaded_file.name,
			content_type=getattr(uploaded_file, "content_type", ""),
			uploaded_by=self.request.user,
		)

	@action(detail=True, methods=["post"], url_path="extract-text")
	def extract_text(self, request, pk=None):
		attachment: Attachment = self.get_object()
		text = extract_text_from_attachment(attachment=attachment)
		return Response({"id": attachment.id, "text": text})


class IngestionRecordViewSet(viewsets.ModelViewSet):
	queryset = IngestionRecord.objects.all()
	serializer_class = IngestionRecordSerializer
	permission_classes = [IsEditorReviewerAdminOrReadOnly]


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
	serializer = LoginSerializer(data=request.data)
	serializer.is_valid(raise_exception=True)
	user = serializer.validated_data["user"]

	token, _ = Token.objects.get_or_create(user=user)
	roles = get_roles(user)
	return Response(
		{
			"token": token.key,
			"user": {"id": user.id, "username": user.username},
			"roles": {"editor": roles.is_editor, "reviewer": roles.is_reviewer, "admin": roles.is_admin},
		}
	)


@api_view(["POST"])
def logout_view(request):
	if request.user and not isinstance(request.user, AnonymousUser):
		Token.objects.filter(user=request.user).delete()
	return Response({"detail": "Logged out."})


@api_view(["GET"])
def me_view(request):
	roles = get_roles(request.user)
	return Response(
		{
			"user": {"id": request.user.id, "username": request.user.username},
			"roles": {"editor": roles.is_editor, "reviewer": roles.is_reviewer, "admin": roles.is_admin},
		}
	)


@api_view(["POST"])
def duplicate_check_view(request):
	text = request.data.get("text")
	sha256 = request.data.get("sha256")
	if not text and not sha256:
		return Response({"detail": "Provide either 'text' or 'sha256'."}, status=status.HTTP_400_BAD_REQUEST)

	if text and not sha256:
		sha256 = compute_sha256(str(text))

	duplicate = seen_in_last_days(sha256=sha256, days=14)
	return Response({"sha256": sha256, "duplicate": duplicate})
