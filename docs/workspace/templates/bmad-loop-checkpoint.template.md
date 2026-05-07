---
title: "BMAD Loop Checkpoint Template"
description: Checkpoint template for generic BMAD loop runs
---

# BMAD Loop Checkpoint

Store completed run checkpoints under the resolved `workflow.checkpoint_subdir`.
Do not commit generated run checkpoints by default.

## Objective

-

## Workflow Bundle

- Bundle id:
- Purpose:
- Success criteria:
- Recommended BMAD route:

## Resolved Input

- Direct operator goal:
- `goal_ref`:
- `scope`:
- Input source:
- Input conflict recorded:

## Mode and Inputs

- Run mode:
- Mode:
- `repo_path`:
- `base_ref`:
- `stop_condition`:
- effective automation schedule/config consulted:
- explicit operator schedule/cap overrides:
- `max_iterations`:
- `daily_cap`:
- `max_fix_attempts`:
- `quality_command`:

## Baseline Evidence

- Base SHA:
- Original branch:
- Baseline policy hash:
- Baseline policy path:

## State Machine

- Input resolved:
- Lock acquired:
- Dirty preflight/scanned:
- Branch ready:
- Party Mode plan:
- Party Mode critique:
- TDD slices:
- Quality gate:
- Install/refresh evidence:
- Local commit:
- Checkpoint:
- Complete, blocked, or continuation-ready:
- Outcome:

## Lock Evidence

- Lock path:
- Lock acquired:
- Stale lock handling:
- Lock released:

## Branch Evidence

- Loop branch:
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

## Party Mode Critique

-

## Party Mode Gate Output

- participants:
- round_count:
- votes:
- decision: `accept | change | block`
- required_changes:
- deferred_decisions:
- blockers:
- operator_stop_go:
- next_action:
- evidence_refs:
- final_replacement_plan_ref:
- Goal:
- Success metric:
- Chosen run mode:
- Recommended BMAD route:
- Main risks:
- Required evidence:
- Open questions:
- Deferred questions:

## Shared BMAD Planning Capabilities

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

- `capability:zoom-out` reframing summary:
- `capability:tdd` failing-test-first evidence:
- `capability:ubiquitous-language` term changes:
- `capability:grill-me` challenge findings:
- Capability decisions changed or deferred:

## Tool-Leverage Decision Record

For tool-relevant goals only. Omit for non-tool-relevant goals.

Fields/order: `task`, `available_capabilities`, `candidate_tools`,
`selected_capability`, `chosen_tools`, `decision`, `rationale`, `why_enough`,
`underused_risk`, `overused_risk`, `blocked_tools`, `fallback`, `next_action`,
`evidence`. Decision: `enough | underused | overused | blocked`.

## Implementation Evidence

-

## Changed Files

-

## Tests Run

-

## Quality Gate Output

- Command:
- Result:

## compile/install Evidence

- Repo-local/test target:
- User target:
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

## Resume Contract

```yaml
resume_contract:
  continuation_allowed: true|false
  reason: string
  required_before_resume:
    - string
```

Continuation is allowed only when quality passes, repo-local install passes,
active user install is not failed or blocked, active skill hash matches
expected, and refresh state is known_good.

Template contract:

- `prompt_template`: operator prompt only
- `resume_prompt_template`: continuation prompt only
- `checkpoint_template`: checkpoint and evidence shape only

## Session Identity

```yaml
session_identity:
  codex_thread_id: string|null
  workspace_session_id: string|null
  classification: valid_workspace_session|codex_thread_only|session_not_found|unknown
```

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
