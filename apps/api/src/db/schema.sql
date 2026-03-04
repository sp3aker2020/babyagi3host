-- BabyAgi3 Host Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  wallet_address VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tx_signature VARCHAR(128) UNIQUE NOT NULL,
  amount_lamports BIGINT NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  container_id VARCHAR(128),
  container_name VARCHAR(128) UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  -- status: pending | provisioning | running | stopped | error
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',
  expires_at TIMESTAMPTZ,
  -- BabyAGI 3 credentials (AES-256-GCM for API keys)
  owner_name TEXT,
  owner_email TEXT,
  anthropic_api_key_enc TEXT,
  openai_api_key_enc TEXT,
  agentmail_api_key_enc TEXT,
  sendblue_api_key_enc TEXT,
  sendblue_api_secret_enc TEXT,
  sendblue_phone TEXT,
  owner_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick user lookups
CREATE INDEX IF NOT EXISTS idx_instances_user_id ON instances(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
