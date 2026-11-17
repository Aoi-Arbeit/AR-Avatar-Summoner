from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, crud, database

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


@router.post("/generate-preset", response_model=schemas.GeneratePresetResponse)
def generate_preset(req: schemas.GeneratePresetRequest):
    """
    クリエイター支援Agent: 自然言語指示からパーツ構成と性格設定を自動生成。
    ここではルールベースの簡易実装。将来的にLLM連携に置き換え予定。
    """
    instruction = req.instruction.lower()

    # 簡易キーワードマッチング（MVP版）
    parts_config = schemas.PartsConfig(face=1, body=1, hair=1, accessories=[])
    persona = schemas.AgentPersona()

    if "クール" in instruction or "cyber" in instruction or "サイバー" in instruction:
        parts_config = schemas.PartsConfig(face=2, body=2, hair=3, accessories=[1], hair_color="#00FFFF")
        persona = schemas.AgentPersona(
            character_name="ゼロ",
            personality="クールで寡黙なサイボーグ",
            first_person="私",
            speaking_style="簡潔で事務的な口調",
        )
    elif "魔法" in instruction or "fantasy" in instruction or "ファンタジー" in instruction:
        parts_config = schemas.PartsConfig(face=1, body=1, hair=2, accessories=[2], hair_color="#8B4513")
        persona = schemas.AgentPersona(
            character_name="リィン",
            personality="神秘的で知的な魔法使い",
            first_person="私",
            speaking_style="やや古風な口調",
        )
    elif "爽やか" in instruction or "summer" in instruction or "夏" in instruction:
        parts_config = schemas.PartsConfig(face=1, body=1, hair=1, accessories=[3], hair_color="#00BFFF")
        persona = schemas.AgentPersona(
            character_name="ソラ",
            personality="好奇心旺盛で明るいアウトドア派",
            first_person="ボク",
            speaking_style="語尾に「〜だね！」 「〜しようよ！」をよく使う",
        )

    return schemas.GeneratePresetResponse(parts_config=parts_config, persona=persona)


@router.post("/interact", response_model=schemas.AgentActionResponse)
def interact_with_character(req: schemas.InteractRequest, db: Session = Depends(database.get_db)):
    """
    空間認識・行動決定Agent: ユーザーの発話とカメラ画像から、キャラクターの返答と3Dモーションを決定する。
    """
    character = crud.get_character_by_id(db, req.character_id)
    if not character:
        raise HTTPException(status_code=404, detail="キャラクターが見つかりません")

    persona = character.agent_persona or {}
    personality = persona.get("personality", "元気なキャラクター")
    first_person = persona.get("first_person", "私")

    # 簡易ルールベース応答（MVP版。将来的にLLM連携に置き換え）
    scene = req.scene_description or ""
    message = req.user_message or ""

    if "パソコン" in scene or "デスク" in scene:
        reply_text = f"{first_person}は、{scene}で作業中だね！がんばって！"
        animation = "cheer"
        expression = "happy"
    elif "こんにちは" in message or "hello" in message.lower():
        reply_text = f"こんにちは！{first_person}だよ！よろしくね！"
        animation = "wave"
        expression = "happy"
    elif "ありがとう" in message:
        reply_text = "どういたしまして！また話しかけてね！"
        animation = "idle"
        expression = "happy"
    else:
        reply_text = f"{scene}、いい場所だね！{first_person}はここにいるよ！"
        animation = "idle"
        expression = "neutral"

    return schemas.AgentActionResponse(
        reply_text=reply_text,
        animation_clip=animation,
        expression=expression,
    )
