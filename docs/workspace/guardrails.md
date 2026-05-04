---
title: "BMAD Workspace Guardrails"
description: Explicit unsupported behavior for the current Workspace surface
---

# BMAD Workspace Guardrails

Workspace commands preserve manual control. They never infer approval or convert
stored evidence into action.

## Unsupported Runtime Behavior

The current Workspace surface does not provide:

- `workspace run`
- `workspace compare`
- live Workspace Session diff
- Git worktree diff through `workspace diff`
- URL or remote archive sources for `workspace diff`
- scheduler, watcher, daemon, queue, webhook, or background worker
- restore, replay, import, sync, or apply
- merge, promotion, or automatic target repo action
- live adapter activation
- remote fetch or pull
- semantic scoring or acceptance verdicts
- hidden execution or hidden subprocess orchestration
- slash-command or tool output treated as Workspace authority

## Evidence Boundaries

| Artifact | Boundary |
| --- | --- |
| BMAD Work Packet | Manual work input, not execution. |
| Executor Contract | Readiness declaration, not runtime permission. |
| Result Ledger | Manual evidence, not command replay input. |
| Review Manifest | Review evidence, not approval. |
| Closeout | Final decision evidence, not an action trigger. |
| Archive | Portable evidence bundle, not restore package. |
| Diff | Archive comparison evidence, not a patch or sync plan. |
| Codex slash command | Operator aid, not a Workspace command or hidden action. |
