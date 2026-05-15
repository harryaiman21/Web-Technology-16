from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import os

from database import create_tables, get_db, RawInput, Article, StatusHistory, seed_users
from ocr_service import extract_text_from_image
from file_reader import extract_text_from_file
from auth import (
    verify_password, create_token, get_current_user,
    require_editor, require_reviewer
)

app = FastAPI(title="SOPify API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
ALLOWED_TEXT_EXTENSIONS = {".txt", ".docx", ".msg", ".pdf"}
MAX_FILE_SIZE_MB = 10


# ── Startup ────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    create_tables()
    db = next(get_db())
    seed_users(db)
    print("✓ Database ready")


# ── Health ─────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok"}


# ── Auth ───────────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    from database import User

    user = db.query(User).filter(User.username == form.username).first()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token({"sub": user.id, "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }


@app.get("/api/auth/me")
def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role
    }


# ── Upload (raw input) ─────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_input(
    source: str = Form(...),
    raw_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_editor),
):
    # ── Manual text ────────────────────────────────────────────────────────
    if source == "manual_text":
        if not raw_text or not raw_text.strip():
            raise HTTPException(status_code=400, detail="raw_text is required")

        clean_text = raw_text.strip()

        record = RawInput(
            source_type="manual_text",
            raw_text=clean_text,
            status="raw"
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        # Auto-create article draft
        article = Article(
            title=f"Draft from Record #{record.id}",
            content=clean_text,
            tags="",
            status="draft",
            creator_id=current_user.id,
        )

        db.add(article)
        db.commit()
        db.refresh(article)

        _log_status(
            db,
            article.id,
            None,
            "draft",
            current_user.id,
            "Auto-created from manual text upload"
        )

        return _serialize_raw(record)

    # ── File required ──────────────────────────────────────────────────────
    if not file:
        raise HTTPException(status_code=400, detail="file is required")

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_FILE_SIZE_MB}MB"
        )

    filename = file.filename or ""

    ext = (
        "." + filename.rsplit(".", 1)[-1].lower()
        if "." in filename else ""
    )

    # ── Text-based files ───────────────────────────────────────────────────
    if ext in ALLOWED_TEXT_EXTENSIONS:
        try:
            text = extract_text_from_file(file_bytes, filename)

        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Could not read file: {e}"
            )

        source_type_map = {
            ".txt": "file_txt",
            ".docx": "file_docx",
            ".msg": "file_msg",
            ".pdf": "file_pdf"
        }

        record = RawInput(
            source_type=source_type_map.get(ext, "file_txt"),
            raw_text=text,
            image_name=filename,
            status="raw"
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        # Auto-create article draft
        article = Article(
            title=filename.rsplit(".", 1)[0],
            content=text,
            tags="",
            status="draft",
            creator_id=current_user.id,
        )

        db.add(article)
        db.commit()
        db.refresh(article)

        _log_status(
            db,
            article.id,
            None,
            "draft",
            current_user.id,
            "Auto-created from file upload"
        )

        return _serialize_raw(record)

    # ── Image OCR ──────────────────────────────────────────────────────────
    if file.content_type in ALLOWED_IMAGE_TYPES:
        safe_name = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{filename}"

        save_path = os.path.join(UPLOAD_DIR, safe_name)

        with open(save_path, "wb") as f:
            f.write(file_bytes)

        try:
            extracted = extract_text_from_image(file_bytes)

        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"OCR failed: {e}"
            )

        record = RawInput(
            source_type="file_image",
            raw_text="",
            extracted_text=extracted,
            image_path=save_path,
            image_name=filename,
            status="ocr_done"
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        # Auto-create article draft
        article = Article(
            title=filename.rsplit(".", 1)[0],
            content=extracted,
            tags="ocr,image",
            status="draft",
            creator_id=current_user.id,
        )

        db.add(article)
        db.commit()
        db.refresh(article)

        _log_status(
            db,
            article.id,
            None,
            "draft",
            current_user.id,
            "Auto-created from OCR upload"
        )

        return _serialize_raw(record)

    raise HTTPException(
        status_code=415,
        detail=f"Unsupported file type: {ext or file.content_type}"
    )


# ── Articles ───────────────────────────────────────────────────────────────
@app.post("/api/articles")
def create_article(
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),
    db: Session = Depends(get_db),
    current_user=Depends(require_editor),
):
    article = Article(
        title=title.strip(),
        content=content.strip(),
        tags=tags.strip(),
        status="draft",
        creator_id=current_user.id,
    )

    db.add(article)
    db.commit()
    db.refresh(article)

    # log initial status
    _log_status(
        db,
        article.id,
        None,
        "draft",
        current_user.id,
        "Created manually"
    )

    return _serialize_article(article, include_history=True)


