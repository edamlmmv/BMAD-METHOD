---
title: "Self-Improvement Checkpoint Example"
description: Valid blocked-resume checkpoint evidence example
---

# BMAD Self-Improvement Checkpoint Example

This example shows a blocked resume state. The repo quality gate passed, but
active user skill readiness is blocked because refresh evidence is not known
good yet.

## Why Blocked

- Active user install has not been confirmed.
- Active skill hash is still unknown.
- Refresh state is unknown, so continuation is not allowed.

## Operator Checks

- Re-run `npm ci && npm run quality` on `HEAD` of the exact checkout before
  any continuation claim.
- Re-run the repo-local/test install first.
- Record `/Users/edam/.agents` install evidence only after quality passes.
- Record source and installed SHA-256 hashes.
- Record Codex refresh evidence or a fallback refresh status.

## Verify Or Unblock

Run the existing installer update when policy gates allow active user install:

```text
node tools/installer/bmad-cli.js install --directory /Users/edam --modules bmm --tools codex --yes --action update
```

After refresh is verified, change `active_user_install` to `pass`,
`active_skill_hash` to `match`, `refresh_state` to `known_good`, set matching
`evidence_gates`, and set `resume_contract.continuation_allowed` to `true`
only if every gate passes.

```yaml self_improvement_checkpoint
activation_state:
  repo_quality: pass
  repo_local_install: pass
  active_user_install: blocked
  active_skill_hash: unknown
  refresh_state: unknown
resume_contract:
  continuation_allowed: false
  reason: "Active user install and refresh evidence are not ready."
  required_before_resume:
    - "Confirm /Users/edam/.agents install result."
    - "Record active skill hash match."
    - "Record refresh_state: known_good."
session_identity:
  codex_thread_id: "codex-thread-example"
  workspace_session_id: null
  classification: codex_thread_only
evidence_gates:
  quality_gate: pass
  repo_local_install_gate: pass
  active_user_install_gate: blocked
  hash_gate: unknown
  refresh_gate: unknown
```
