ALTER TABLE workspaces
  ADD COLUMN website text NOT NULL DEFAULT '',
  ADD COLUMN industries_served text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN ideal_customer_profile text NOT NULL DEFAULT '',
  ADD COLUMN differentiators text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN onboarding_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN profile_version integer NOT NULL DEFAULT 0,
  ADD COLUMN profile_updated_at timestamptz;

ALTER TABLE workspaces
  ADD CONSTRAINT workspaces_onboarding_status_check
    CHECK (onboarding_status IN ('not_started', 'in_progress', 'complete')),
  ADD CONSTRAINT workspaces_profile_version_check
    CHECK (profile_version >= 0);
