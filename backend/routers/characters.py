from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import schemas, crud, database

router = APIRouter(prefix="/api/v1/characters", tags=["characters"])


@router.post("", response_model=schemas.CharacterResponse, status_code=status.HTTP_201_CREATED)
def save_character(char_in: schemas.CharacterCreate, db: Session = Depends(database.get_db)):
    character, access_code = crud.create_character(db, char_in)
    qr_payload = f"https://example.com/ar?id={character.id}&code={access_code}"
    return schemas.CharacterResponse(
        character_id=character.id,
        name=character.name,
        access_code=access_code,
        qr_payload=qr_payload,
        created_at=character.created_at,
    )


@router.post("/auth", response_model=schemas.CharacterAuthResponse)
def authenticate_character(auth_req: schemas.CharacterAuthRequest, db: Session = Depends(database.get_db)):
    character = crud.verify_access_code(db, auth_req.character_id, auth_req.access_code)
    if not character:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="キャラクターIDまたはアクセスコードが間違っています",
        )
    token = crud.create_jwt_token(character.id)
    return schemas.CharacterAuthResponse(
        token=token,
        character={
            "character_id": character.id,
            "name": character.name,
            "parts_config": character.parts_config,
            "agent_persona": character.agent_persona,
        },
    )


@router.put("/{character_id}")
def update_character(
    character_id: str,
    parts_config: schemas.PartsConfig,
    db: Session = Depends(database.get_db),
):
    updated = crud.update_character_parts(db, character_id, parts_config.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="キャラクターが見つかりません")
    return {"message": "キャラクターが更新されました", "character_id": character_id}
