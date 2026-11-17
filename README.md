# AR Avatar Summoner

パーツを組み合わせたキャラクターを作成し、将来的にスマートフォンの AR 空間に召喚するアプリです。現在は開発途中であり、公開・本番利用はできません。

## 構成

- [frontend/](frontend/README.md): React、TypeScript、Vite、Three.js による作成画面
- [backend/](backend/README.md): FastAPI、SQLAlchemy、SQLite による API
- [specification.md](specification.md): 目標仕様
- [design.md](design.md): AI Agent 拡張の設計
- [AGENTS.md](AGENTS.md): 開発エージェント向け指針

仕様書は目標であり、実装済み機能の一覧ではありません。

## 進捗

| 領域 | 現状 |
| --- | --- |
| キャラクター作成画面 | パーツ・人格の入力、プリミティブ図形による 3D プレビュー、保存リクエストを実装。ただしプレビューは選択変更に追従しない |
| 保存・認証 API | キャラクターと人格の保存、ID・アクセスコード認証、JWT 発行を実装。DB は別途初期化が必要 |
| クリエイター支援 | キーワードによる固定プリセット API を実装。画面のリクエスト名が API と一致せず、現状の連携は失敗する |
| 対話 Agent | テキスト・場面説明を使うルールベース応答の API のみ。LLM や画像認識は未実装 |
| スマートフォン AR | ログイン画面、カメラ、WebXR、AR 召喚、音声合成は未実装 |
| アセット・拡張 | GLB アセット、パーツ合成、ゲームマスター Agent、位置・天候連携は未実装 |
| 品質・安全性 | 自動テストは見当たらない。固定 JWT 秘密鍵、認証のない更新 API、認証試行制限の欠如などが残る |

## 起動方法

前提: Python 3 と Node.js（推奨 18 以上）がインストールされていること。コマンドはすべてリポジトリのルート（`README.md` と同じ階層）で実行します。SQLite のファイルはカレントディレクトリ基準で作られるため、場所を揃えることが重要です。

### 1. バックエンドの起動

```sh
# 初回のみ: 仮想環境の作成と依存関係のインストール
python3 -m venv backend/venv
backend/venv/bin/python -m pip install -r backend/requirements.txt

# 初回のみ: DB テーブルの作成（ルートに ar_avatar.db が作られる）
backend/venv/bin/python -c 'from backend.database import engine; from backend.models import Base; Base.metadata.create_all(bind=engine)'

# 起動（http://127.0.0.1:8000）
backend/venv/bin/python -m uvicorn backend.main:app --reload --port 8000
```

起動すると `http://127.0.0.1:8000/docs` に API ドキュメント（Swagger UI）が表示されます。2 回目以降は最後の起動コマンドだけで構いません。

### 2. フロントエンドの起動

別のターミナルで実行します。

```sh
cd frontend
npm install   # 初回のみ
npm run dev   # http://localhost:5173
```

Vite の開発サーバーは `/api` へのリクエストを `http://localhost:8000` に転送します。バックエンドを先に起動してから画面を開いてください。

### 3. 停止方法

どちらのターミナルも `Ctrl+C` で停止します。`ar_avatar.db` は削除しない限り保持され、次回起動時に再利用されます。

## 実験方法

### A. API 単体の確認（curl）

バックエンド起動中に実行します。まずキャラクターを作成し、返ってきた `character_id` と `access_code` を後続のコマンドに使います。

