# Remote Job Auto Bidder

Production-ready platform for automating remote job applications with AI-powered cover letters, multi-profile management, subscription billing, and enterprise analytics.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes + Server Actions
- **Database:** PostgreSQL via Supabase with Row Level Security
- **Auth:** Supabase Auth (email/password + verification)
- **Payments:** Stripe + Crypto (NowPayments)
- **Queue:** BullMQ + Redis
- **AI:** LangChain + OpenAI (cover letter generation)
- **Email:** Resend

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Redis (for BullMQ job queue)
- Stripe account
- OpenAI API key

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Run the database migration in Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
```

4. Configure Supabase Auth:
   - Enable email/password provider
   - Set redirect URL to `http://localhost:3000/api/auth/callback`
   - Enable email confirmation

5. Create Stripe products/prices and update `plans.stripe_price_id` in the database.

6. Start the development server:

```bash
npm run dev
```

7. (Optional) Start the BullMQ worker:

```bash
npm run worker
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Sign in, sign up, verify
│   ├── dashboard/       # User dashboard pages
│   ├── admin/           # Admin dashboard pages
│   └── api/             # API routes
├── actions/             # Server Actions
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── analytics/       # Chart components
│   └── layout/          # Sidebar, headers
├── lib/
│   ├── supabase/        # Supabase clients
│   ├── ai/              # LangChain cover letter
│   ├── queue/           # BullMQ bid queue
│   ├── jobs/            # Job source fetchers
│   └── validations/     # Zod schemas
└── types/               # TypeScript types
```

## Features

- **Authentication** — Email/password signup with verification, password change, optional 2FA
- **Multi-Profile Management** — CRUD profiles with resume upload, skills, cover letter templates
- **Billing** — Stripe subscriptions + crypto payments (BTC/ETH/USDT)
- **Auto-Bidding** — Job filtering, AI matching, BullMQ queue processing
- **Analytics** — Success rate, daily volume, top companies, profile performance charts
- **Admin Dashboard** — User management, billing overview, job source monitoring, audit logs

## Cron Jobs

Set up scheduled tasks to call:

```bash
POST /api/cron  { "action": "sync-jobs" }
POST /api/cron  { "action": "process-auto-bids" }
```

Use Vercel Cron or an external scheduler with the service role key as Bearer token.

## License

Private — All rights reserved.
