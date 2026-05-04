---
title: "BMAD Workspace V10 Acceptance Tests"
description: Acceptance tests for Manual Executor Contract
---

# BMAD Workspace V10 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT10-001 | Create new BMAD Work Packet. | Packet includes `executorContractRef`; `packets/executor-contract.json` exists. |
| AT10-002 | Validate minimal Executor Contract. | Required schema fields pass and invalid fields fail with stable errors. |
| AT10-003 | Derive allowed write roots. | Roots are non-empty, absolute, and sourced only from grants and worktrees. |
| AT10-004 | Rebuild packet with invalid routing or setup. | Prior active packet bundle and refs remain unchanged. |
| AT10-005 | Inspect legacy packet with no executor contract ref. | Status and handoff report warning-only `legacy-missing`. |
| AT10-006 | Inspect declared missing contract. | Status reports error and dependent surfaces fail safely. |
| AT10-007 | Inspect invalid declared contract. | Status reports `EXECUTOR_CONTRACT_INVALID`. |
| AT10-008 | Archive reviewed Session. | Archive copies Executor Contract and records it in manifest. |
| AT10-009 | Verify archive with tampered Executor Contract. | Verification fails with `ARCHIVE_EXECUTOR_CONTRACT_INVALID`. |
| AT10-010 | Audit guardrails. | No run, shell execution, scheduler, watcher, daemon, live adapter, restore, replay, merge, or promotion behavior is added. |
| AT10-011 | Validate docs and source skill. | V10 docs and `bmad-workspace` skill explain manual-only execution. |
