import io
from docx import Document
import extract_msg


def read_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="replace").strip()


def read_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()


def read_msg(file_bytes: bytes) -> str:
    # extract-msg needs a file-like object saved to a temp file
    import tempfile, os
    with tempfile.NamedTemporaryFile(delete=False, suffix=".msg") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    msg = None
    try:
        msg = extract_msg.Message(tmp_path)
        parts = []
        if msg.subject:
            parts.append(f"Subject: {msg.subject}")
        if msg.sender:
            parts.append(f"From: {msg.sender}")
        if msg.to:
            parts.append(f"To: {msg.to}")
        if msg.date:
            parts.append(f"Date: {msg.date}")
        parts.append("")  # blank line separator
        if msg.body:
            parts.append(msg.body.strip())
        return "\n".join(parts).strip()
    finally:
        if msg:
            msg.close()
        os.unlink(tmp_path)


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    name = filename.lower()
    if name.endswith(".txt"):
        return read_txt(file_bytes)
    elif name.endswith(".docx"):
        return read_docx(file_bytes)
    elif name.endswith(".msg"):
        return read_msg(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {filename}")