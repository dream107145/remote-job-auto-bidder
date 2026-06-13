export type UserRole = "user" | "admin";

export type BidStatus = "pending" | "submitted" | "interview" | "rejected" | "accepted";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete";

export type TransactionType =
  | "subscription"
  | "upgrade"
  | "downgrade"
  | "crypto"
  | "refund";

export type TransactionStatus = "pending" | "completed" | "failed" | "refunded";

export type PaymentMethod =
  | "stripe"
  | "crypto_btc"
  | "crypto_eth"
  | "crypto_usdt";

export type JobSourceStatus = "active" | "inactive" | "error";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_banned: boolean;
  two_factor_enabled: boolean;
  bids_used: number;
  profiles_used: number;
  indeed_email: string | null;
  indeed_auto_apply: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  bid_limit: number;
  profile_limit: number;
  features: string[];
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  plan?: Plan;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  resume_url: string | null;
  resume_filename: string | null;
  bio: string | null;
  skills: string[];
  github_url: string | null;
  linkedin_url: string | null;
  availability: string | null;
  salary_min: number | null;
  salary_max: number | null;
  cover_letter_template: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  user_id: string;
  profile_id: string;
  job_id: string | null;
  job_title: string;
  company: string;
  job_url: string | null;
  cover_letter: string | null;
  status: BidStatus;
  match_score: number | null;
  bid_cost_cents: number;
  application_data: Record<string, unknown>;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Transaction {
  id: string;
  user_id: string;
  subscription_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  payment_method: PaymentMethod;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  crypto_tx_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface JobSource {
  id: string;
  name: string;
  slug: string;
  api_url: string;
  status: JobSourceStatus;
  last_sync_at: string | null;
  last_error: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  source_id: string;
  external_id: string;
  title: string;
  company: string;
  description: string | null;
  url: string;
  salary_min: number | null;
  salary_max: number | null;
  job_type: string | null;
  skills: string[];
  location: string | null;
  posted_at: string | null;
  created_at: string;
}

export interface AutoBidSettings {
  id: string;
  user_id: string;
  profile_id: string | null;
  is_enabled: boolean;
  min_salary: number | null;
  max_salary: number | null;
  job_types: string[];
  required_skills: string[];
  excluded_companies: string[];
  daily_bid_limit: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AnalyticsData {
  successRate: { date: string; rate: number }[];
  dailyVolume: { date: string; count: number }[];
  topCompanies: { company: string; count: number }[];
  profilePerformance: { profile: string; submitted: number; interview: number; accepted: number }[];
}

export interface UsageStats {
  bidsUsed: number;
  bidsLimit: number;
  profilesUsed: number;
  profilesLimit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
