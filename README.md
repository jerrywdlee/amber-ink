# Amber Ink（アンバー・インク）

「琥珀（Amber）」に刻む、永遠の「インク（Ink）」。

孤独死・社会的孤立を防ぐ安否確認エージェント。
「監視」ではなく、AIが生成する「日常の彩り（ニュース、趣味情報等）」を届けることで、ポジティブな生存確認と「生きた証」の保護を実現します。

## 🌟 公開 URL (Live Demo)
[jerrywdlee.github.io/amber-ink](https://jerrywdlee.github.io/amber-ink)

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

Podman / Docker を使用して数コマンドで起動できます。

1. **環境変数の設定**: 詳細は [ENV_SETUP.md](./ENV_SETUP.md) を参照。
2. **起動**:
   ```bash
   podman compose up --build
   ```
3. **アクセス**: 
   - [http://localhost:5173](http://localhost:5173)

---

## 🛠 管理者用ダッシュボード

- **URL**: `?view=admin` パラメータでアクセス。
- **Admin Token**: 環境変数で設定した `ADMIN_TOKEN` が必要です。

## 📄 ドキュメント一覧
- [SYSTEM_SUMMARY.md](./SYSTEM_SUMMARY.md): システム概要・遷移図
- [ARCHITECTURE.md](./ARCHITECTURE.md): アーキテクチャ詳細
- [ENV_SETUP.md](./ENV_SETUP.md): 環境構築詳細
