---
title: "BMAD Loop Checkpoint Example"
description: Example checkpoint evidence for generic BMAD loop validation
---

# BMAD Loop Checkpoint Example

## Objective

- Example loop checkpoint.

## Resolved Input

- Direct operator goal: "Improve one documented BMAD loop behavior."
- `goal_ref`: null
- `scope`: null
- Input source: direct_operator_goal
- Input conflict recorded: false

```yaml bmad_loop_checkpoint
activation_state:
  repo_quality: pass
  repo_local_install: pass
  active_user_install: pass
  active_skill_hash: match
  refresh_state: known_good
resume_contract:
  continuation_allowed: true
  reason: "All loop activation gates passed."
  required_before_resume: []
session_identity:
  codex_thread_id: "codex-thread-example"
  workspace_session_id: null
  classification: codex_thread_only
evidence_gates:
  quality_gate: pass
  repo_local_install_gate: pass
  active_user_install_gate: pass
  hash_gate: match
  refresh_gate: known_good
```

## Local Commits

- Final HEAD SHA: 0000000000000000000000000000000000000000
