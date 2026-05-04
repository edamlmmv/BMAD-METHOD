---
title: "BMAD Workspace V10 Traceability"
description: Progress tracking for Manual Executor Contract
---

# BMAD Workspace V10 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S94 V10 artifacts are traceable | Done | `docs/workspace/v10-traceability.md` | Acceptance mapping exists. |
| S95 Contract schema is deterministic | Done | `tools/workspace/executor-contract.js` | Validator covers required fields and forbidden actions. |
| S96 Allowed roots are grant-derived | Done | `tools/workspace/executor-contract.js` | Roots derive from grants and worktrees only. |
| S97 New packets publish contract | Done | `tools/workspace/packet.js` | Packet writes `executorContractRef`. |
| S98 Failed rebuild preserves active bundle | Done | `test/test-workspace-cli.js` | Route failure fingerprint includes contract file. |
| S99 Read-only surfaces report state | Done | `tools/workspace/status.js` | Status and handoff include `EXECUTOR_CONTRACT_INVALID` state. |
| S100 Archives carry contract evidence | Done | `tools/workspace/archive.js` | Archive copies and verifies contract. |
| S101 Guardrails remain closed | Done | `test/test-workspace-cli.js` | Help omits `workspace run`; contract is manual-only. |
| S102 Source skill teaches V10 | Done | `src/core-skills/bmad-workspace/SKILL.md` | Skill documents Executor Contract. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT10-001 | E39 | S97 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT10-002 | E38 | S95 | `test/test-workspace-contracts.js` | `tools/workspace/executor-contract.js` |
| AT10-003 | E38 | S96 | `test/test-workspace-contracts.js` | `tools/workspace/executor-contract.js` |
| AT10-004 | E39 | S98 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT10-005 | E40 | S99 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT10-006 | E40 | S99 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT10-007 | E40 | S99 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT10-008 | E40 | S100 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT10-009 | E40 | S100 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT10-010 | E38 | S101 | `test/test-workspace-cli.js` | `tools/workspace/executor-contract.js` |
| AT10-011 | E41 | S94, S102 | `test/test-workspace-contracts.js` | `src/core-skills/bmad-workspace/SKILL.md` |
