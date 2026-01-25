# Amber Ink（アンバー・インク）

「琥珀（Amber）」に刻む、永遠の「インク（Ink）」。

孤独死・社会的孤立を防ぐ安否確認エージェント。
「監視」ではなく、AIが生成する「日常の彩り（ニュース、趣味情報等）」を届けることで、ポジティブな生存確認と「生きた証」の保護を実現します。

## 🌟 主な機能
- **温かいオンボーディング**: Gemini AIとの対話を通じて、性格や興味（ペルソナ）を自然に抽出。
- **ポジティブ安否確認**: 義務的な生存確認ではなく、興味に合わせたニュース配信を通じて「繋がっている安心感」を提供。
- **継続ストリーク**: 日々のチェックインを宝石のように繋いでいくロードマップUI。
- **セキュアアーキテクチャ**: すべてのデータ操作をサーバーサイド経由で行い、プライバシーとセキュリティを担保。

## 🚀 クイックスタート（ローカルデモ環境）

このプロジェクトは、Podman / Dockerを使用して数コマンドで起動できます。

### 1. 環境変数の設定
`frontend` と `functions` のそれぞれに `.env` を作成します。
(詳細は [ENV_SETUP.md](./ENV_SETUP.md) を参照)

```bash
# Gemini API Key を取得して設定してください
cp frontend/.env.example frontend/.env
cp functions/.env.example functions/.env
```

### 2. アプリケーションの起動
```bash
podman compose up --build
```

### 3. アクセス
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **MongoDB**: [localhost:27017]

## 📄 ドキュメント一覧
- [SYSTEM_SUMMARY.md](./SYSTEM_SUMMARY.md): 中間発表用システム概要・遷移図
- [ARCHITECTURE.md](./ARCHITECTURE.md): 技術構成・データフロー詳細
- [ENV_SETUP.md](./ENV_SETUP.md): 環境構築詳細
