# 環境変数設定ガイド (Environment Setup Guide)

本プロジェクトでは `frontend/` と `functions/` のそれぞれに `.env` ファイルが必要です。開発環境（Local）と本番環境（Cloud Run）の両方の設定を以下に示します。

## 1. Backend: Functions (`.env`)

バックエンドは、ローカルの `podman-compose` または Google Cloud Run で動作します。すべての設定は **プロジェクトのルートディレクトリ** にある `.env` ファイルで行います。

Cloud Run へのデプロイ詳細は [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) を参照してください。

### 基本設定
| 変数名 | 説明 | 例 |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio の API キー | `AIzaSy...` |
| `MONGODB_URI` | MongoDB 接続文字列 (Atlas または Local) | `mongodb+srv://...` |
| `MONGODB_DB_NAME` | 使用するデータベース名 | `amber_ink` |
| `APP_ID` | アプリケーション識別子 | `amber-ink-demo` |
| `ADMIN_TOKEN` | 管理者ダッシュボード用認証トークン | `697ef9eb...` |
| `EMERGENCY_THRESHOLD_DAYS` | 緊急通知を出すまでの不活動日数 | `3` |

### メール配信設定 (SMTP)
| 変数名 | 説明 | 例 |
| :--- | :--- | :--- |
| `SMTP_HOST` | SMTP サーバーホスト | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP ポート (TLS: 587 / SSL: 465) | `587` |
| `SMTP_USER` | 送信元メールアドレス | `user@gmail.com` |
| `SMTP_PASS` | アプリパスワード | `xxxx xxxx xxxx xxxx` |

### URL 設定 (本番環境で必須)
| 変数名 | 説明 | 例 |
| :--- | :--- | :--- |
| `BASE_FUNCTION_URL` | バックエンドのベース URL | `https://backend-xxx.run.app` |
| `FRONTEND_URL` | フロントエンドの公開 URL | `https://jerrywdlee.github.io/amber-ink` |


## 2. Frontend: Vite (`frontend/.env`)

フロントエンドは Vite を通じて、環境変数（`VITE_` プレフィックス）を読み込みます。

| 変数名 | 説明 | ローカル例 |
| :--- | :--- | :--- |
| `VITE_APP_ID` | アプリケーション識別子 | `amber-ink-demo` |
| `VITE_CLOUD_FUNCTION_URL` | `onboardingAgent` URL | `.../onboardingAgent` |
| `VITE_REGISTER_USER_URL` | `registerUser` URL | `.../registerUser` |
| `VITE_GET_USER_DATA_URL` | `getUserData` URL | `.../getUserData` |
| `VITE_COMPANION_AGENT_URL` | `companionAgent` URL | `.../companionAgent` |
| `VITE_CHECKIN_URL` | `checkIn` URL | `.../checkIn` |
| `VITE_DOWNLOAD_MEMORIAL_URL` | `downloadMemorial` URL | `.../downloadMemorial` |
| `VITE_RUN_AI_ANALYZER_URL` | (Admin) AI解析実行 URL | `.../runAiAnalyzer` |
| `VITE_RUN_DELIVERY_ENGINE_URL` | (Admin) 配信実行 URL | `.../runDeliveryEngine` |
| `VITE_RUN_EMERGENCY_MONITOR_URL`| (Admin) 緊急監視実行 URL | `.../runEmergencyMonitor` |

> [!NOTE]
> 本番環境では、すべてのエンドポイントが `BASE_FUNCTION_URL` 配下になります。

---

## 3. セットアップ手順

1. **API キーの取得**: [Google AI Studio](https://aistudio.google.com/) で Gemini API キーを発行。
2. **ファイルのコピー**: 
    - ローカル用: プロジェクトルートの `.env.example` を `.env` にリネーム。
    - Cloud Run用: プロジェクトルートの `env.example.yaml` を `env.yaml` にリネーム（任意ですが推奨）。
3. **変数の編集**: 各ファイル内のキーやトークン、接続文字列を編集。

## 4. アーキテクチャの切り替え (Architecture Switching)

本プロジェクトは、目的に合わせて 2 つの構成を選択できます。

### A. 集約型構成 (Aggregated - デフォルト)
すべての機能が 1 つのコンテナ内で動作します（ポート 8080）。本番環境（Cloud Run）に近く、セットアップが最も簡単です。
- **実行コマンド**: `podman compose up`
- **Frontend 設定**: すべての `VITE_..._URL` 項目を `http://localhost:8080` 配下のパスに設定。

### B. 分散型構成 (Pure Microservices)
各機能を個別のコンテナとして独立して起動したい場合は、`extra/pure-microservices/` ディレクトリの設定を使用してください。
- **用途**: 各サービスの独立した負荷検証や、特定のサービスのみのデバッグ。
- **詳細**: [extra/pure-microservices/README.md](../extra/pure-microservices/README.md) を参照。
