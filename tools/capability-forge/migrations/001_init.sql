BEGIN;

CREATE SCHEMA IF NOT EXISTS capability_forge;

CREATE TABLE IF NOT EXISTS capability_forge.schema_migration (
  version TEXT PRIMARY KEY,
  checksum CHAR(64) NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capability_forge.forge_run (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  command TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  git_commit TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS capability_forge.evidence_file (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uri TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  media_type TEXT NOT NULL DEFAULT 'text/plain',
  bytes BIGINT NOT NULL CHECK (bytes >= 0),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stale BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (uri, sha256),
  UNIQUE (sha256)
);

CREATE TABLE IF NOT EXISTS capability_forge.evidence_span (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_file_id BIGINT NOT NULL REFERENCES capability_forge.evidence_file(id) ON DELETE CASCADE,
  heading TEXT,
  line_start INTEGER NOT NULL CHECK (line_start > 0),
  line_end INTEGER NOT NULL CHECK (line_end >= line_start),
  content_text TEXT NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(heading, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
  ) STORED,
  UNIQUE (evidence_file_id, line_start, line_end)
);

CREATE INDEX IF NOT EXISTS evidence_span_search_vector_idx
ON capability_forge.evidence_span
USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS capability_forge.pack_draft (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  pack_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'review_pending' CHECK (
    status IN ('ingested', 'drafted', 'review_pending', 'approved', 'rejected', 'promoted', 'superseded')
  ),
  bmad_module_code TEXT NOT NULL CHECK (bmad_module_code ~ '^[A-Z][A-Z0-9]{1,12}$'),
  bmad_parent_module TEXT NOT NULL DEFAULT 'bmm',
  workspace_runtime_change BOOLEAN NOT NULL DEFAULT false CHECK (workspace_runtime_change = false),
  created_by_run_id BIGINT REFERENCES capability_forge.forge_run(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capability_forge.capability_draft (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pack_draft_id BIGINT NOT NULL REFERENCES capability_forge.pack_draft(id) ON DELETE CASCADE,
  capability_id TEXT NOT NULL,
  menu_code TEXT NOT NULL CHECK (menu_code ~ '^[A-Z][A-Z0-9]{1,6}$'),
  title TEXT NOT NULL,
  intent TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (
    status IN ('proposed', 'needs_evidence', 'needs_review', 'approved', 'rejected')
  ),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_draft_id, capability_id),
  UNIQUE (pack_draft_id, menu_code)
);

CREATE TABLE IF NOT EXISTS capability_forge.capability_evidence_ref (
  capability_draft_id BIGINT NOT NULL REFERENCES capability_forge.capability_draft(id) ON DELETE CASCADE,
  evidence_span_id BIGINT NOT NULL REFERENCES capability_forge.evidence_span(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL DEFAULT 'source' CHECK (
    purpose IN ('source', 'supports', 'constraint', 'counterexample', 'example')
  ),
  operator_note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (capability_draft_id, evidence_span_id, purpose)
);

CREATE TABLE IF NOT EXISTS capability_forge.artifact_draft (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pack_draft_id BIGINT NOT NULL REFERENCES capability_forge.pack_draft(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'pack_toml',
      'skill_md',
      'module_yaml',
      'module_help_csv',
      'review_md',
      'validation_report',
      'tool_leverage_packet',
      'official_mcp_packet',
      'capability_refactor_packet',
      'implementation_readiness_packet',
      'workspace_handoff_packet',
      'customize_handoff_packet'
    )
  ),
  relative_path TEXT NOT NULL CHECK (
    relative_path !~ '(^/|(^|/)\.\.(/|$))'
  ),
  sha256 CHAR(64) CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'reviewed', 'approved', 'exported', 'promoted')
  ),
  generated_by_run_id BIGINT REFERENCES capability_forge.forge_run(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_draft_id, kind, relative_path)
);

-- Append-only by application contract. Forge code inserts review events and
-- never updates or deletes them; current status is updated transactionally on
-- pack_draft.
CREATE TABLE IF NOT EXISTS capability_forge.review_event (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pack_draft_id BIGINT NOT NULL REFERENCES capability_forge.pack_draft(id) ON DELETE CASCADE,
  capability_draft_id BIGINT REFERENCES capability_forge.capability_draft(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('created', 'commented', 'requested_changes', 'approved', 'rejected', 'exported', 'promoted')
  ),
  comment_md TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capability_forge.promotion (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pack_draft_id BIGINT NOT NULL REFERENCES capability_forge.pack_draft(id) ON DELETE RESTRICT,
  target_path TEXT NOT NULL CHECK (
    target_path !~ '(^/|(^|/)\.\.(/|$))'
  ),
  approved_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('prepared', 'promoted', 'failed')),
  artifact_snapshot_sha256 CHAR(64) NOT NULL CHECK (artifact_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_draft_id, target_path)
);

CREATE OR REPLACE VIEW capability_forge.evidence_ref AS
SELECT
  evidence_span.id AS evidence_span_id,
  evidence_file.id AS evidence_file_id,
  evidence_file.uri,
  evidence_file.sha256,
  evidence_span.heading,
  evidence_span.line_start,
  evidence_span.line_end,
  evidence_span.content_text,
  evidence_file.stale,
  'ev:' ||
    evidence_file.sha256 ||
    '#L' ||
    evidence_span.line_start::TEXT ||
    '-L' ||
    evidence_span.line_end::TEXT AS ref
FROM capability_forge.evidence_span
JOIN capability_forge.evidence_file
  ON evidence_file.id = evidence_span.evidence_file_id;

COMMIT;
