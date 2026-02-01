# 環境変数設定ガイド (Local Demo Mode)

このプロジェクトでは、frontend と functions それぞれに `.env` ファイルが必要です。
ローカル開発環境（Podman/Docker Compose）では、以下の構成で動作します。

## 1. Functions (.env)
バックエンドの `functions/` ディレクトリに設置します。

```bash
# Gemini API Key (Google AI Studioより取得)
GEMINI_API_KEY=your_gemini_api_key_here

# データベース設定 (Docker Compose 内の MongoDB)
MONGO_URI=mongodb://root:example@mongodb:27017/amber_ink_db?authSource=admin

# 共通設定
APP_ID=amber-ink
PORT=8080
```

## 2. Frontend (.env)
フロントエンドの `frontend/` ディレクトリに設置します。デモ環境では、Docker Compose で起動した各機能のポートに合わせます。

```bash
# 各機能のエンドポイント (Local Docker Compose)
VITE_CLOUD_FUNCTION_URL=http://localhost:8081
VITE_REGISTER_USER_URL=http://localhost:8082
VITE_CHECKIN_URL=http://localhost:8083
VITE_GET_USER_DATA_URL=http://localhost:8085

# Manual Delivery Triggers (プレゼン・テスト用)
VITE_RUN_AI_ANALYZER_URL=http://localhost:8086
VITE_RUN_DELIVERY_ENGINE_URL=http://localhost:8087

VITE_APP_ID=amber-ink
```

---

## 3. (参考) クラウド/Firebase環境用
Google Cloud (Vertex AI) や Firebase に接続する場合は、追加で以下の変数が必要になります。

### Firebase (Frontend)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID` ...等

### Google Cloud (Functions)
- `GCP_PROJECT_ID`
- `SENDGRID_API_KEY` (メール配信用)

## セキュリティに関する注意
- `.env` ファイルには API キーが含まれます。**絶対に Git へコミットしないでください。**
- リポジトリの `.env.example` をコピーして、自分の環境に合わせて編集してください。
