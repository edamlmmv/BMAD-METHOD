---
title: "BMAD Workspace V16 Acceptance Tests"
description: Acceptance tests for Review Manifest and diff trust hardening
---

# BMAD Workspace V16 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT16-001 | Inspect V16 planning artifacts and index links. | PRD, backlog, acceptance tests, traceability, and release checklist exist and are linked. |
| AT16-002 | Run clean `workspace review`. | Command writes `summary.json` and valid `review-manifest.json`. |
| AT16-003 | Inspect Review Manifest. | Manifest records kind, schema version, source refs, forbidden actions, checks, findings, and decision state. |
| AT16-004 | Run status after review. | Status reports review present and Review Manifest valid. |
| AT16-005 | Run evidence after review. | Evidence Index includes Review Manifest with checksum and valid state. |
| AT16-006 | Record closeout after review. | Closeout references `review/review-manifest.json` when valid. |
| AT16-007 | Archive reviewed Session. | Archive copies Review Manifest and manifest records it as an artifact. |
| AT16-008 | Verify archive with malformed Review Manifest. | Command exits nonzero with `ARCHIVE_REVIEW_MANIFEST_INVALID`. |
| AT16-009 | Run diff with live Session or URL source. | Command exits nonzero with `DIFF_SOURCE_UNSUPPORTED`. |
| AT16-010 | Verify archive with duplicate manifest file paths. | Command exits nonzero with `ARCHIVE_MANIFEST_INVALID`. |
| AT16-011 | Inspect forbidden behavior language. | V16 keeps run, compare, restore/replay, merge/promotion, scheduler, watcher, daemon, live adapters, semantic scoring, and hidden execution out. |
| AT16-012 | Run push gate. | `npm ci && npm run quality` passes on the exact checkout before push. |
