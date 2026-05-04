---
title: "BMAD Workspace PRD"
description: Product requirements for a BMAD-centric portable workspace
---

# BMAD Workspace PRD

## Overview

The BMAD Workspace is a portable, durable base that launches disposable
Workspace Sessions for bug fixes, feature work, research, and explicit base
improvement. BMAD owns the workflow truth: routing, artifacts, gates,
acceptance criteria, and review. Codex executes BMAD Work Packets. OpenClaw,
Hermes, Graphify, Context7, Git, MCP, and GitHub provide adapter capabilities.

## Goals

- Let the user choose one or more repositories and start a clean Workspace
  Session with the same BMAD-centered tool base every time.
- Run Repo Intake before executor prompts so BMAD Work Packets are grounded in
  repo evidence.
- Keep BMAD Workspace state clean by default.
- Make all session changes reviewable through Git worktrees and patches.
- Allow base improvement only through explicit grants, BMAD artifacts, and
  reviewable diffs.
- Minimize maintenance by composing existing tool surfaces instead of creating
  duplicate engines.

## Non-Goals

- No custom scheduler, planner, durable ledger, memory graph, freshness engine,
  review engine, grant engine, or base improvement brain without upstream-gap
  proof.
- No daemon requirement for V1.
- No hidden cross-instance learning.
- No automatic Promotion into the BMAD Workspace.
- No secret storage in the BMAD Workspace or Workspace Session artifacts.
- No custom review UI before Git worktrees and patches prove insufficient.

## User Jobs

| Job | Description | Success Signal |
| --- | --- | --- |
| Start clean work | Choose repos and launch a Workspace Session quickly. | Session has Repo Pack, grants, and empty runtime state. |
| Fix or build | Execute BMAD-guided work in selected target repos. | Worktree Review shows intended changes and tests. |
| Stay clean | Kill a Workspace Session without polluting the base. | BMAD Workspace has no ungranted diff. |
| Inspect result | Review changed files in GitHub Desktop or equivalent. | Per-repo status and patch are available. |
| Improve base | Explicitly run a Base Improvement Session. | Base changes have grant, BMAD artifact, tests, and Worktree Review. |

## Normal Session Lifecycle

1. User chooses a Repo Pack and session goal.
2. BMAD Workspace launches a disposable Workspace Session.
3. Repo Intake scans selected repos and records provenance.
4. BMAD Router selects the smallest valid workflow.
5. BMAD creates a BMAD Work Packet.
6. Rendered Prompt is derived from the BMAD Work Packet.
7. Codex Executor operates inside grants and Capability Contract.
8. Git Adapter produces Worktree Review.
9. User promotes target repo changes or destroys the Workspace Session.
10. BMAD Workspace remains unchanged unless a Base Mutation Grant exists.

## Base Improvement Lifecycle

1. User explicitly starts a Base Improvement Session or grants a Base Mutation
   Grant.
2. BMAD Workspace is mounted as the target repo in a dedicated worktree.
3. BMAD selects the right artifact path, such as PRD, architecture, story,
   implementation, or review.
4. Codex Executor writes only granted base paths.
5. Quality checks and Worktree Review run before Promotion.
6. User explicitly promotes or discards the base change.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-001 | System shall treat BMAD artifacts as the source of truth for session planning and execution. |
| FR-002 | System shall launch a Workspace Session from a BMAD Workspace and one or more target repos. |
| FR-003 | System shall record launch inputs, grants, repo paths, branches, and base version. |
| FR-004 | System shall run Repo Intake before BMAD Work Packet creation. |
| FR-005 | Repo Intake shall include repo identity, commit, scanned paths, scanner, timestamp, and summary evidence. |
| FR-006 | System shall block BMAD Work Packet creation when Repo Intake is missing or stale versus target repo HEAD. |
| FR-007 | BMAD Work Packet shall include goal, evidence, constraints, grants, acceptance criteria, and rendered executor prompt. |
| FR-008 | Rendered Prompt shall be derived from BMAD Work Packet content. |
| FR-009 | Capability Contract shall expose adapters without requiring users to name provider internals in session prompts. |
| FR-010 | Normal sessions shall allow writes only inside Target Repos and session runtime paths. |
| FR-011 | Base Improvement Sessions shall require a Base Mutation Grant before any BMAD Workspace writes. |
| FR-012 | Worktree Review shall emit per-repo status, patch, changed files, and review notes. |
| FR-013 | Destroy shall remove disposable runtime state without deleting target repo commits or review artifacts retained by policy. |
| FR-014 | Promotion into the BMAD Workspace shall be explicit-only. |
| FR-015 | Adapter additions that duplicate existing engines shall require upstream-gap proof. |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | V1 shall use CLI, filesystem artifacts, and Git worktrees. |
| NFR-002 | V1 shall not require a daemon, Cron job, Heartbeat, queue, database, webhook, or background worker. |
| NFR-003 | Runtime artifacts shall be inspectable as plain files. |
| NFR-004 | Secrets shall be stored as references only. |
| NFR-005 | All durable changes shall be traceable to a BMAD Artifact, Grant, and Git diff. |
| NFR-006 | The system shall favor upstream adapters over custom mechanisms. |

## Success Criteria

- A normal session can launch, intake, packet, review, and destroy with no
  BMAD Workspace diff.
- A stale Repo Intake prevents packet creation.
- A BMAD Work Packet can recreate the rendered prompt and acceptance criteria.
- Worktree Review can be opened by GitHub Desktop or inspected with Git CLI.
- A Base Improvement Session cannot write the base without a Base Mutation Grant.
- Destroy removes disposable state while preserving requested review evidence.

## Failure Modes

| Failure | Required Response |
| --- | --- |
| Repo Intake is stale | Block packet creation and request new intake. |
| Executor attempts base write without grant | Stop run and report Grant Guard violation. |
| Adapter capability is missing | Record explicit capability gap and route through BMAD. |
| Secret value appears in artifact | Block artifact persistence and redact. |
| Session learns reusable improvement | Record optional note only; do not promote without explicit user action. |
| Custom engine is proposed | Require upstream-gap proof before design acceptance. |
