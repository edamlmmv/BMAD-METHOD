---
title: "BMAD Workspace V12 Acceptance Tests"
description: Acceptance tests for lifecycle closure and contract hardening
---

# BMAD Workspace V12 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT12-001 | Inspect Workspace help. | Help lists `closeout`, `--input <path>`, and `--closeout-id <id>` while omitting `workspace run`. |
| AT12-002 | Record closeout for missing or invalid Session. | Command exits nonzero with a stable session error and writes no artifact. |
| AT12-003 | Record closeout before BMAD Work Packet exists. | Command fails with `CLOSEOUT_PACKET_MISSING` and writes no artifact. |
| AT12-004 | Record closeout with invalid declared Executor Contract. | Command fails with `EXECUTOR_CONTRACT_INVALID` and writes no artifact. |
| AT12-005 | Record completed closeout before Worktree Review exists. | Command fails with `CLOSEOUT_REVIEW_MISSING` and writes no artifact. |
| AT12-006 | Record closeout with unsafe or duplicate closeout id. | Command fails with `CLOSEOUT_ID_UNSAFE` or `CLOSEOUT_EXISTS` and writes no artifact. |
| AT12-007 | Record closeout with malformed or secret-positive input. | Command fails with a stable JSON or `CLOSEOUT_SECRET_DETECTED` error and writes no artifact. |
| AT12-008 | Record closeout with forbidden outcome or next-action value. | Command fails with a stable validation error and writes no artifact. |
| AT12-009 | Record valid closeout after packet and review. | Artifact is written under `closeout/<closeout-id>.json` with packet, routing, executor, result, and review refs. |
| AT12-010 | Record valid closeout without results. | Artifact is written with an empty `resultRefs` list; missing results remain warning-only. |
| AT12-011 | Inspect status and list after valid closeout. | Both surfaces remain read-only and report closeout count, latest outcome, latest ref, and derived lifecycle state. |
| AT12-012 | Inspect invalid or secret-positive stored closeout. | Status and list report closeout blockers with stable error codes. |
| AT12-013 | Render handoff after closeout. | Handoff includes a Closeout section and preserves blocker-first next-route behavior. |
| AT12-014 | Archive reviewed Session with closeout. | Archive copies closeout artifacts and `closeout.md` mentions latest closeout state. |
| AT12-015 | Verify archive with invalid or tampered closeout. | Verification fails with stable closeout or checksum error. |
| AT12-016 | Inspect lifecycle state with partial artifacts. | Status derives lifecycle from existing artifacts and does not invent missing state. |
| AT12-017 | Audit guardrails. | No run, command execution, scheduler, watcher, daemon, live adapter, restore, replay, merge, destroy, or promotion behavior is added. |
| AT12-018 | Validate docs and source skill. | V12 docs and `bmad-workspace` skill explain lifecycle closure, closeout evidence, and manual-only boundaries. |
