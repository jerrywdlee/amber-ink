# Architecture & Technical Design

## デモ環境の構成 (Local Demo Mode)

このプロジェクトは、Gemini API 以外のすべてのコンポーネントをローカル環境（Podman/Docker）で完結させる構成になっています。

### コンポーネント構成
- **Frontend**: React (Vite) - ブラウザの `localStorage` により `userId` を永続化
- **Backend API**: Node.js (Functions Framework) - セキュアなデータ操作の抽象化
- **Database**: MongoDB (Container) - ユーザープロフィール、ペルソナ、セッションの保存
- **AI**: Google Gemini API (2.5-flash) - 対話型登録およびインテリジェント解析

## データフロー

### 1. ユーザー登録フロー (Persona-based)

```
Frontend                     Backend                    MongoDB
   │                            │                           │
   │──POST /onboardingAgent────▶│                           │
   │  { userId, message }       │                           │
   │                            │──ペルソナ要約取得─────────▶│
   │                            │                           │
   │                            │──Gemini API 呼び出し─────▶│
   │                            │   (要約 + 新規内容)       │
   │                            │                           │
   │                            │◀──解析結果 (要約更新)──────│
   │                            │                           │
   │                            │──ペルソナ・セッション保存──▶│
   │                            │                           │
   │◀──{ text, is_complete }────│                           │
   │                            │                           │
```

### 2. チェックインフロー

```
Frontend                     Backend                    MongoDB
   │                            │                           │
   │──POST /checkIn────────────▶│                           │
   │  { userId }                │                           │
   │                            │──ユーザー存在確認────────▶│
   │                            │                           │
   │                            │──チェックイン追加─────────▶│
   │                            │  (ISOタイムスタンプ等)     │
   │                            │                           │
   │◀──{ success: true }────────│                           │
   │                            │                           │
```

## API エンドポイント詳細

### 1. `onboardingAgent` (POST)
- **役割**: Geminiを使用した対話型登録およびペルソナ管理。
- **特徴**: PII（個人情報）を含まない「ユーザー特性」のみを要約してDBに保持。

### 2. `registerUser` (POST)
- **役割**: フォームベースの代替登録手段。

### 3. `checkIn` (POST)
- **役割**: ユーザーの「輝き（生存）」を確認し、カレンダーへ反映。

## セキュリティ設計
- **サーバーサイド書き込み**: フロントエンドからDBへの直接アクセスを遮断。
- **データプライバシー**: 対話履歴をそのまま保存せず、PIIを削ぎ落とした「ペルソナ要約」として保持。
- **環境分離**: デモ環境ではMongoDBを使用し、実運用環境では Firestore への切り替えが容易なインターフェース設計。

## 今後の拡張 (Roadmap)
- [ ] **Vertex AI 連携の深化**: より高度なコンテンツ生成（ニュース、趣味の掘り下げ）。
- [ ] **マルチチャネル通知**: SendGridによるメール配信、LINE/Twilio連携によるSMS安否確認。
- [ ] **遺言暗号化**: Web Crypto API を使用した、クライアントサイドでの秘密のメッセージ保護。
- [ ] **AIアナライザー**: 日々のログから異変を検知し、緊急連絡先へ自動通知するアルゴリズムの完成。
