BEGIN;

CREATE INDEX IF NOT EXISTS pack_draft_status_idx
ON capability_forge.pack_draft (status);

CREATE INDEX IF NOT EXISTS capability_draft_pack_status_idx
ON capability_forge.capability_draft (pack_draft_id, status);

CREATE INDEX IF NOT EXISTS artifact_draft_pack_status_idx
ON capability_forge.artifact_draft (pack_draft_id, status);

CREATE INDEX IF NOT EXISTS evidence_file_stale_seen_idx
ON capability_forge.evidence_file (stale, last_seen_at);

CREATE INDEX IF NOT EXISTS evidence_span_file_idx
ON capability_forge.evidence_span (evidence_file_id);

CREATE INDEX IF NOT EXISTS capability_evidence_ref_evidence_idx
ON capability_forge.capability_evidence_ref (evidence_span_id);

CREATE INDEX IF NOT EXISTS promotion_pack_status_idx
ON capability_forge.promotion (pack_draft_id, status);

CREATE INDEX IF NOT EXISTS review_event_pack_created_idx
ON capability_forge.review_event (pack_draft_id, created_at);

COMMIT;
