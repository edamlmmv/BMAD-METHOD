---
title: "BMAD Workspace V10 Backlog"
description: TDD-first backlog for Manual Executor Contract
---

# BMAD Workspace V10 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E38 Executor Contract Schema | Define manual executor readiness artifact. | AT10-002, AT10-003, AT10-010 | Executor runtime | Hidden execution ambiguity |
| E39 Packet Bundle Contract | Publish contract with active packet bundle. | AT10-001, AT10-004 | Multi-packet history | Partial rebuild state |
| E40 Contract Surfaces | Report and archive contract state. | AT10-005 to AT10-009 | Restore/replay | Evidence mismatch |
| E41 Docs and Skill | Teach V10 boundaries. | AT10-011 | Runtime adapter docs | Scope creep |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S94 | V10 artifacts are traceable. | V10 traceability missing. | Add V10 PRD, backlog, acceptance, and traceability. | AT10-011 |
| S95 | Contract schema is deterministic. | Invalid contract passes. | Add `tools/workspace/executor-contract.js` validator. | AT10-002 |
| S96 | Allowed roots are grant-derived. | Relative or empty roots pass. | Derive canonical roots from grants and worktrees only. | AT10-003 |
| S97 | New packets publish contract. | Packet lacks `executorContractRef`. | Build executor contract during packet creation. | AT10-001 |
| S98 | Failed rebuild preserves active bundle. | Route failure mutates packet files. | Validate before publishing artifacts. | AT10-004 |
| S99 | Read-only surfaces report state. | Status and handoff omit contract state. | Add typed contract status. | AT10-005 to AT10-007 |
| S100 | Archives carry contract evidence. | Archive omits or verify ignores contract. | Copy and validate archived contract. | AT10-008, AT10-009 |
| S101 | Guardrails remain closed. | Help or code adds execution path. | Keep manual-only docs and no runtime command. | AT10-010 |
| S102 | Source skill teaches V10. | Skill omits Executor Contract. | Update `bmad-workspace` guidance. | AT10-011 |

## TDD Order

1. Add Executor Contract schema tests.
2. Add packet creation and rebuild-preservation tests.
3. Add legacy, missing, and invalid contract status tests.
4. Add handoff, archive, and verify-archive tests.
5. Add docs, source skill, and traceability checks.
