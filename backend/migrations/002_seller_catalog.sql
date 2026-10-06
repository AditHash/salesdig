CREATE TABLE seller_offerings (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  offering_type text NOT NULL CHECK (offering_type IN ('product', 'service', 'consulting', 'managed_service')),
  description text NOT NULL,
  capabilities text[] NOT NULL DEFAULT ARRAY[]::text[],
  business_outcomes text[] NOT NULL DEFAULT ARRAY[]::text[],
  relevant_industries text[] NOT NULL DEFAULT ARRAY[]::text[],
  ideal_customer_profile text NOT NULL DEFAULT '',
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'approved')),
  source_kind text NOT NULL DEFAULT 'seller_supplied' CHECK (source_kind IN ('seller_supplied', 'document_backed')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id)
);
CREATE INDEX seller_offerings_workspace_active_idx ON seller_offerings(workspace_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX seller_offerings_approved_idx ON seller_offerings(workspace_id, updated_at DESC) WHERE archived_at IS NULL AND review_status = 'approved';

CREATE TABLE seller_offering_versions (
  workspace_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  changed_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (offering_id, version),
  FOREIGN KEY (workspace_id, offering_id) REFERENCES seller_offerings(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE seller_partners (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  credentials text[] NOT NULL DEFAULT ARRAY[]::text[],
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'approved')),
  source_kind text NOT NULL DEFAULT 'seller_supplied' CHECK (source_kind IN ('seller_supplied', 'document_backed')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id)
);
CREATE INDEX seller_partners_workspace_active_idx ON seller_partners(workspace_id, created_at DESC) WHERE archived_at IS NULL;

CREATE TABLE seller_case_studies (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  summary text NOT NULL,
  outcomes text[] NOT NULL DEFAULT ARRAY[]::text[],
  offering_id uuid,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'approved')),
  source_kind text NOT NULL DEFAULT 'seller_supplied' CHECK (source_kind IN ('seller_supplied', 'document_backed')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, offering_id) REFERENCES seller_offerings(workspace_id, id)
);
CREATE INDEX seller_case_studies_workspace_active_idx ON seller_case_studies(workspace_id, created_at DESC) WHERE archived_at IS NULL;

CREATE TABLE seller_catalog_versions (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('partner', 'case_study')),
  item_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  changed_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, item_kind, item_id, version)
);
