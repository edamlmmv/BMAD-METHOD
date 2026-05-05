---
title: 'Self-Improvement Checkpoint Template'
description: Checkpoint template for BMAD self-improvement automation runs
---

# BMAD Self-Improvement Checkpoint

Store completed run checkpoints under `{output_folder}/self-improvement/`. Do not commit generated run checkpoints by default.

## Objective

-

## Question

-

## Mode and Inputs

- Mode:
- `repo_path`:
- `base_ref`:
- `scope`:
- `stop_condition`:
- effective automation schedule/config consulted:
- explicit operator schedule/cap overrides:
- `max_iterations`:
- `daily_cap`:
- `max_fix_attempts`:

## Baseline Evidence

- Base SHA:
- Original branch:
- Baseline policy hash:
- Baseline policy path:

## Lock Evidence

- Lock path: `{output_folder}/self-improvement/automation.lock`
- Lock acquired:
- Stale lock handling:
- Lock released:

## Branch Evidence

- Self-improve branch:
- Branch created from:
- Main guard result:
- Push guard result:

## Dirty Worktree Preservation

- Dirty files before loop:
- Preflight status command: `git status --porcelain --untracked-files=all`
- Preflight status output:
- Preflight scan result:
- Branch mutation blocked before scan pass:
- Secret/huge generated artifact scan:
- Preservation commit:

## Party Mode Decision

-

## Plan Status

-

## Party Mode Critique

-

## Shared BMAD Planning Capabilities

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

- `capability:zoom-out` reframing summary:
- `capability:tdd` failing-test-first evidence:
- `capability:ubiquitous-language` term changes:
- `capability:grill-me` challenge findings:
- Capability decisions changed or deferred:

## Policy Consensus Evidence

- Policy changed:
- Party Mode voices:
- Developer included:
- Architect included:
- Consensus summary:
- Invariant checker result:

## Implementation Evidence

-

## Changed Files

-

## Tests Run

-

## Pass/Fail Output

-

## Full Gate Output

- Command: `npm ci && npm run quality`
- Result:

## compile/install Evidence

- Repo-local/test target:
- `/Users/edam/.agents` target:
- Installer command:
- Result:

## Refresh Evidence

- installed `SKILL.md` path:
- manifest row:
- source SHA-256:
- installed SHA-256:
- refresh status:

## Activation State

```yaml
activation_state:
  repo_quality: pass|fail|unknown
  repo_local_install: pass|fail|unknown
  active_user_install: pass|fail|blocked|unknown
  active_skill_hash: match|mismatch|unknown
  refresh_state: known_good|failed|blocked|unknown
```

`refresh_state: unknown` never allows continuation. Repo readiness may pass while active user skill readiness remains blocked.

## Resume Contract

```yaml
resume_contract:
  continuation_allowed: true|false
  reason: string
  required_before_resume:
    - string
```

Continuation is allowed only when quality passes, repo-local install passes, active user install is not failed or blocked, active skill hash matches expected, and refresh state is known_good.

Before continuing from this checkpoint, validate resume readiness:

```text
node tools/validate-self-improve-invariants.js --checkpoint <checkpoint-path> --require-continuation-allowed
```

The default `npm run validate:self-improve-invariants` remains repo-contract-only. Resume-mode failures use `SI_CHECKPOINT_CONTINUATION_BLOCKED`, `SI_CHECKPOINT_HEAD_MISSING`, and `SI_CHECKPOINT_STALE_HEAD`.

## Session Identity

```yaml
session_identity:
  codex_thread_id: string|null
  workspace_session_id: string|null
  classification: valid_workspace_session|codex_thread_only|session_not_found|unknown
```

Codex thread ids are not BMAD Workspace Session ids. Treat `SESSION_NOT_FOUND` from a Codex thread id as classification evidence, not missing-run evidence.

## Local Commits

- Preservation commit:
- Code commit:
- Checkpoint commit:
- Final HEAD SHA:

## Continuation Decision

- Next loop allowed:
- Continuation blocked:
- Remaining `max_iterations`:
- Remaining `daily_cap`:
- Reason:

## Resume Command

```text
[command or prompt to resume from this checkpoint]
```

## Next Operator Decision

-

## Risks

-
