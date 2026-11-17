# Backend

FastAPI と SQLAlchemy を使った開発中の API です。全体の進捗は [プロジェクト README](../README.md) を参照してください。

## セットアップと起動

Python 3 と pip が必要です。以下はプロジェクトルートから実行します。

```sh
python3 -m venv backend/venv
backend/venv/bin/python -m pip install -r backend/requirements.txt
```

現在、起動時に DB テーブルは自動作成されません。初回のローカル開発では次を実行してください。既存テーブルは変更されないため、スキーマ変更時のマイグレーションの代わりにはなりません。

```sh
backend/venv/bin/python -c 'from backend.database import engine; from backend.models import Base; Base.metadata.create_all(bind=engine)'
backend/venv/bin/python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

SQLite の `ar_avatar.db` はコマンドを実行したカレントディレクトリに作成されます。API ドキュメントは `http://127.0.0.1:8000/docs` です。上記手順はコードに基づく案内であり、今回サーバー起動までは検証していません。

## エンドポイント

| メソッド | パス | 現状 |
| --- | --- | --- |
| GET | `/` | 稼働メッセージ |
| POST | `/api/v1/characters` | パーツ・任意の人格を保存し ID とアクセスコードを発行 |
| POST | `/api/v1/characters/auth` | ID とコードを照合し JWT とキャラクター情報を返す |
| PUT | `/api/v1/characters/{character_id}` | パーツ更新。現在 JWT 検証なし |
| POST | `/api/v1/agent/generate-preset` | `instruction` を受け取り、キーワードに応じた固定プリセットを返す |
| POST | `/api/v1/agent/interact` | キャラクター ID・発話・場面説明からルールベースの発話と動作を返す |

`GET /api/v1/presets` は仕様にありますが未実装です。対話は画像を受け取らず、外部 LLM も利用しません。人格と記憶を扱う CRUD 関数はありますが、記憶の自動生成や会話履歴の保存はありません。

### 保存例

```sh
curl -X POST http://127.0.0.1:8000/api/v1/characters \
  -H 'Content-Type: application/json' \
  -d '{"name":"ソラ","parts_config":{"face":1,"body":1,"hair":1,"accessories":[]},"agent_persona":{"first_person":"ボク"}}'
```

生成されたコードは保存時にしか返されません。返却される QR 用 URL は `https://example.com/ar` の仮 URL です。

## 制約と安全性

- JWT 署名鍵がソースに固定され、更新 API ではトークンの検証がありません。
- アクセスコードは単純な SHA-256 で保存され、認証試行のレート制限もありません。
- 開発用 CORS が全オリジンを許可します。HTTPS や DB マイグレーションの設定もありません。
- 自動テストはリポジトリ内にありません。実サービスや公開環境には使用しないでください。
