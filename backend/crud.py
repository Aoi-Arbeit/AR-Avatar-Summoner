from typing import Optional

from sqlalchemy.orm import Session
from . import models, schemas
import hashlib
import secrets
import string
from jose import jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_CODE_CHARS = string.ascii_uppercase + string.digits
# 紛らわしい文字を除外: 0, O, 1, I, l
ACCESS_CODE_CHARS = ACCESS_CODE_CHARS.replace("0", "").replace("O", "").replace("1", "").replace("I", "").replace("l", "")


def hash_access_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def generate_access_code(length: int = 6) -> str:
    return "".join(secrets.choice(ACCESS_CODE_CHARS) for _ in range(length))


def generate_character_id() -> str:
    import uuid
    return f"CHAR-{uuid.uuid4().hex[:8].upper()}"


def create_character(db: Session, char_in: schemas.CharacterCreate) -> tuple[models.Character, str]:
    access_code = generate_access_code()
    character_id = generate_character_id()

    db_character = models.Character(
        id=character_id,
        name=char_in.name or "NoName",
        access_code_hash=hash_access_code(access_code),
        parts_config=char_in.parts_config.model_dump(),
        agent_persona=char_in.agent_persona.model_dump(exclude_none=True) if char_in.agent_persona else None,
    )
    db.add(db_character)
    db.commit()
    db.refresh(db_character)

    return db_character, access_code


def get_character_by_id(db: Session, character_id: str) -> Optional[models.Character]:
    return db.query(models.Character).filter(models.Character.id == character_id).first()


def verify_access_code(db: Session, character_id: str, access_code: str) -> Optional[models.Character]:
    character = get_character_by_id(db, character_id)
    if not character:
        return None
    if character.access_code_hash != hash_access_code(access_code):
        return None
    return character


def create_jwt_token(character_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode = {"sub": character_id, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def update_character_parts(db: Session, character_id: str, parts_config: dict) -> Optional[models.Character]:
    character = get_character_by_id(db, character_id)
    if not character:
        return None
    character.parts_config = parts_config
    db.commit()
    db.refresh(character)
    return character


def update_agent_persona(db: Session, character_id: str, persona: dict) -> Optional[models.Character]:
    character = get_character_by_id(db, character_id)
    if not character:
        return None
    character.agent_persona = persona
    db.commit()
    db.refresh(character)
    return character


def update_memory_summary(db: Session, character_id: str, summary: str) -> Optional[models.Character]:
    character = get_character_by_id(db, character_id)
    if not character:
        return None
    character.memory_summary = summary
    db.commit()
    db.refresh(character)
    return character
