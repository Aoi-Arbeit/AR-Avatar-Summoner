# AI Agent統合型 ARキャラクターアプリ 詳細設計書

**プロジェクト名：** AR Avatar Summoner with AI Agent

**バージョン：** 2.0.0（AI Agent拡張版）

---

## 1. AI Agent 活用の3大コンセプト

本システムでは、AI Agent（LLM Function Calling / マルチモーダル推論）を以下の3つのレイヤーに配置します。

| エージェント名 | 配置場所 | 役割・自律アクション |
| --- | --- | --- |
| **① クリエイター支援Agent**<br>*(Design Stylist Agent)* | PC側（キャラ作成画面） | ユーザーの曖昧な要望（「クールな魔法使い風」「サイバーパンク調」等）から、最適なプリセット番号の組み合わせと性格プロンプトを自律選択・提案する。 |
| **② 空間認識・行動決定Agent**<br>*(Embodied AR Agent)* | スマホ側（AR召喚画面） | スマホのカメラ映像（現実の風景）・GPS・時間帯・ユーザーの音声を認識し、**「発話内容」と「3Dモーション（喜ぶ・歩く・座る等）」を自律的に決定して実行**する。 |
| **③ ゲームマスターAgent**<br>*(Field Quest Agent)* | バックエンド（拡張機能） | ユーザーの現在地や天候に応じて、突発的なミニクエストやイベント（「近くの公園で写真を撮ろう」等）を動的生成する。 |

---

## 2. システム全体アーキテクチャ（AI Agent組み込み後）

```text
[PCブラウザ: キャラ作成]
   │ ├ 自然言語指示 ("元気な冒険者にして")
   ▼ ▼
[FastAPI バックエンド (API Gateway & Agent Orchestrator)]
   ├──▶ [Database (SQLite / PostgreSQL)] : パーツ構成 ＋ AI人格設定(Persona)を保存
   └──▶ [LLM / Multimodal Agent API] (Function Calling / Structured Outputs)
          ▲
          │ ① カメラフレーム画像 + 音声テキスト + キャラ設定
          │ ② 構造化JSON返却 { speech: "わあ、広い机だね！", motion: "jump", emotion: "happy" }
          ▼
[スマホブラウザ: Three.js + WebXR]
   └── 3Dモデル合体描画 ＋ モーション再生 ＋ 音声合成(TTS)/吹き出し表示

```

---

## 3. エージェント別 詳細設計

### 3.1 クリエイター支援Agent（PC側：自然言語キャラメイク）

プリセットを手動で選ぶだけでなく、AIと対話しながらキャラを組み上げる機能です。

* **入力：** ユーザーのテキスト指示（例：「夏っぽくて爽やかな感じにして」）
* **Agentのツール呼び出し（Structured Output）：**
利用可能なパーツカタログ（JSON）を参照し、条件に合うパーツIDの組み合わせと、そのキャラの「口調・性格（システムプロンプト）」を自動生成して3Dプレビューに即座に反映します。

```json
// Agentが出力する構造化データの例
{
  "parts_config": {
    "face": 2,
    "body": 1,
    "hair": 5,
    "accessories": [3],
    "hair_color": "#00BFFF"
  },
  "persona": {
    "character_name": "ソラ",
    "personality": "好奇心旺盛で明るいアウトドア派",
    "first_person": "ボク",
    "speaking_style": "語尾に「〜だね！」「〜しようよ！」をよく使う"
  }
}

```

---

### 3.2 空間認識・行動決定Agent（スマホ側：自律ARキャラクター）

現実世界に召喚されたキャラクターが、ただ突っ立っているだけでなく「周囲の環境を見て反応する」コア機能です。

#### 処理フロー

1. **センシング：** スマホで「話しかける」または「周囲を見せる」ボタンを押下すると、現在のカメラのキャプチャ画像（1フレーム）とユーザーの発話テキストをバックエンドへ送信。
2. **推論（Multimodal Agent）：** DBから取得したキャラの `persona`（性格）を踏まえ、カメラ画像に写っている物体（例：コーヒーカップ、パソコン、芝生など）を認識。
3. **アクション出力：** セリフと同時に、Three.js側で再生すべき**アニメーション名**と表情（モーフターゲット）をJSONで返却。

```json
// POST /api/v1/agent/interact のレスポンス例
{
  "reply_text": "おっ、パソコンで作業中？コーヒーも美味しそうだね！応援してるよ！",
  "action": {
    "animation_clip": "cheer_wave", // Three.jsのAnimationMixerで再生
    "facial_expression": "smile",   // 顔パーツのブレンドシェイプ変更
    "look_at_user": true            // カメラ（ユーザー）の方を向く制御
  }
}

```

