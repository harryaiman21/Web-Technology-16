from __future__ import annotations

import hashlib
import io
import mimetypes
from datetime import timedelta

from django.utils import timezone

from kb.models import ArticleRevision, Attachment, IngestionRecord, KnowledgeArticle


def compute_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def create_revision(
    *,
    article: KnowledgeArticle,
    changed_by,
    change_note: str = "",
) -> ArticleRevision:
    return ArticleRevision.objects.create(
        article=article,
        title=article.title,
        summary=article.summary,
        steps=article.steps,
        tags=article.tags,
        status=article.status,
        changed_by=changed_by,
        change_note=change_note,
    )


def seen_in_last_days(*, sha256: str, days: int) -> bool:
    cutoff = timezone.now() - timedelta(days=days)
    return IngestionRecord.objects.filter(sha256=sha256, created_at__gte=cutoff).exists()


def _decode_text_bytes(data: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def extract_text_from_attachment(*, attachment: Attachment) -> str:
    """Best-effort extraction for TXT/DOCX/PDF.

    Notes:
    - For scanned PDFs/images, OCR is not implemented here.
    - Returns empty string if extraction is unsupported or yields no text.
    """

    filename = attachment.original_name or ""
    content_type = (attachment.content_type or "").lower()

    guessed_type, _ = mimetypes.guess_type(filename)
    effective_type = content_type or (guessed_type or "")

    with attachment.file.open("rb") as f:
        data = f.read()

    # TXT
    if effective_type == "text/plain" or filename.lower().endswith(".txt"):
        return _decode_text_bytes(data).strip()

    # DOCX
    if (
        effective_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or filename.lower().endswith(".docx")
    ):
        try:
            from docx import Document  # type: ignore
        except Exception:
            return ""

        try:
            doc = Document(io.BytesIO(data))
            text = "\n".join((p.text or "").rstrip() for p in doc.paragraphs).strip()
            return text
        except Exception:
            return ""

    # PDF (text layer only)
    if effective_type == "application/pdf" or filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader  # type: ignore
        except Exception:
            return ""

        try:
            reader = PdfReader(io.BytesIO(data))
            chunks: list[str] = []
            for page in reader.pages:
                extracted = page.extract_text() or ""
                extracted = extracted.strip()
                if extracted:
                    chunks.append(extracted)
            return "\n\n".join(chunks).strip()
        except Exception:
            return ""

    return ""