```sh
# 1. キャラクター作成（ID とアクセスコードが返る）
curl -s -X POST http://127.0.0.1:8000/api/v1/characters \
  -H 'Content-Type: application/json' \
  -d '{"name":"テスト","parts_config":{"face":1,"body":1,"hair":1,"accessories":[]},"agent_persona":{"first_person":"ボク"}}'

# 2. 認証（1. の ID とコードを代入）。JWT トークンとキャラクター情報が返る
curl -s -X POST http://127.0.0.1:8000/api/v1/characters/auth \
  -H 'Content-Type: application/json' \
  -d '{"character_id":"CHAR-XXXXXXXX","access_code":"XXXXXX"}'

# 3. プリセット生成（キーワード: クール／魔法／爽やか など）
curl -s -X POST http://127.0.0.1:8000/api/v1/agent/generate-preset \
  -H 'Content-Type: application/json' \
  -d '{"instruction":"クールなサイバー系で頼む"}'

# 4. 対話応答（発話テキストと場面説明からセリフとモーションが返る）
curl -s -X POST http://127.0.0.1:8000/api/v1/agent/interact \
  -H 'Content-Type: application/json' \
  -d '{"character_id":"CHAR-XXXXXXXX","user_message":"こんにちは","scene_description":"室内のデスクの上"}'

# 5. パーツ更新（現在はトークン不要で更新できる点に注意）
curl -s -X PUT http://127.0.0.1:8000/api/v1/characters/CHAR-XXXXXXXX \
  -H 'Content-Type: application/json' \
  -d '{"face":2,"body":2,"hair":3,"accessories":[1]}'
```

期待される結果の例: 1 は 201 で `access_code`（6 桁の英数字）を含む JSON、2 は `token` と `agent_persona` を含む JSON、3 は「クール」で `hair_color: #00FFFF` のプリセット、4 は `animation_clip: wave` の応答。誤ったコードで 2 を実行すると 401 が返ります。

### B. ブラウザでの確認（PC クリエイター画面）

1. `http://localhost:5173` を開く。
2. パーツを選び、名前と人格（性格・一人称・話し方）を入力する。
3. 「キャラクターを保存」を押す。成功すると結果カードにキャラクター ID・アクセスコード・QR が表示される。
4. 表示された ID とコードを使い、実験 A のコマンド 2（認証）が通ることを確認する。

確認時の既知の不具合:

- 「AI STYLIST」の提案ボタンは失敗します。画面が `prompt` という項目名で送信し、API は `instruction` を要求するためです。エラーメッセージが画面に表示されます。
- 3D プレビューは初回描画の選択値で作られ、その後のパーツ変更や髪色変更は反映されません（ページ再読み込みで初期値が変わります）。
- QR 画像は外部サービス（api.qrserver.com）経由で生成され、内容は仮 URL（`example.com`）です。AR 召喚には使えず、コードを含む URL が外部サービスに送信される点に注意してください。

### C. HTTP を介さないロジック確認（インメモリ DB）

ブラウザやサーバーなしで、保存から認証までの流れを素早く確認する方法です。

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=. backend/venv/bin/python - <<'PY'
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend import models, schemas
from backend.routers import agent, characters

engine = create_engine('sqlite:///:memory:')
models.Base.metadata.create_all(engine)
db = sessionmaker(bind=engine)()

preset = agent.generate_preset(schemas.GeneratePresetRequest(instruction='夏'))
saved = characters.save_character(
    schemas.CharacterCreate(parts_config=preset.parts_config, agent_persona=preset.persona), db)
auth = characters.authenticate_character(
    schemas.CharacterAuthRequest(character_id=saved.character_id, access_code=saved.access_code), db)
print('OK', saved.character_id, auth.character['agent_persona'])
PY
```

`OK CHAR-... {'character_name': 'ソラ', ...}` のように出力されれば、プリセット生成から保存・認証までのロジックが動いています。実ファイルの `ar_avatar.db` は変更されません。

### D. スマートフォン AR の実験について

未実装のため、実験対象はありません。実装する際は仕様（`specification.md` 第 7 節）どおり HTTPS が必須で、mkcert や Cloudflare Tunnel などの準備と、QR 内の仮 URL を実 URL に置き換える作業が必要になります。

## QR・外部サービスに関する注意

QR に含まれる URL は仮の `example.com` であり、アクセスコードを含みます。現在の画面は QR 画像生成に外部サービスを使うため、コードを含む URL がそのサービスに送信されます。実データや秘密情報で利用しないでください。

## 確認状況

コードと OpenAPI 定義の棚卸しを行い、実験 C のインメモリ DB による保存・認証フローは実行して確認済みです。実験 A（curl による HTTP 通信）、実験 B（ブラウザ操作）、フロントエンドのビルドはこの README の手順としてまだ検証していません。実機 AR は未実装です。
