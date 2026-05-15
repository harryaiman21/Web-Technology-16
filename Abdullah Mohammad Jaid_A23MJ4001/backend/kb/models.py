from django.conf import settings
from django.db import models


class ArticleStatus(models.TextChoices):
	DRAFT = "draft", "Draft"
	REVIEWED = "reviewed", "Reviewed"
	PUBLISHED = "published", "Published"


class KnowledgeArticle(models.Model):
	title = models.CharField(max_length=200)
	summary = models.TextField(blank=True)
	steps = models.TextField(blank=True)
	tags = models.CharField(
		max_length=255,
		blank=True,
		help_text="Comma-separated tags (e.g., billing,invoice,freight).",
	)
	status = models.CharField(
		max_length=20,
		choices=ArticleStatus.choices,
		default=ArticleStatus.DRAFT,
	)

	creator = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.PROTECT,
		related_name="created_articles",
	)

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:
		return f"{self.title} ({self.status})"


class ArticleRevision(models.Model):
	article = models.ForeignKey(
		KnowledgeArticle,
		on_delete=models.CASCADE,
		related_name="revisions",
	)

	title = models.CharField(max_length=200)
	summary = models.TextField(blank=True)
	steps = models.TextField(blank=True)
	tags = models.CharField(max_length=255, blank=True)
	status = models.CharField(max_length=20, choices=ArticleStatus.choices)

	changed_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.PROTECT,
		related_name="article_changes",
	)
	change_note = models.CharField(max_length=255, blank=True)
	changed_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-changed_at", "-id"]

	def __str__(self) -> str:
		return f"Rev {self.id} for {self.article_id}"


class Attachment(models.Model):
	article = models.ForeignKey(
		KnowledgeArticle,
		on_delete=models.CASCADE,
		related_name="attachments",
	)
	revision = models.ForeignKey(
		ArticleRevision,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="attachments",
	)

	file = models.FileField(upload_to="attachments/%Y/%m/%d/")
	original_name = models.CharField(max_length=255)
	content_type = models.CharField(max_length=100, blank=True)

	uploaded_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.PROTECT,
		related_name="uploaded_attachments",
	)
	uploaded_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-uploaded_at", "-id"]

	def __str__(self) -> str:
		return self.original_name


class IngestionRecord(models.Model):
	sha256 = models.CharField(max_length=64, db_index=True)
	source_type = models.CharField(max_length=30, blank=True)
	source_name = models.CharField(max_length=255, blank=True)
	created_at = models.DateTimeField(auto_now_add=True, db_index=True)

	class Meta:
		ordering = ["-created_at", "-id"]

	def __str__(self) -> str:
		return self.sha256
