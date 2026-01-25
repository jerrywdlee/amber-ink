# Amber Ink - システム構成・画面遷移図（中間発表用）

「琥珀（Amber）」に刻む、永遠の「インク（Ink）」。
孤独孤立を防ぎ、個人の「生きた証」を保護するオンボーディング・パーソナルアシスタント。

---

## 1. システム構成図 (System Architecture)

バックエンドは Google Cloud Functions (Node.js) をベースとし、生成 AI (Gemini API) と NoSQL (MongoDB) を連携させたマイクロサービス構成です。

```mermaid
graph TD
    User((ユーザー))
    
    subgraph "Frontend (React + Vite)"
        UI[UI Components]
        LocalDB[(localStorage)]
    end
    
    subgraph "Backend (Google Cloud Functions)"
        OnboardingAgent[onboardingAgent]
        CheckIn[checkIn API]
        DataMgr[registerUser API]
        AIAnalyzer[aiAnalyzer - 定期解析]
        Delivery[deliveryEngine - 定期配信]
    end
    
    subgraph "External & Storage"
        Gemini[[Google Gemini API]]
        MongoDB[(MongoDB)]
    end

    User <-->|HTTP/JSON| UI
    UI <-->|API Calls| OnboardingAgent
    UI <-->|API Calls| CheckIn
    UI <-->|API Calls| DataMgr
    
    OnboardingAgent <-->|Context/Persona| Gemini
    OnboardingAgent <-->|Read/Write| MongoDB
    
    AIAnalyzer -->|Analyze| MongoDB
    AIAnalyzer <--> Gemini
    
    Delivery -->|Process| MongoDB
    
    UI --- LocalDB
```

### 主要技術スタック
- **Frontend**: React, Tailwind CSS, Lucide-React
- **Backend**: Node.js, Google Cloud Functions Framework
- **AI**: Google Gemini 2.5-flash (モデル可変)
- **Database**: MongoDB (Session & Persona Storage)
- **Environment**: Podman / Docker Compose (Local Dev)

---

## 2. 画面遷移・動線 (Screen Transition Flow)

ユーザーは「対話」を通じて自然に登録を終え、日々の「宝石（チェックイン）」を積み上げるロードマップへと誘導されます。

```mermaid
stateDiagram-v2
    [*] --> Entrance: サイト訪問
    
    state Entrance {
        [*] --> ChatOnboarding: チャット登録 (AI)
        [*] --> FormRegistration: 手動フォーム登録
    }
    
    ChatOnboarding --> PersonaExtraction: AIによるペルソナ抽出
    PersonaExtraction --> ChatOnboarding: 対話継続 (5ターン記憶)
    
    ChatOnboarding --> Dashboard: 登録完了 (is_complete: true)
    FormRegistration --> Dashboard: 登録完了
    
    state Dashboard {
        direction TB
        Roadmap: チェックインカレンダー (ロードマップ)
        Checklist: 残したいメッセージ (ToDo)
        LiveProof: 生きた証のステータス
    }
    
    Dashboard --> CheckInAction: チェックイン実行
    CheckInAction --> Dashboard: 継続ストリーク更新 (宝石の繋がり)
    
    Dashboard --> [*]: ページ終了 (localStorage保存)
    [*] --> Dashboard: 再訪 (userIdが存在する場合)
```

### ユーザー体験のポイント
1.  **温かいオンボーディング**: AIエージェントが「監視」ではなく「宝石を守る」というメタファーで対話し、性格や興味（ペルソナ）を理解。
2.  **PII-Free Context**: 会話履歴ではなく「ペルソナ要約」を保持することで、プライバシーを守りつつ親密な対話を実現。
3.  **視覚的な継続意欲**: チェックイン履歴が「道（パス）」のように繋がるカレンダーにより、日々の積み重ねを宝石として実感。
4.  **シームレスな再開**: `localStorage` を活用し、会話の途中からでも、ダッシュボードからでも、訪問時の「挨拶」が時間帯に合わせて変化。
