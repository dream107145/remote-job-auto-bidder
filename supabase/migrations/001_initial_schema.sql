-- Remote Job Auto Bidder - Initial Database Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE bid_status AS ENUM (
  'pending',
  'submitted',
  'interview',
  'rejected',
  'accepted'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'canceled',
  'past_due',
  'trialing',
  'incomplete'
);

CREATE TYPE transaction_type AS ENUM (
  'subscription',
  'upgrade',
  'downgrade',
  'crypto',
  'refund'
);

CREATE TYPE transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'stripe',
  'crypto_btc',
  'crypto_eth',
  'crypto_usdt'
);

CREATE TYPE user_role AS ENUM (
  'user',
  'admin'
);

CREATE TYPE job_source_status AS ENUM (
  'active',
  'inactive',
  'error'
);

-- Plans table
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL,
  bid_limit INTEGER NOT NULL,
  profile_limit INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users profile (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  is_banned BOOLEAN NOT NULL DEFAULT false,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  bids_used INTEGER NOT NULL DEFAULT 0,
  profiles_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status subscription_status NOT NULL DEFAULT 'trialing',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Developer profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  resume_url TEXT,
  resume_filename TEXT,
  bio TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  github_url TEXT,
  linkedin_url TEXT,
  availability TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  cover_letter_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job sources
CREATE TABLE job_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  api_url TEXT NOT NULL,
  api_key_encrypted TEXT,
  status job_source_status NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cached jobs from sources
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES job_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  job_type TEXT,
  skills TEXT[] DEFAULT '{}',
  location TEXT,
  posted_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, external_id)
);

-- Bids
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  job_url TEXT,
  cover_letter TEXT,
  status bid_status NOT NULL DEFAULT 'pending',
  match_score NUMERIC(5,2),
  bid_cost_cents INTEGER NOT NULL DEFAULT 0,
  application_data JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  crypto_tx_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-bid settings
CREATE TABLE auto_bid_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  min_salary INTEGER,
  max_salary INTEGER,
  job_types TEXT[] DEFAULT '{}',
  required_skills TEXT[] DEFAULT '{}',
  excluded_companies TEXT[] DEFAULT '{}',
  daily_bid_limit INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_bids_user_id ON bids(user_id);
CREATE INDEX idx_bids_profile_id ON bids(profile_id);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_created_at ON bids(created_at DESC);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_jobs_source_id ON jobs(source_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_bid_settings_updated_at BEFORE UPDATE ON auto_bid_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_sources_updated_at BEFORE UPDATE ON job_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed plans
INSERT INTO plans (name, slug, price_cents, bid_limit, profile_limit, features) VALUES
  ('Starter', 'starter', 1900, 50, 1, '["50 bids/month", "1 profile", "Basic analytics", "Email support"]'),
  ('Pro', 'pro', 4900, 200, 3, '["200 bids/month", "3 profiles", "Advanced analytics", "AI cover letters", "Priority support"]'),
  ('Enterprise', 'enterprise', 14900, 1000, 10, '["1000 bids/month", "10 profiles", "Full analytics", "Auto-bidding", "API access", "Dedicated support"]'),
  ('Unlimited', 'unlimited', 29900, -1, -1, '["Unlimited bids", "Unlimited profiles", "Full analytics", "Auto-bidding", "API access", "White-label", "24/7 support"]');

-- Seed job sources
INSERT INTO job_sources (name, slug, api_url, config) VALUES
  ('We Work Remotely', 'weworkremotely', 'https://weworkremotely.com/api/remote-jobs.json', '{}'),
  ('RemoteOK', 'remoteok', 'https://remoteok.com/api', '{}'),
  ('Upwork', 'upwork', 'https://www.upwork.com/api/graphql/v1', '{}');

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_bid_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (is_admin());

-- Profiles policies
CREATE POLICY "Users can view own profiles" ON profiles
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert own profiles" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profiles" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profiles" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Plans policies (public read)
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT USING (is_active = true OR is_admin());

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bids policies
CREATE POLICY "Users can view own bids" ON bids
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert own bids" ON bids
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bids" ON bids
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Auto-bid settings policies
CREATE POLICY "Users can manage own auto-bid settings" ON auto_bid_settings
  FOR ALL USING (auth.uid() = user_id);

-- Jobs policies (authenticated read)
CREATE POLICY "Authenticated users can view jobs" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Job sources (admin only write, authenticated read)
CREATE POLICY "Authenticated users can view job sources" ON job_sources
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage job sources" ON job_sources
  FOR ALL USING (is_admin());

-- Audit logs (admin only)
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_admin());
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own resumes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
