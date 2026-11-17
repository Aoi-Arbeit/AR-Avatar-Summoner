from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class Character(Base):
    __tablename__ = "characters"
    __tablename__ = "characters"

    id = Column(String(16), primary_key=True, default=lambda: f"CHAR-{uuid.uuid4().hex[:8].upper()}")
    name = Column(String(50), nullable=False, default="NoName")
    access_code_hash = Column(String(128), nullable=False)
    parts_config = Column(JSON, nullable=False)
    agent_persona = Column(JSON, nullable=True)
    memory_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
