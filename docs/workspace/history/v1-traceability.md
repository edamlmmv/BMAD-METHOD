---
title: "BMAD Workspace V1 Traceability"
description: Progress and completion tracking for the BMAD Workspace V1 backlog
---

# BMAD Workspace V1 Traceability

## Purpose

This artifact lets future implementation commits prove progress against the
BMAD Workspace V1 backlog. Reference this document by commit id when checking
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
| S1 Contract validation | Complete | `6ad93e44a29b2c765d1677c9d8b92034624a58c7` | Contract validator and focused test added. |
| S2 Workspace CLI help | Complete | `1547789032d4dba76bb98f569e9866a4e31462e8` | CLI help lists V1 workspace subcommands; launch behavior remains S3. |
| S3 One-repo launch | Complete | `ada39dd0daa8b0dc2e5abb03cae317d41ff13c56` | Launch writes mission artifacts, creates Git worktree, and keeps base repo clean. |
| S4 Multi-repo launch | Complete | `ff91dfed44564ec035ae3c841cb54fbc020ed015` | Multi-repo launch records both target repos, HEADs, and worktrees. |
| S5 Repo Intake | Complete | `0456fc556cd3a5f42b2e925c40c5aa260c38f3ee` | Intake writes repo evidence and provenance; re-intake records new target HEAD. |
| S6 Packet freshness guard | Complete | `a11c93a2b349538715b7e3b1be23b075937ea123` | Packet command fails with explicit missing-intake and stale-intake errors. |
| S7 BMAD Mission Packet builder | Complete | `20bc4d1888857f4ec9110175be4c2310ee59f88b` | Fresh packet writes BMAD Mission Packet, Capability Contract, and derived rendered prompt. |
| S8 Worktree Review | Complete | `5301a6a59ec892c533fcf3cbb162c73b4a7e7332` | Review writes clean summaries and dirty per-repo status plus patch artifacts. |
| S9 Destroy safety | Complete | `d66731944a36c580b5af0ada9254056c8fd40cd4` | Destroy removes mission runtime and worktrees, preserves source repo HEAD, and retains review artifacts with `--keep-review`. |
| S10 Grant Guard denial | Complete | `58a900bffc36f634f7ba352bec7e7c7affdc7270` | Grant Guard authorizes target worktree writes, denies ungranted base writes with violation artifacts, and blocks Base Improvement launch without grant. |
| S11 Base Improvement grant | Complete | `b042d39e96ff8d63e2b40f52f95e8f5a4a8c86fe` | Base Improvement launch accepts explicit grant, creates a dedicated `codex/workspace/*` worktree branch, enforces granted base paths, and writes explicit-only Promotion policy. |

Update `Evidence Commit` with the commit that moves the story state. Each
implementation commit should name the story id in its commit body or PR notes.

## Acceptance Traceability

| Acceptance Test | Epic | Story | TDD Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT-001 | E2 | S2, S3 | Workspace help lists V1 commands; launch one temp Git repo. | `tools/installer/commands/workspace.js` |
| AT-002 | E2 | S4 | Launch two temp Git repos. | Launch module |
| AT-003 | E2 | S3 | Assert BMAD Workspace diff clean. | Launch module |
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

Before adding `workspace run`, live adapters, or a new `bmad-workspace`
skill, require:

- green lifecycle through `launch`, `intake`, `packet`, `review`, and `destroy`
- Grant Guard denial path proven
- Worktree Review proven with changed and clean repos
- explicit BMAD artifact updating the backlog
- upstream-gap proof for any new engine-like behavior
