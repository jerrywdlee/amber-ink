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
  --env-vars-file ../env.yaml \
  --project [YOUR_PROJECT_ID] \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

---

## 3. 環境変数の管理 (Environment via YAML)

Cloud Run への環境変数設定は、プロジェクトルートにある **`env.yaml`** を使用することを推奨します。

1.  ルートディレクトリに移動します。
2.  `env.example.yaml` を `env.yaml` としてコピーします。
3.  `env.yaml` 内の値を適切な本番環境設定（MongoDB Atlas の URI など）に書き換えます。
4.  デプロイコマンド（上述）を実行すると、ファイルの内容が自動的に Cloud Run に反映されます。

> [!IMPORTANT]
> `env.yaml` は秘密情報を含むため、絶対に変更をコミットしないでください（`.gitignore` で除外済みです）。
> 
> **YAML形式の注意点**:
> Cloud Run の環境変数はすべて「文字列」である必要があります。`SMTP_PORT: "587"` や `EMERGENCY_THRESHOLD_DAYS: "3"` のように、**数値であっても必ずダブルクォーテーションで囲んでください**。囲まない場合、デプロイ時にエラーが発生します。

> [!TIP]
> もし `--env-vars-file` がお使いの環境でエラーになる場合は、従来の `--set-env-vars` で直接指定してください：
> ```bash
> gcloud run deploy amber-ink-backend --source . --set-env-vars GEMINI_API_KEY=xxx,MONGODB_URI=xxx...
> ```

---

## 4. 注意点

- **Cold Start**: 初回のアクセスには数秒かかる場合があります。
- **CORS**: フロントエンドの URL が変わった場合は、バックエンドの環境変数 `FRONTEND_URL` を必ず更新してください。
