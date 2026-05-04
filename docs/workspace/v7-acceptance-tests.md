---
title: "BMAD Workspace V7 Acceptance Tests"
description: Acceptance tests for portable Session archive and verification
---

# BMAD Workspace V7 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT7-001 | Inspect V7 traceability. | V7 acceptance IDs map to stories, tests, and first code surfaces. |
| AT7-002 | Inspect `bmad workspace --help`. | Help lists `archive`, `verify-archive`, and `--output`. |
| AT7-003 | Archive missing Session. | Command exits nonzero with `SESSION_NOT_FOUND` and writes no output. |
| AT7-004 | Archive invalid Session. | Command exits nonzero with `SESSION_INVALID` and writes no output. |
| AT7-005 | Archive valid reviewed Session. | Archive contains manifest, checksums, status, handoff, closeout, packet, and review artifacts. |
| AT7-006 | Archive output already exists. | Command exits nonzero with `ARCHIVE_OUTPUT_EXISTS`. |
| AT7-007 | Check archive mutation boundary. | Runtime root and target repo fingerprints stay unchanged. |
| AT7-008 | Check setup evidence policy. | Setup refs/checksums remain in packet metadata; setup evidence files are not copied. |
| AT7-009 | Verify missing or malformed archive. | Command exits nonzero with stable archive error code. |
| AT7-010 | Verify clean archive. | Command exits zero and reports `ok: true`. |
| AT7-011 | Verify tampered archive. | Command exits nonzero with `ARCHIVE_CHECKSUM_MISMATCH`. |
| AT7-012 | Verify unsafe manifest path. | Command exits nonzero with `ARCHIVE_UNSAFE_PATH`. |
| AT7-013 | Check verify read-only behavior. | Archive fingerprint stays unchanged. |
| AT7-014 | Archive Base Improvement Session. | Closeout remains diagnostic and avoids durable action wording. |
| AT7-015 | Inspect V7 docs and skill. | Source skill and docs describe archive boundaries. |
