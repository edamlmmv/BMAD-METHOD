---
title: "BMAD Workspace PRD"
description: Product requirements for a BMAD-centric portable workspace workspace
---

# BMAD Workspace PRD

## Overview

The BMAD Workspace is a portable, durable base that launches disposable
Mission Workspaces for bug fixes, feature work, research, and explicit base
self-improvement. BMAD owns the workflow truth: routing, artifacts, gates,
acceptance criteria, and review. Codex executes BMAD Mission Packets. OpenClaw,
Hermes, Graphify, Context7, Git, MCP, and GitHub provide adapter capabilities.

## Goals

- Let the user choose one or more repositories and start a clean Mission
  Workspace with the same BMAD-centered tool base every time.
- Run Repo Intake before executor prompts so BMAD Mission Packets are grounded in
  repo evidence.
- Keep BMAD Workspace state clean by default.
- Make all mission changes reviewable through Git worktrees and patches.
- Allow base self-improvement only through explicit grants, BMAD artifacts, and
  reviewable diffs.
- Minimize maintenance by composing existing tool surfaces instead of creating
  duplicate engines.

## Non-Goals

- No custom scheduler, planner, durable ledger, memory graph, freshness engine,
  review engine, grant engine, or self-improvement brain without upstream-gap
  proof.
- No daemon requirement for V1.
- No hidden cross-instance learning.
- No automatic Promotion into the BMAD Workspace.
- No secret storage in the BMAD Workspace or Mission Workspace artifacts.
- No custom review UI before Git worktrees and patches prove insufficient.

## User Jobs

| Job | Description | Success Signal |
| --- | --- | --- |
| Start clean work | Choose repos and launch a Mission Workspace quickly. | Mission has Repo Pack, grants, and empty runtime state. |
| Fix or build | Execute BMAD-guided work in selected target repos. | Worktree Review shows intended changes and tests. |
| Stay clean | Kill a Mission Workspace without polluting the base. | BMAD Workspace has no ungranted diff. |
| Inspect result | Review changed files in GitHub Desktop or equivalent. | Per-repo status and patch are available. |
| Improve base | Explicitly run a Base Improvement Mission. | Base changes have grant, BMAD artifact, tests, and Worktree Review. |

## Normal Mission Lifecycle

1. User chooses a Repo Pack and mission goal.
2. BMAD Workspace launches a disposable Mission Workspace.
3. Repo Intake scans selected repos and records provenance.
4. BMAD Router selects the smallest valid workflow.
5. BMAD creates a BMAD Mission Packet.
6. Rendered Prompt is derived from the BMAD Mission Packet.
7. Codex Executor operates inside grants and Capability Contract.
8. Git Adapter produces Worktree Review.
9. User promotes target repo changes or destroys the Mission Workspace.
10. BMAD Workspace remains unchanged unless a Base Mutation Grant exists.

## Base Improvement Lifecycle

1. User explicitly starts a Base Improvement Mission or grants a Base Mutation
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
| FR-001 | System shall treat BMAD artifacts as the source of truth for mission planning and execution. |
| FR-002 | System shall launch a Mission Workspace from a BMAD Workspace and one or more target repos. |
| FR-003 | System shall record launch inputs, grants, repo paths, branches, and base version. |
| FR-004 | System shall run Repo Intake before BMAD Mission Packet creation. |
| FR-005 | Repo Intake shall include repo identity, commit, scanned paths, scanner, timestamp, and summary evidence. |
| FR-006 | System shall block BMAD Mission Packet creation when Repo Intake is missing or stale versus target repo HEAD. |
| FR-007 | BMAD Mission Packet shall include goal, evidence, constraints, grants, acceptance criteria, and rendered executor prompt. |
| FR-008 | Rendered Prompt shall be derived from BMAD Mission Packet content. |
| FR-009 | Capability Contract shall expose adapters without requiring users to name provider internals in mission prompts. |
| FR-010 | Normal missions shall allow writes only inside Target Repos and mission runtime paths. |
| FR-011 | Base Improvement Missions shall require a Base Mutation Grant before any BMAD Workspace writes. |
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

- A normal mission can launch, intake, packet, run, review, and destroy with no
  BMAD Workspace diff.
- A stale Repo Intake prevents packet creation.
- A BMAD Mission Packet can recreate the rendered prompt and acceptance criteria.
- Worktree Review can be opened by GitHub Desktop or inspected with Git CLI.
- A Base Improvement Mission cannot write the base without a Base Mutation Grant.
- Destroy removes disposable state while preserving requested review evidence.

## Failure Modes

| Failure | Required Response |
| --- | --- |
| Repo Intake is stale | Block packet creation and request new intake. |
| Executor attempts base write without grant | Stop run and report Grant Guard violation. |
| Adapter capability is missing | Record explicit capability gap and route through BMAD. |
| Secret value appears in artifact | Block artifact persistence and redact. |
| Mission learns reusable improvement | Record optional note only; do not promote without explicit user action. |
| Custom engine is proposed | Require upstream-gap proof before design acceptance. |
