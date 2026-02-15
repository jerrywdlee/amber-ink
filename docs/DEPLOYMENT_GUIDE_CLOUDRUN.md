# Google Cloud Run デプロイガイド (Real-world Deployment)

本プロジェクトを Google Cloud Run へデプロイする際の実践的な手順です。
今朝のデプロイ実績に基づき、Source-based build を利用した「集約型」のデプロイ方法に特化しています。

## 1. 事前準備 (Prerequisites)

1.  **gcloud CLI**: インストールおよび認証 (`gcloud auth login`) 済みであること。
2.  **Google Cloud プロジェクト**: デプロイ先のプロジェクトが選択されていること (`gcloud config set project [PROJECT_ID]`)。
3.  **MongoDB Atlas**: ネットワークアクセス（IP Access List）で Cloud Run からの接続が許可されていること（開発・検証時は `0.0.0.0/0` を推奨）。

---

## 2. デプロイ手順 (Source-based Deployment)

Docker イメージを手動でビルド・プッシュすることなく、ソースコードから直接デプロイします。

```bash
# functions ディレクトリで実行
cd functions

# デプロイコマンド
gcloud run deploy amber-ink-backend \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "MONGODB_URI=mongodb+srv://[USER]:[PASS]@[CLUSTER].mongodb.net/[DB_NAME]?retryWrites=true&w=majority" \
  --set-env-vars "GEMINI_API_KEY=[YOUR_KEY]" \
  --set-env-vars "ADMIN_TOKEN=[YOUR_TOKEN]" \
  --set-env-vars "APP_ID=amber-ink" \
  --set-env-vars "EMERGENCY_THRESHOLD_DAYS=3"
```

> [!TIP]
> `--source .` を使用すると、Google Cloud Build が背後でイメージ作成を行い、Artifact Registry へのプッシュも自動的に完結します。

---

## 3. 環境変数の管理

デプロイ後は、Google Cloud コンソールの「新しいリビジョンの編集とデプロイ」メニューから環境変数を安全に編集・管理できます。

### 重要な変数
- **MONGODB_URI**: MongoDB Atlas の接続文字列（`mongodb+srv://...`）を使用します。
- **BASE_FUNCTION_URL**: デプロイ成功後に発行される URL
- **FRONTEND_URL**: フロントエンドが公開されている URL（CORS 許可に必要）

---

## 4. 注意点

- **Cold Start**: 初回のアクセスには数秒かかる場合があります。
- **CORS**: フロントエンドの URL が変わった場合は、バックエンドの環境変数 `FRONTEND_URL` を必ず更新してください。
