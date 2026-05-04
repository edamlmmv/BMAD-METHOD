---
title: "BMAD Workspace Session Lifecycle"
description: Manual Workspace Session sequence and artifact ownership
---

# BMAD Workspace Session Lifecycle

Workspace lifecycle state is derived from stored artifacts. No durable state
machine authorizes work or advances the session automatically.

## Manual Sequence

| Step | Command | Evidence |
| --- | --- | --- |
| Launch | `bmad workspace launch` | `instance.json`, grants, repo pack, worktrees |
| Intake | `bmad workspace intake` | `intake/repo-intake.json`, provenance |
| Packet | `bmad workspace packet` | BMAD Work Packet, rendered prompt, Executor Contract |
| Inspect | `bmad workspace status`, `list`, `handoff`, `evidence` | Read-only state, blockers, checksums, next manual actions |
| Execute manually | Outside Workspace CLI | Source changes and external command output |
| Record result | `bmad workspace result` | Inert result JSON |
| Review | `bmad workspace review` | Worktree status, patches, Review Manifest |
| Close out | `bmad workspace closeout` | Manual decision and next action |
| Preserve | `bmad workspace archive`, `verify-archive`, `diff` | Portable evidence bundles and archive-only deltas |
| Destroy | `bmad workspace destroy` | Runtime cleanup with target repo preservation |

## Derived States

| State | Evidence |
| --- | --- |
| `launched` | Valid `instance.json`. |
| `intake-recorded` | Fresh Repo Intake exists. |
| `packet-ready` | BMAD Work Packet and rendered prompt validate. |
| `executor-ready` | Executor Contract validates or legacy warning exists. |
| `result-recorded` | One or more valid Result Ledger artifacts exist. |
| `review-recorded` | Worktree Review and Review Manifest exist. |
| `closeout-recorded` | One or more valid closeout artifacts exist. |
| `blocked` | High-severity check or invalid artifact exists. |

## Ownership Rules

- Session runtime artifacts are disposable unless archived or retained for review.
- Target repo worktrees hold source changes; Workspace archives do not copy them.
- Setup evidence files stay outside archives; packets retain refs and checksums.
- Base writes require explicit Base Mutation Grant and Worktree Review.
