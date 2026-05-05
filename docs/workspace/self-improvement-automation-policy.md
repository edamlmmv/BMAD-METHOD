---
title: "Self-Improvement Automation Policy"
description: Non-negotiable contract for local Codex automation of BMAD self-improvement
---

# Self-Improvement Automation Policy

This policy is the source of truth for `bmad-self-improve` automation. It is editable, but each loop captures the baseline policy at start and validates any candidate policy against the baseline before install, refresh, or continuation.

The deterministic checker owns the non-negotiable invariants. Party Mode owns wording, target selection, and intent discussion inside those invariants. If the checker cannot classify a policy change, the loop fails closed for human review.

## Non-Negotiable Invariants

### SI-AUTO-001: Fresh Non-Main Branch

Every loop creates a fresh non-main branch from current `HEAD` unless an explicit `base_ref` is supplied. The branch name starts with `codex/self-improve-`.

### SI-AUTO-002: Main And Push Guard

Self-improvement implementation work never runs on `main`, and the loop never pushes to any remote.

### SI-AUTO-003: Local Conventional Commits

The loop may create local commits only. Every loop-created commit uses Conventional Commits.

### SI-AUTO-004: Dirty Worktree Preservation

If tracked, deleted, or untracked non-ignored files are dirty before improvement edits, the loop creates a separate preservation commit with message `chore: preserve pre-automation worktree state`. If the dirty set contains a high-confidence secret or huge generated artifact, the loop stops before preservation.

### SI-AUTO-005: Full Gates Each Loop

Every successful loop runs full gates before local code commit, install, refresh, or continuation. The full gate command is:

```bash
npm ci && npm run quality
```

### SI-AUTO-006: Fix Attempt Cap

The loop attempts fixes until tests and gates are green or `max_fix_attempts=5` is reached. After five failed fix attempts, the loop leaves the branch dirty for inspection, writes a checkpoint, and marks continuation blocked.

### SI-AUTO-007: Iteration Caps

`max_iterations=1` is the default for new automations. A starter automation may set `max_iterations=3` and `daily_cap=3`.

### SI-AUTO-008: Schedule-Aware Continuation Gate

At invocation start, the loop reads the effective automation schedule/config and any explicit operator parameters. It does not infer cadence from automation name, skill text, or prompt wording.

The loop also reads the latest checkpoint before branch creation. It allows continuation only after gates pass, a local code commit exists when code changed, install/refresh evidence is recorded, a checkpoint is written, the lock is releasable, and iteration caps allow continuation. If the checkpoint marks continuation blocked, later scheduled invocations stop early unless the operator explicitly clears or overrides the block.

### SI-AUTO-009: Install And Refresh Evidence

The loop installs repo-local or test targets first. When applicable and gates pass, it updates `/Users/edam/.agents` with the existing installer. It actively requests Codex skill reload when available. If reload is unavailable, it records installed path, manifest row, source and installed SHA-256 hashes, and refresh status.

### SI-AUTO-010: Self-Edit And Policy-Edit Baseline Gate

`bmad-self-improve` and this policy may be edited by automation. The current loop still runs from baseline rules captured at loop start. Candidate edits must pass the deterministic invariant checker against the baseline policy. Party Mode consensus for policy changes requires at least three BMAD voices, including Developer and Architect, and the checkpoint records that consensus.

### SI-AUTO-011: Party Mode Target Choice

Party Mode may choose any BMAD repo target. Destructive or broad edits are allowed only after the loop has created the fresh non-main branch.

### SI-AUTO-012: Loop Lock

Only one self-improvement loop may run per repo. The lock path is `{output_folder}/self-improvement/automation.lock`. A stale lock requires checkpointed failure evidence before a later loop continues.

### SI-AUTO-013: Future Hosted Adapter Boundary

Vercel Workflow WDK is a future optional hosted orchestrator adapter. It is not required for Phase 1 or Phase 2, and no Vercel runtime dependency is part of the starter local Codex automation. Any future adapter must wrap the same policy and invariant gates rather than replacing them.

## Failure Matrix

| Failure | Required result |
| --- | --- |
| Branch cannot be created | Stop, checkpoint, continuation blocked |
| Dirty state contains secret or huge generated artifact | Stop, checkpoint, continuation blocked |
| Tests still fail after `max_fix_attempts=5` | Leave branch dirty, checkpoint, continuation blocked |
| `npm ci && npm run quality` fails after fixes | Leave branch dirty, checkpoint, continuation blocked |
| Install fails after quality passes | Commit code and checkpoint, continuation blocked |
| Codex refresh cannot be verified | Commit code and checkpoint, record fallback refresh status, continuation blocked |
| Policy change weakens invariant | Stop, checkpoint, no install, no refresh, continuation blocked |
| Checker cannot classify policy change | Fail closed for human review |
| Lock is stale without evidence | Stop until checkpointed failure evidence exists |

## Checkpoint Requirements

Each checkpoint records:

- base SHA and baseline policy hash
- original branch and self-improve branch
- dirty state and preservation commit
- target chosen by Party Mode
- Party Mode critique and policy consensus evidence
- changed files
- targeted test output and full gate output
- install target and evidence
- Codex refresh attempt and result
- local commit SHAs
- effective automation schedule/config consulted
- continuation decision and remaining cap values
- lock acquisition and release result
- resume command for human inspection

## Future Hosted Adapter

A hosted adapter may later expose operations such as `startLoop`, `resumeLoop`, `recordCheckpoint`, and `scheduleNext`. Vercel Workflow WDK is suitable for that future if BMAD needs hosted queues, persistence, crash-safe replay, and observability. The local Codex automation contract remains authoritative.
