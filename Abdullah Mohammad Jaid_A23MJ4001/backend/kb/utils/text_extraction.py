from __future__ import annotations

import io
import mimetypes
import shutil


class TextExtractionError(Exception):
    pass


def _decode_text_bytes(data: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def extract_text_from_txt(file) -> str:
    try:
        data = file.read()
        if isinstance(data, str):
            text = data
        else:
            text = _decode_text_bytes(data)
        text = (text or "").strip()
        if not text:
            raise TextExtractionError("No text found in TXT")
        return text
    except TextExtractionError:
        raise
    except Exception as exc:
        raise TextExtractionError("TXT extraction failed") from exc


def extract_text_from_pdf(file) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception as exc:
        raise TextExtractionError("PDF extraction dependency missing") from exc

    try:
        data = file.read()
        reader = PdfReader(io.BytesIO(data))
        chunks: list[str] = []
        for page in reader.pages:
            extracted = (page.extract_text() or "").strip()
            if extracted:
                chunks.append(extracted)
        text = "\n\n".join(chunks).strip()
        if not text:
            raise TextExtractionError("No text found in PDF")
        return text
    except TextExtractionError:
        raise
    except Exception as exc:
        raise TextExtractionError("PDF extraction failed") from exc


def extract_text_from_docx(file) -> str:
    try:
        from docx import Document  # type: ignore
    except Exception as exc:
        raise TextExtractionError("DOCX extraction dependency missing") from exc

    try:
        data = file.read()
        doc = Document(io.BytesIO(data))
        text = "\n".join((p.text or "").rstrip() for p in doc.paragraphs).strip()
        if not text:
            raise TextExtractionError("No text found in DOCX")
        return text
    except TextExtractionError:
        raise
    except Exception as exc:
        raise TextExtractionError("DOCX extraction failed") from exc


def extract_text_from_image(file) -> str:
    """OCR an uploaded image (PNG/JPG/JPEG) into text.

    Requires:
      - Pillow (PIL)
      - pytesseract
      - Tesseract binary installed and available on PATH
    """

    try:
        from PIL import Image  # type: ignore
    except Exception as exc:
        raise TextExtractionError("Image OCR dependency missing (Pillow)") from exc

    try:
        import pytesseract  # type: ignore
    except Exception as exc:
        raise TextExtractionError("Image OCR dependency missing (pytesseract)") from exc

    try:
        # On Windows, pytesseract requires the tesseract.exe binary.
        if shutil.which("tesseract") is None:
            raise TextExtractionError("OCR is not configured (Tesseract not found)")

        # Validate it is callable (gives a clearer error early).
        try:
            _ = pytesseract.get_tesseract_version()
        except Exception as exc:
            raise TextExtractionError("OCR is not configured (Tesseract not usable)") from exc

        data = file.read()
        image = Image.open(io.BytesIO(data))
        # Normalize into a format that OCR tends to handle better.
        image = image.convert("RGB")

        text = (pytesseract.image_to_string(image) or "").strip()
        if not text:
            raise TextExtractionError("No text found in image")
        return text
    except TextExtractionError:
        raise
    except Exception as exc:
        raise TextExtractionError("Image OCR failed") from exc


def extract_text_from_file(*, file, mime_type: str | None = None, filename: str | None = None) -> str:
    """Extract text from an uploaded file.

    Raises TextExtractionError on unsupported types or failures.
    """

    filename = filename or getattr(file, "name", "") or ""
    guessed, _ = mimetypes.guess_type(filename)
    effective_type = (mime_type or guessed or "").lower()

    # Reset file pointer if possible (UploadedFile supports seek)
    try:
        file.seek(0)
    except Exception:
        pass

    if effective_type == "text/plain" or filename.lower().endswith(".txt"):
        return extract_text_from_txt(file)

    try:
        file.seek(0)
    except Exception:
        pass

    if (
        effective_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or filename.lower().endswith(".docx")
    ):
        return extract_text_from_docx(file)

    try:
        file.seek(0)
    except Exception:
        pass

    if effective_type == "application/pdf" or filename.lower().endswith(".pdf"):
        return extract_text_from_pdf(file)

    try:
        file.seek(0)
    except Exception:
        pass

    if effective_type in {"image/png", "image/jpeg", "image/jpg"} or filename.lower().endswith(
        (".png", ".jpg", ".jpeg")
    ):
        return extract_text_from_image(file)

    raise TextExtractionError("Unsupported file type")
