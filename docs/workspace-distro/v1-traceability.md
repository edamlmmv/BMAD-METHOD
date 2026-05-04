---
title: "Workspace Distro V1 Traceability"
description: Progress and completion tracking for the BMAD Workspace Distro V1 backlog
---

# Workspace Distro V1 Traceability

## Purpose

This artifact lets future implementation commits prove progress against the
Workspace Distro V1 backlog. Reference this document by commit id when checking
whether V1 is still aligned with BMAD source artifacts.

Source planning commit:
`b50f9fee8879a06c03a8b14a21635b0dc2a4be3e`.

## Progress States

| State | Meaning |
| --- | --- |
| Planned | Story has acceptance mapping but no implementation commit. |
| Red | Failing behavior test exists. |
| Green | Minimal implementation passes focused test. |
| Refactored | Green behavior preserved after cleanup. |
| Complete | Story passes focused tests and relevant quality checks. |
| Cut | Story removed from V1 with reason. |

## Story Ledger

| Story | Current State | Evidence Commit | Notes |
| --- | --- | --- | --- |
| S1 Contract validation | Planned | TBD | Start here. |
| S2 Workspace CLI help | Planned | TBD | Depends on S1. |
| S3 One-repo launch | Planned | TBD | First vertical mission proof. |
| S4 Multi-repo launch | Planned | TBD | After S3. |
| S5 Repo Intake | Planned | TBD | Requires launch artifacts. |
| S6 Packet freshness guard | Planned | TBD | Requires intake. |
| S7 BMAD Mission Packet builder | Planned | TBD | Requires S6. |
| S8 Worktree Review | Planned | TBD | Requires changed worktree fixture. |
| S9 Destroy safety | Planned | TBD | Requires mission runtime fixture. |
| S10 Grant Guard denial | Planned | TBD | Requires path boundary contract. |
| S11 Base Improvement grant | Planned | TBD | After S10. |

Update `Evidence Commit` with the commit that moves the story state. Each
implementation commit should name the story id in its commit body or PR notes.

## Acceptance Traceability

| Acceptance Test | Epic | Story | TDD Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT-001 | E2 | S3 | Launch one temp Git repo. | `tools/installer/commands/workspace.js` |
| AT-002 | E2 | S4 | Launch two temp Git repos. | Launch module |
| AT-003 | E2 | S3 | Assert Workspace Distro diff clean. | Launch module |
| AT-010 | E2 | S5 | Intake writes repo HEAD and provenance. | Intake module |
| AT-011 | E2 | S6 | Packet without intake exits nonzero. | Packet validator |
| AT-012 | E2 | S6 | Packet with stale intake exits nonzero. | Packet validator |
| AT-013 | E2 | S5 | Re-intake records new HEAD. | Intake module |
| AT-020 | E1, E2 | S1, S7 | Packet includes required fields. | Contract validator, packet builder |
| AT-021 | E2 | S7 | Rendered Prompt is derived artifact. | Packet builder |
| AT-022 | E1 | S1 | Packet without acceptance criteria fails. | Contract validator |
| AT-030 | E1, E5 | S1 | Capability resolves Graph Evidence Adapter. | Capability contract validator |
| AT-031 | E4 | S10 | Base write denied without grant. | Grant Guard |
| AT-032 | E1, E5 | S1 | Duplicate engine proposal requires proof. | Capability contract validator |
| AT-040 | E4 | S10 | Normal mission write boundary enforced. | Grant Guard |
| AT-041 | E4 | S10 | Base write violation is recorded. | Grant Guard |
| AT-042 | Later | Cut from first slice | Executor failure artifacts. | Deferred `workspace run` |
| AT-050 | E3 | S8 | Review emits status and patch. | Review module |
| AT-051 | E3 | S8 | Clean review emits no patch. | Review module |
| AT-052 | E3 | S8 | Git worktree state visible. | Review module |
| AT-060 | E4 | S10 | Base Improvement launch fails without grant. | Grant Guard |
| AT-061 | E4 | S11 | Base worktree branch with grant. | Base worktree module |
| AT-062 | E4 | S11 | Out-of-grant write blocked. | Grant Guard |
| AT-063 | E4 | S11 | Promotion requires explicit evidence. | Promotion guard |
| AT-070 | E3 | S9 | Destroy removes runtime only. | Destroy module |
| AT-071 | E3 | S9 | `--keep-review` retains artifacts. | Destroy module |
| AT-072 | E3 | S9 | Failed run review retention. | Destroy module |

## Completion Gate

V1 is complete when:

- all stories S1 to S11 are Complete or explicitly Cut
- every non-cut acceptance test has a passing focused test
- `workspace run` remains deferred or has a new approved backlog
- no live scheduler, daemon, hidden memory, or auto-promotion exists
- no base mutation path exists without Base Mutation Grant
- `npm run quality` passes before push
- `npm run validate:skills` passes if skill files change

## Later Slice Gate

Before adding `workspace run`, live adapters, or a new `bmad-workspace-distro`
skill, require:

- green lifecycle through `launch`, `intake`, `packet`, `review`, and `destroy`
- Grant Guard denial path proven
- Worktree Review proven with changed and clean repos
- explicit BMAD artifact updating the backlog
- upstream-gap proof for any new engine-like behavior

