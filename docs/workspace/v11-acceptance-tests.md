---
title: "BMAD Workspace V11 Acceptance Tests"
description: Acceptance tests for Manual Closeout
---

# BMAD Workspace V11 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT11-001 | Inspect Workspace help. | Help lists `closeout`, `--input <path>`, and `--closeout-id <id>` while omitting `workspace run`. |
| AT11-002 | Record closeout for missing or invalid Session. | Command exits nonzero with stable session error and writes no artifact. |
| AT11-003 | Record closeout before BMAD Work Packet exists. | Command fails with `CLOSEOUT_PACKET_MISSING` and writes no artifact. |
| AT11-004 | Record completed closeout before Worktree Review exists. | Command fails with `CLOSEOUT_REVIEW_MISSING` and writes no artifact. |
| AT11-005 | Record closeout with unsafe or duplicate closeout id. | Command fails with `CLOSEOUT_ID_INVALID` or `CLOSEOUT_EXISTS` and writes no artifact. |
| AT11-006 | Record closeout with secret-positive input. | Command fails with `CLOSEOUT_SECRET_DETECTED` and writes no artifact. |
| AT11-007 | Record closeout with forbidden next-action wording. | Command fails with `CLOSEOUT_NEXT_ACTION_INVALID` and writes no artifact. |
| AT11-008 | Record valid closeout after packet and review. | Artifact is written under `closeout/<closeout-id>.json` with packet, route, executor, result, and review refs. |
| AT11-009 | Inspect status and list after closeout. | Both surfaces remain read-only and report closeout count plus latest outcome. |
| AT11-010 | Inspect invalid or secret-positive stored closeout. | Status reports closeout blocker with stable error code. |
| AT11-011 | Render handoff after closeout. | Handoff includes Closeout section and blocker-first next-route behavior remains. |
| AT11-012 | Archive reviewed Session with closeout. | Archive copies closeout artifacts and `closeout.md` mentions latest closeout outcome. |
| AT11-013 | Verify archive with invalid or tampered closeout. | Verification fails with stable closeout or checksum error. |
| AT11-014 | Validate docs and source skill. | V11 docs and `bmad-workspace` skill explain evidence-only manual closeout. |
| AT11-015 | Audit guardrails. | No run, command execution, scheduler, watcher, daemon, live adapter, restore, replay, merge, destroy, or promotion behavior is added. |