---

## 4. データベース設計の拡張

既存の `characters` テーブルに、AIエージェントの人格・記憶を保持するカラムを追加します。

### `characters` テーブル定義（v2.0）

| カラム名 | データ型 | 説明 |
| --- | --- | --- |
| `id` | `VARCHAR(16)` | キャラクターID（例: `CHAR-8F92A1`） |
| `access_code_hash` | `VARCHAR(128)` | 6桁アクセスコードのハッシュ値 |
| `parts_config` | `JSONB` | 顔・体・髪・アクセサリのID構成 |
| **`agent_persona`** | **`JSONB`** | **【追加】AIの性格・一人称・口調・背景設定** |
| **`memory_summary`** | **`TEXT`** | **【追加】ユーザーとの過去の会話や訪れた場所の要約記憶** |
| `created_at` | `TIMESTAMP` | 作成日時 |

---

## 5. APIエンドポイント設計（AI Agent対応版）

| メソッド | エンドポイント | 役割 |
| --- | --- | --- |
| `POST` | `/api/v1/agent/generate-preset` | **【PC用】** テキスト指示からパーツ構成と性格設定をAIが自動生成 |
| `POST` | `/api/v1/characters` | パーツ構成＋AI人格設定をDBに保存し、IDとアクセスコードを発行 |
| `POST` | `/api/v1/characters/auth` | **【スマホ用】** IDとコードでログインし、パーツ構成とAI設定を取得 |
| `POST` | `/api/v1/agent/interact` | **【スマホ用】** 音声/テキスト＋カメラ画像を送り、キャラの返答と3Dモーション指示を取得 |

---

## 6. FastAPI × AI Agent 実装イメージ（バックエンド中核コード）

Structured Outputs（構造化出力）を使い、Three.jsが確実に解釈できるモーション制御JSONを返却させます。

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(title="AR Character & AI Agent API")

# Three.js側で実装されているアニメーション一覧を型定義で縛る
class AgentActionResponse(BaseModel):
    reply_text: str = Field(..., description="キャラクターのセリフ（50文字以内）")
    animation_clip: Literal["idle", "walk", "jump", "wave", "cheer", "think"] = Field(
        ..., description="再生する3Dアニメーション名"
    )
    expression: Literal["neutral", "happy", "surprised", "sleepy"] = Field(
        ..., description="顔の表情（ブレンドシェイプ）"
    )

class InteractRequest(BaseModel):
    character_id: str
    user_message: str
    scene_description: str | None = "室内のデスクの上"  # カメラ画像の解析結果または状況

@app.post("/api/v1/agent/interact", response_model=AgentActionResponse)
async def interact_with_character(req: InteractRequest):
    # 1. DBからキャラの性格設定(persona)を取得（ここではモック）
    persona = "元気で好奇心旺盛な相棒。語尾は「〜だよ！」"

    # 2. LLM Agentへのシステムプロンプト構築
    system_prompt = f"""
    あなたはAR空間に召喚された3Dキャラクターです。
    性格設定: {persona}
    現在の周囲の状況: {req.scene_description}
    ユーザーの発言に対して、セリフ(reply_text)と、取るべき3Dモーション(animation_clip)、表情(expression)をJSONで出力してください。
    """

    # ※ここでOpenAI / Claude / Gemini API等のStructured Outputsを呼び出す
    # 以下は返却される構造化データのシミュレーション
    return AgentActionResponse(
        reply_text="わあ、デスクの上だね！今日も作業がんばっててえらいよ！",
        animation_clip="cheer",
        expression="happy"
    )

```

---

## 7. 開発プロセスにおける「コーディングAI Agent」の活用方針

アプリ内の機能だけでなく、**このアプリ自体の開発工程**にもAI Agentをフル活用して工数を圧縮します。

1. **ボイラープレート＆API自動生成：**
本設計書のJSONスキーマとエンドポイント定義をそのままAIコーディングエージェントに入力し、FastAPIのルーターとSQLAlchemyモデルを一括生成する。
2. **Three.js パーツ結合ロジックのテスト自動化：**
3Dモデル（`.glb`）が揃う前の段階で、AIに「Three.jsのプリミティブ図形（球・円柱・コーン）を組み合わせて、6種類のアニメーション（`idle`, `jump`, `wave`等）を手続き的に再生するモッククラス」を生成させ、API連携を先行完成させる。
