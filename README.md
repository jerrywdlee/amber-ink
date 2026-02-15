# Amber Ink（アンバー・インク）

「琥珀（Amber）」に刻む、永遠の「インク（Ink）」。

孤独死・社会的孤立を防ぐ安否確認エージェント。
「監視」ではなく、AIが生成する「日常の彩り（ニュース、趣味情報等）」を届けることで、ポジティブな生存確認と「生きた証」の保護を実現します。

## 📝 開発ブログ (Article)
- [AIエージェントとステガノグラフィーで創る、想いの継承プラットフォーム『Amber Ink』](https://zenn.dev/julia_caesaris/articles/88233f487dbaf1)

<!--
## 🌟 公開 URL (Live Demo)
[jerrywdlee.github.io/amber-ink](https://jerrywdlee.github.io/amber-ink)
-->

---

## 💎 主な機能
- **琥珀の宝石箱 (Jewelry Box)**: 未来の家族へ残したい「想い」を、AES/RSA ハイブリッド暗号と**ステガノグラフィ (電子透かし)** により画像に封印。
- **琥珀との語らい (Companion)**: 安否確認。感情の変化を汲み取り、安否確認ページへの反映をリアルタイムに実施。
- **ポジティブ安否確認**: 興味に合わせたニュースや挨拶を毎日メールで受信。リンクをクリックするだけでチェックインが完了。
- **継続ストリーク**: 日々のチェックインを宝石のように繋いでいく、直感的なロードマップ UI。
- **家族用安否確認ページ**: ステータス報告と、暗号化された遺言の解読（鍵画像を使用）が可能。

## 🛠 技術スタック (Technical Stack)
- **Frontend**: React, Vite, Tailwind CSS, Web Crypto API
- **Backend**: Node.js, Google Cloud Functions, Nodemailer (EJS)
- **Database**: MongoDB Atlas
- **AI**: Google Gemini 2.5-flash

---

## 🚀 ローカル開発環境の起動

本プロジェクトはデフォルトで **集約型アーキテクチャ (Aggregated Architecture)** を採用しており、最小限のリソースで全機能を実行できます。

1. **環境変数の設定**: 詳細は [ENV_SETUP.md](./docs/ENV_SETUP.md) を参照。
2. **起動**:
   ```bash
   docker compose up --build
   ```
3. **アクセス**: 
   - [http://localhost:5173](http://localhost:5173)

### 🧩 その他の構成 (Alternative Architecture)
より高度な分散開発・検証を行いたい方向けに、各機能を独立したコンテナとして動かす **[純粋なマイクロサービス構成](./extra/pure-microservices/)** も用意しています。詳細は該当ディレクトリの README を参照してください。

---

## 🛠 管理者用ダッシュボード

- **URL**: `?view=admin` パラメータでアクセス。
- **Admin Token**: 環境変数で設定した `ADMIN_TOKEN` が必要です。

## 📄 ドキュメント一覧
- [SYSTEM_SUMMARY.md](./docs/SYSTEM_SUMMARY.md): システム概要・遷移図
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md): アーキテクチャ詳細
- [ENV_SETUP.md](./docs/ENV_SETUP.md): 環境構築詳細
- [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md): デプロイガイド（Cloud Run & GitHub Pages）
- [AI_DEVELOPMENT_EFFORT_REPORT.md](./docs/AI_DEVELOPMENT_EFFORT_REPORT.md): AI開発工数・コスト比較レポート
