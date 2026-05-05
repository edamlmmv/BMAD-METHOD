---
title: "BMAD Workspace"
description: Current Workspace documentation map and historical delivery archive
---

# BMAD Workspace

BMAD Workspace is a manual, evidence-first CLI for launching disposable
Workspace Sessions against one or more repositories. BMAD artifacts remain the
source of truth. Codex or a human executes outside the Workspace CLI, then the
CLI records reviewable evidence.

## Current Docs

| Need | Read |
| --- | --- |
| Product scope and non-goals | [Product Requirements](./prd.md) |
| Current architecture and artifact model | [Architecture](./architecture.md) |
| Current command contract and output rules | [Command Contract](./command-contract.md) |
| First-hour operator path | [Operator Quickstart](./operator-quickstart.md) |
| Manual operator sequence | [Operator Guide](./operator-guide.md) |
| Current system summary | [Current State](./current-state.md) |
| Session lifecycle and artifacts | [Session Lifecycle](./session-lifecycle.md) |
| Capability and grant model | [Capability Contract](./capability-contract.md) |
| Explicit guardrails and unsupported behavior | [Guardrails](./guardrails.md) |
| Fresh-chat operator prompt and templates | [Workspace Templates](./templates/index.md) |
| Release validation checklist | [Release Checklist](./release-checklist.md) |
| Current release note | [Release Note 6.6.0](./release-note-6.6.0.md) |
| Deferred architecture decisions | [ADR Candidates](./adr-candidates.md) |

## Canonical Artifact Map

| Artifact | Canonical Doc |
| --- | --- |
| BMAD Work Packet | [Architecture](./architecture.md) |
| Manual Executor Contract | [Command Contract](./command-contract.md) |
| Result Ledger | [Command Contract](./command-contract.md) |
| Manual Closeout | [Command Contract](./command-contract.md) |
| Evidence Index | [Command Contract](./command-contract.md) |
| Archive and verify-archive | [Operator Guide](./operator-guide.md) |
| Archive Diff | [Command Contract](./command-contract.md) |
| Worktree Review | [Session Lifecycle](./session-lifecycle.md) |
| Review Manifest | [Command Contract](./command-contract.md) |

## Historical Delivery Records

Versioned PRDs, backlogs, acceptance tests, and traceability tables are retained
as historical evidence under [History](./history/index.md). Historical delivery
records are not current operator guidance.

## Templates

Use [Fresh-Chat Workspace Prompt](./templates/fresh-chat-prompt.md) to start a
new Codex chat with Workspace guardrails, BMAD skill routing, and evidence
expectations already stated.

Use [Workspace Runbook](./templates/workspace-runbook.md) to record manual
operator decisions, evidence refs, review manifest refs, closeout, and archive
verification for a real engagement.

## Doctrine

- BMAD is the kernel and truth source.
- Codex is the preferred executor.
- Review Manifest is typed review evidence, not approval or workflow authority.
- Evidence Index is inspection evidence, not authority.
- Workspace Diff compares archive evidence, not live sessions or worktrees.
- Normal Workspace Sessions do not mutate the BMAD Workspace.
- Base Improvement Sessions require explicit grants and Worktree Review.