@app.get("/api/articles")
def list_articles(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    creator: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(Article)

    if search:
        q = q.filter(
            Article.title.ilike(f"%{search}%") |
            Article.content.ilike(f"%{search}%") |
            Article.tags.ilike(f"%{search}%")
        )

    if status:
        q = q.filter(Article.status == status)

    if tag:
        q = q.filter(Article.tags.ilike(f"%{tag}%"))

    if creator:
        from database import User

        q = q.join(
            User,
            Article.creator_id == User.id
        ).filter(
            User.username.ilike(f"%{creator}%")
        )

    if date_from:
        q = q.filter(
            Article.created_at >= datetime.fromisoformat(date_from)
        )

    if date_to:
        q = q.filter(
            Article.created_at <= datetime.fromisoformat(date_to)
        )

    articles = q.order_by(Article.created_at.desc()).all()

    return [
        _serialize_article(a, include_history=True)
        for a in articles
    ]


@app.get("/api/articles/{article_id}")
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    article = db.query(Article).filter(
        Article.id == article_id
    ).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    return _serialize_article(article, include_history=True)


@app.put("/api/articles/{article_id}")
def update_article(
    article_id: int,
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),
    db: Session = Depends(get_db),
    current_user=Depends(require_editor),
):
    article = db.query(Article).filter(
        Article.id == article_id
    ).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if article.status == "published":
        raise HTTPException(
            status_code=403,
            detail="Published articles are locked"
        )

    article.title = title.strip()
    article.content = content.strip()
    article.tags = tags.strip()
    article.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(article)

    return _serialize_article(article, include_history=True)


@app.post("/api/articles/{article_id}/status")
def update_status(
    article_id: int,
    new_status: str = Form(...),
    note: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    article = db.query(Article).filter(
        Article.id == article_id
    ).first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Enforce workflow rules
    valid_transitions = {
        "draft": {
            "reviewed": "reviewer",
            "rejected": "reviewer",
        },
        "reviewed": {
            "published": "reviewer",
            "rejected": "reviewer",
            "draft":    "reviewer",
        },
        "rejected": {
            "draft": "reviewer",  # reviewer can reopen a rejected article
        },
    }

    allowed = valid_transitions.get(article.status, {})

    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move from '{article.status}' to '{new_status}'"
        )

    if current_user.role != allowed[new_status]:
        raise HTTPException(
            status_code=403,
            detail=f"Only a {allowed[new_status]} can make this transition"
        )

    old_status = article.status

    article.status = new_status
    article.updated_at = datetime.utcnow()

    db.commit()

    _log_status(
        db,
        article.id,
        old_status,
        new_status,
        current_user.id,
        note
    )

    db.refresh(article)

    return _serialize_article(article, include_history=True)


# ── Raw records ────────────────────────────────────────────────────────────
@app.get("/api/records")
def get_records(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    records = db.query(RawInput)\
        .order_by(RawInput.id.desc())\
        .limit(100)\
        .all()

    return [_serialize_raw(r) for r in records]


# ── Helpers ────────────────────────────────────────────────────────────────
def _log_status(db, article_id, from_status, to_status, user_id, note=None):
    entry = StatusHistory(
        article_id=article_id,
        from_status=from_status,
        to_status=to_status,
        changed_by_id=user_id,
        note=note,
    )

    db.add(entry)
    db.commit()


def _serialize_raw(r: RawInput) -> dict:
    return {
        "id": r.id,
        "source_type": r.source_type,
        "raw_text": r.raw_text,
        "extracted_text": r.extracted_text,
        "image_path": r.image_path,
        "image_name": r.image_name,
        "status": r.status,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
    }


def _serialize_article(a: Article, include_history=False) -> dict:
    out = {
        "id": a.id,
        "title": a.title,
        "content": a.content,
        "tags": [
            t.strip()
            for t in a.tags.split(",")
            if t.strip()
        ],
        "status": a.status,
        "creator": a.creator.username if a.creator else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }

    if include_history:
        out["history"] = [
            {
                "from_status": h.from_status,
                "to_status": h.to_status,
                "changed_by": (
                    h.changed_by.username
                    if h.changed_by else None
                ),
                "changed_at": (
                    h.changed_at.isoformat()
                    if h.changed_at else None
                ),
                "note": h.note,
            }
            for h in a.history
        ]

    return out