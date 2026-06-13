-- Indeed job source + user credentials for automated apply

INSERT INTO job_sources (name, slug, api_url, config, status) VALUES
  (
    'Indeed',
    'indeed',
    'https://www.indeed.com/jobs',
    '{"searchQuery":"remote software engineer","location":"remote","country":"us","maxPages":2,"fetchDescriptions":true}'::jsonb,
    'active'
  )
ON CONFLICT (slug) DO UPDATE SET
  api_url = EXCLUDED.api_url,
  config = EXCLUDED.config;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS indeed_email TEXT,
  ADD COLUMN IF NOT EXISTS indeed_password_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS indeed_auto_apply BOOLEAN NOT NULL DEFAULT false;
