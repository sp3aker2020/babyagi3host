# BabyAgi3 Host

**Managed BabyAgi3 hosting, paid with SOL on Solana.**

Users pay with SOL → get a managed [BabyAGI 3](https://github.com/yoheinakajima/babyagi3) instance.

## Structure

```
babyagi3-host/
├── apps/
│   ├── web/          Next.js frontend (landing, checkout, dashboard)
│   └── api/          Node.js/Express backend (payment verification, Docker provisioner)
├── babyagi3-src/     BabyAGI 3 source (reference)
└── render.yaml       Render deployment config
```

## Quick Start

### Backend

```bash
cd apps/api
cp .env.example .env      # fill in your values
npm install
npm run dev               # starts on :4000
```

**Required env vars:**
| Var | Description |
|-----|-------------|
| `DATABASE_URL` | Postgres connection string |
| `ENCRYPTION_KEY` | 64 hex chars — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TREASURY_WALLET_ADDRESS` | Your Solana wallet that receives payments |
| `SOLANA_RPC_URL` | RPC endpoint (recommend [Helius](https://helius.dev) free tier) |
| `FRONTEND_URL` | Frontend origin for CORS |

### Frontend

```bash
cd apps/web
cp .env.example .env.local   # fill in your values
npm install
npm run dev                   # starts on :3000
```

**Required env vars:**
| Var | Description |
|-----|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_TREASURY_WALLET` | Same Solana wallet address as backend |

## Deploy to Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repo → Render reads `render.yaml`
4. Set the secret env vars in the Render dashboard

> **Docker note**: The API provisions BabyAGI 3 Docker containers.
> On Render, either use a privileged worker type or point `DOCKER_HOST` at a dedicated Hetzner/DigitalOcean VPS.

## How it works

1. User visits landing page → selects plan → connects Phantom/Solflare wallet
2. Pays SOL on-chain to treasury wallet
3. Backend verifies the transaction on Solana mainnet
4. Creates a pending instance in Postgres
5. User goes to dashboard → adds their OpenRouter key + Telegram/Discord tokens
6. Backend provisions a `babyagi3:latest` Docker container with those env vars
7. User's agent is live — they interface with it via email and SMS

## BabyAGI Config (per instance)

Each user's container gets these env vars:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `AGENTMAIL_API_KEY`
- `SENDBLUE_API_KEY`
- `SENDBLUE_API_SECRET`
- `SENDBLUE_PHONE_NUMBER`
- `OWNER_PHONE`
- `OWNER_EMAIL`
- `OWNER_NAME`

All credentials are stored AES-256-GCM encrypted in Postgres.

## License

MIT · Built on [BabyAGI 3](https://github.com/yoheinakajima/babyagi3) by yoheinakajima
