---
title: "BMAD Workspace Runbook"
description: Manual evidence ledger template for Workspace Sessions
---

# BMAD Workspace Runbook

## Objective

- Goal file:
- Target repo:
- Runtime root:
- Session id:
- Operator:
- Active branch:

## Setup Gate

- Zoom-out ref:
- Ubiquitous language ref:
- Grill decisions ref:
- TDD plan ref:
- Skipped setup entries and reasons:

## Packet

- BMAD Work Packet:
- Rendered prompt:
- Manual Executor Contract:
- Routed workflow:
- Allowed write roots:

## Manual Execution

- Executor:
- Commands run manually:
- Result artifact refs:
- Failure details or retry notes:

## Review

- Worktree Review summary:
- Review Manifest:
- Changed files:
- Open findings:

## Closeout

- Closeout artifact:
- Outcome:
- Next manual action:
- Evidence refs:

## Capability Evidence Gate Closeout

Use this reviewer/operator closeout when the work claims capability awareness,
verifier behavior, advisory profile support, or push readiness. Workspace remains a ledger only; it records evidence and decisions but does not execute, authorize, or certify the work.

- Claimed capabilities:
- Commits reviewed:
- Touched files and file links:
- Verifier or advisory profile evidence refs:
- TDD red-green provenance:
- Targeted test commands and outcomes:
- Full quality command and outcome:
- warning/LOW disposition:
- dirty worktree impact:
- Residual risk:
- exact push/PR next step:

Remember: `npm ci && npm run quality` is a quality gate, not TDD provenance.
If warnings or LOW findings appear, mark each as `accepted`, `fixed`,
`deferred`, or `false-positive` with a reason. Name any modified or untracked
leftovers and state whether they are in scope before push.

## Archive

- Archive path:
- `manifest.json` SHA-256:
- `checksums.sha256` SHA-256:
- `verify-archive` outcome:
- Archive diff refs:

## Boundary Check

- No Workspace execution engine used.
- No scheduler, watcher, daemon, restore, replay, merge, promotion, or live
  adapter behavior used.
- All conclusions are backed by evidence refs above.
