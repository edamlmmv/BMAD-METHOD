---
title: "BMAD Loop Automation Policy"
description: Generic non-negotiable contract for local BMAD automation loops
---

# BMAD Loop Automation Policy

This policy is the source of truth for `bmad-loop`. It is generic and has no
built-in goal. Each loop captures the baseline policy at start and validates any
candidate policy edit against that baseline before install, refresh, or
continuation.

## Non-Negotiable Invariants

### LOOP-AUTO-001: Fresh Non-Main Branch

Every loop creates a fresh non-main branch from current `HEAD` unless an
explicit `base_ref` is supplied. The branch name starts with the resolved
`workflow.branch_prefix`, must not be `main` or `master`, and must be created for
the current run before improvement edits. Compatibility phrase: created for the current run before improvement edits.

### LOOP-AUTO-002: Main And Push Guard

Implementation work never runs on `main`, and the loop never pushes to any
remote.

### LOOP-AUTO-003: Local Conventional Commits

The loop may create local commits only. Every loop-created commit uses
Conventional Commits.

### LOOP-AUTO-004: Dirty Worktree Preservation

Dirty state is defined by `git status --porcelain --untracked-files=all`
reporting tracked, deleted, or untracked non-ignored files. Before any
automation mutation, the loop proves the non-ignored worktree is clean or scans
pending files for high-confidence secrets and huge generated artifacts. If the
scan fails, the loop aborts before preservation, branch creation, branch switch,
install, refresh, generation, or file edits. Compatibility phrase: abort before preservation, branch creation, branch switch, install, refresh, generation, or file edits.

### LOOP-AUTO-005: Full Gates Each Loop

Every successful loop runs the configured quality command on `HEAD` of the exact
checkout before local code commit, install, refresh, or continuation. The
quality command runs on `HEAD` of the exact checkout. The
default command is:

```bash
npm ci && npm run quality
```

### LOOP-AUTO-006: Fix Attempt Cap

The loop attempts fixes until tests and gates are green or `max_fix_attempts=5`
is reached. After five failed fix attempts, the loop leaves the branch dirty for
inspection, writes a checkpoint, and marks continuation blocked.

### LOOP-AUTO-007: Iteration Caps

`max_iterations=1` is the default for new loop instances. A starter automation
may set `max_iterations=3` and `daily_cap=3`.

### LOOP-AUTO-008: Schedule-Aware Continuation Gate

At invocation start, the loop reads the effective automation schedule/config and
explicit operator parameters. It does not infer cadence from automation name,
skill text, or prompt wording. Continuation is allowed only after gates pass, a
local code commit exists when code changed, install/refresh evidence is recorded
when relevant, a checkpoint is written, the lock is releasable, and caps allow
continuation.

### LOOP-AUTO-009: Install And Refresh Evidence

The loop installs repo-local or test targets first. When policy allows user
install, it records install target, manifest row, source and installed SHA-256
hashes, and refresh status. It records source and installed SHA-256 hashes.
Codex App Server facts such as `skills/list` with
`forceReload: true`, `skills/changed`, and thread start/resume are optional
launcher evidence only, never BMAD authority.

### LOOP-AUTO-010: Loop-Edit Baseline Gate

`bmad-loop`, loop policy, and loop instance skills may be edited by automation.
The current loop still runs from baseline rules captured at loop start.
Candidate edits must pass deterministic invariant validation against the
baseline policy.

### LOOP-AUTO-011: Party Mode Goal Boundary

Party Mode may critique a plan and refine an instantiated goal. It must not
silently create a goal when direct operator goal, `workflow.goal_ref`, and
`workflow.scope` are all absent. Compatibility phrase: must not silently create a goal.

### LOOP-AUTO-012: Loop Lock

Only one loop may run per repo and loop slug. The lock path is
`{checkpoint_subdir}/automation.lock`. A stale lock requires checkpointed
failure evidence before a later loop continues. Compatibility phrase: checkpointed failure evidence.

### LOOP-AUTO-013: Future Hosted Adapter Boundary

Hosted orchestrators such as Vercel Workflow WDK are future optional adapters.
They must wrap this local policy and invariant gate instead of replacing it.

## Failure Matrix

| Failure | Required result |
| --- | --- |
| Missing direct goal, `goal_ref`, and `scope` | Stop before mutation |
| Branch cannot be created | Stop, checkpoint, continuation blocked |
| Dirty state contains secret or huge generated artifact | Stop, checkpoint, continuation blocked |
| Tests still fail after `max_fix_attempts=5` | Leave branch dirty, checkpoint, continuation blocked |
| Quality command fails after fixes | Leave branch dirty, checkpoint, continuation blocked |
| Install or refresh fails after quality passes | Commit code when safe, checkpoint, continuation blocked |
| Policy change weakens invariant | Stop, checkpoint, no install, no refresh, continuation blocked |
| Checker cannot classify policy change | Fail closed for human review |

## Checkpoint Requirements

Each checkpoint records objective, resolved input source, base SHA, baseline
policy hash, branch, lock, dirty preflight, Party Mode decision and critique,
TDD evidence, changed files, targeted tests, quality gate, install/refresh
evidence, Activation State, Resume Contract, Session Identity, local commits,
effective schedule/config, cap values, lock release, and next operator decision.
