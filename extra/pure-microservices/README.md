# Pure Microservices Architecture (Pure Microservices)

This directory contains the configuration for running Amber Ink in a distributed microservices pattern. Each function runs in its own isolated container.

## 🌟 Why choose this?
- **Isolation**: Each function has its own resource limits and dependencies.
- **Independent Scaling**: Scale only the `checkIn` service if you have high traffic.
- **Granular Security**: Assign different IAM roles to different functions in production.

## 🚀 How to Run (Zero-Overwrite Method)

You can run this architecture **without** overwriting your current `.env` files by using specific parameters.

### 1. Backend (Podman/Docker Compose)
Backend functions use the **project root's `.env` file**. To ensure variables are correctly mapped, run the following command from the **Project Root Directory**:

```bash
# --env-file .env を指定することで、YAML内の変数（GEMINI_API_KEY等）が正しく置換されます
podman compose -f extra/pure-microservices/docker-compose.yml --env-file .env up --build
```

### 2. Frontend (Vite)
Vite requires different port settings for microservices. 
1. **プロジェクトルート** の `frontend/` ディレクトリへ移動します。
2. 同ディレクトリ内の **`extra/pure-microservices/.env.frontend.example`** を `frontend/.env.pure` としてコピーしてください。
3. 以下のコマンドを実行します：

```bash
# frontend/ ディレクトリで実行
npm run dev -- --mode pure
```

## ⚙️ Port Mapping
- `8081`: onboarding-agent
- `8082`: register-user
- `8083`: check-in
- `8085`: get-user-data
- `8086`: ai-analyzer
- `8087`: delivery-engine
- `8088`: companion-agent
- `8089`: download-memorial
- `8090`: run-emergency-monitor
