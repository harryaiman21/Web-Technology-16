from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./sop_system.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # editor | reviewer
    created_at = Column(DateTime, default=datetime.utcnow)


class RawInput(Base):
    __tablename__ = "raw_inputs"
    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String(50))
    raw_text = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    image_path = Column(String(255), nullable=True)
    image_name = Column(String(255), nullable=True)
    status = Column(String(50), default="raw")
    timestamp = Column(DateTime, default=datetime.utcnow)


class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String(500), default="")        # comma-separated
    status = Column(String(20), default="draft")  # draft | reviewed | published
    creator_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", foreign_keys=[creator_id])
    history = relationship("StatusHistory", back_populates="article", order_by="StatusHistory.changed_at")


class StatusHistory(Base):
    __tablename__ = "status_history"
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"))
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"))
    changed_at = Column(DateTime, default=datetime.utcnow)
    note = Column(Text, nullable=True)

    article = relationship("Article", back_populates="history")
    changed_by = relationship("User", foreign_keys=[changed_by_id])


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_users(db):
    from auth import hash_password
    if db.query(User).count() == 0:
        users = [
            User(username="editor1", password_hash=hash_password("editor123"), role="editor"),
            User(username="reviewer1", password_hash=hash_password("reviewer123"), role="reviewer"),
        ]
        db.add_all(users)
        db.commit()
        print("✓ Seeded: editor1 / editor123 · reviewer1 / reviewer123")