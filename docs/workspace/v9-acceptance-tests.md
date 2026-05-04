---
title: "BMAD Workspace V9 Acceptance Tests"
description: Acceptance tests for the manual Result Ledger
---

# BMAD Workspace V9 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT9-001 | Inspect help. | `result`, `--input`, and `--result-id` are listed; execution commands remain absent. |
| AT9-002 | Record result without session or packet. | Command fails with stable session or packet errors and writes no artifact. |
| AT9-003 | Record invalid result input. | Invalid JSON, invalid outcome, unsafe id, duplicate id, and secret-positive input fail without partial artifacts. |
| AT9-004 | Record valid result. | `results/<resultId>.json` is written, lifecycle includes `result`, and packet/routing refs are recorded. |
| AT9-005 | Include command text in result input. | Command text is stored as evidence and never executed. |
| AT9-006 | Inspect status and list after result. | Both surfaces remain read-only and report count plus latest outcome. |
| AT9-007 | Inspect invalid stored result. | Status reports `RESULT_INVALID` as a blocker. |
| AT9-008 | Inspect secret-positive stored result. | Status reports `RESULT_SECRET_DETECTED` without exposing the secret. |
| AT9-009 | Render handoff. | Handoff includes Result Ledger section with result id and outcome. |
| AT9-010 | Archive reviewed Session. | Archive copies valid result artifacts and status preserves result count. |
| AT9-011 | Verify archive with malformed result. | Command fails with `ARCHIVE_RESULT_INVALID`. |
| AT9-012 | Verify guardrails. | No run, daemon, scheduler, watcher, live adapter, restore, replay, merge, or auto-promotion behavior is added. |
