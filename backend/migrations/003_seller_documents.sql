CREATE TABLE seller_documents (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('text/plain', 'text/markdown')),
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  processing_started_at timestamptz,
  error_message text,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id)
);
CREATE INDEX seller_documents_workspace_idx ON seller_documents(workspace_id, updated_at DESC);
CREATE INDEX seller_documents_queue_idx ON seller_documents(status, updated_at) WHERE status IN ('queued', 'processing');

CREATE TABLE seller_document_versions (
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  content text NOT NULL,
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, version),
  UNIQUE (workspace_id, document_id, version),
  FOREIGN KEY (workspace_id, document_id) REFERENCES seller_documents(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE seller_document_chunks (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  document_version integer NOT NULL,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, document_version, chunk_index),
  FOREIGN KEY (workspace_id, document_id, document_version)
    REFERENCES seller_document_versions(workspace_id, document_id, version) ON DELETE CASCADE
);
CREATE INDEX seller_document_chunks_scope_idx ON seller_document_chunks(workspace_id, document_id, document_version);
CREATE INDEX seller_document_chunks_vector_idx ON seller_document_chunks USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL;

CREATE TABLE seller_document_suggestions (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  document_id uuid NOT NULL,
  document_version integer NOT NULL,
  item_kind text NOT NULL CHECK (item_kind IN ('offering', 'partner', 'case_study')),
  payload jsonb NOT NULL,
  evidence_excerpt text NOT NULL,
  fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  accepted_item_id uuid,
  reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, document_version, fingerprint),
  FOREIGN KEY (workspace_id, document_id, document_version)
    REFERENCES seller_document_versions(workspace_id, document_id, version) ON DELETE CASCADE
);
CREATE INDEX seller_document_suggestions_scope_idx ON seller_document_suggestions(workspace_id, document_id, document_version, status);
