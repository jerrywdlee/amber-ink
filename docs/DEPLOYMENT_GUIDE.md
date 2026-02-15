# デプロイガイド (Deployment Guide)

本プロジェクトを本番環境（Google Cloud Run および GitHub Pages）へデプロイするためのガイドです。

---

## 0. 事前準備 (Authentication)

デプロイ前に、各サービスへのログインと認証が必要です。これらは通常、初回のみ実行します。

### Google Cloud (gcloud)
```bash
# ログイン（ブラウザが開きます）
gcloud auth login

# デプロイ先のプロジェクトを設定
gcloud config set project [YOUR_PROJECT_ID]
```

---

## 🚨 デプロイの順序
必ず **「1. Backend」を先にデプロイ** してください。フロントエンドのビルド時に、バックエンドの公開 URL が必要になるためです。

---

## 1. Backend: Google Cloud Run

バックエンド（`functions` ディレクトリ）をデプロイします。

### 事前準備
- **MongoDB Atlas**: ネットワークアクセスで Cloud Run からの接続が許可されていること。

### 環境変数の設定 (env.yaml)
プロジェクトルートにある **`env.yaml`** を編集します。
- `env.example.yaml` をコピーして作成。
- **重要**: 数値であっても必ず `"` で囲んでください（例: `SMTP_PORT: "587"`）。

### デプロイコマンド
```bash
# プロジェクトルートで実行
cd functions

gcloud run deploy amber-ink-backend \
  --source . \
  --env-vars-file ../env.yaml \
  --project [YOUR_PROJECT_ID] \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```
**デプロイ完了後に表示される `Service URL` をコピーしておいてください。**

---

## 2. Frontend: GitHub Pages

フロントエンド（`frontend` ディレクトリ）をデプロイします。

### 事前準備: 環境変数の反映
フロントエンドがデプロイ先のバックエンドと通信できるよう、**`frontend/.env.production`** を編集します。

1.  `frontend/.env.production` を開きます。
2.  すべての URL 項目のドメイン部分を、先ほど取得した **Cloud Run の Service URL** に書き換えます。
    - 例: `https://amber-ink-backend-xxx.run.app/onboardingAgent`

### デプロイ手順
```bash
cd frontend
npm run deploy
```

> [!NOTE]
> `npm run deploy` は内部で `npm run build` を実行し、`dist` の内容を `gh-pages` ブランチにプッシュします。

---

## 3. 注意点 (Important Notes)

- **CORS 設定**: フロントエンドの URL（`https://[user].github.io/amber-ink`）が変更になった場合は、バックエンド（`env.yaml`）の `FRONTEND_URL` を更新して再デプロイしてください。
- **Cold Start**: Cloud Run の初回起動には数秒の遅延が発生する場合があります。
- **機密情報**: `env.yaml` および `.env` は Git にコミットしないでください。
