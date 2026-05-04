---
title: "Workspace Distro V1 Implementation Backlog"
description: TDD-first epics and stories for the BMAD Workspace Distro V1 slice
---

# Workspace Distro V1 Implementation Backlog

## Source Boundary

This backlog is derived from source commit
`b50f9fee8879a06c03a8b14a21635b0dc2a4be3e`.

Canonical inputs:

- `UBIQUITOUS_LANGUAGE.md`
- `docs/workspace-distro/prd.md`
- `docs/workspace-distro/architecture.md`
- `docs/workspace-distro/capability-contract.md`
- `docs/workspace-distro/adr-candidates.md`
- `docs/workspace-distro/v1-acceptance-tests.md`

Graphify may inform evidence, but BMAD remains the source of truth. V1 uses
existing documents and scoped evidence only; it does not require broad graph
extraction.

## Zoom-Out Map

```text
BMAD Workspace Distro doctrine
  -> V1 implementation backlog
  -> TDD tracer slices
  -> CLI + filesystem + Git worktree proof
  -> later Codex run adapter and runtime adapters
```

## V1 Boundary

V1 proves:

- CLI, filesystem artifacts, and Git worktree contract.
- Mission lifecycle through `launch`, `intake`, `packet`, `review`, and
  `destroy`.
- BMAD Mission Packet as the source of truth.
- Rendered Prompt as a derived artifact.
- Repo Intake freshness before packet creation.
- Worktree Review as the review surface.
- Base Mutation Grant as the only path to Workspace Distro writes.
- Capability Contract as the adapter registry.

V1 excludes:

- daemon, watcher, scheduler, Cron, Heartbeat, and background worker
- durable ledger, memory graph, hidden cache-as-truth, or vector store
- custom planner, review engine, grant engine, or self-improvement brain
- auto-promotion into the Workspace Distro
- live OpenClaw, Hermes, Context7, MCP, GitHub, or Codex execution
- custom review UI

When uncertain, choose the smallest contract that preserves adapter
replaceability and testability.

## Epics

| Epic | V1 Goal | Acceptance Tests | Dependencies | Non-Goals | Main Risk |
| --- | --- | --- | --- | --- | --- |
| E1 Contract Foundation | Define artifact and validation contract. | AT-020, AT-022, AT-030, AT-032 | None | Runtime adapters, daemon, UI | Schema bloat before behavior. |
| E2 Mission Lifecycle CLI | Prove launch, intake, and packet flow. | AT-001 to AT-013, AT-020 to AT-022 | E1 | Codex execution, live Graphify | Hidden state outside artifacts. |
| E3 Worktree Review And Cleanup | Prove review and destroy safety. | AT-050 to AT-052, AT-070 to AT-072 | E2 | Custom review UI | Deleting target repo work. |
| E4 Grant Guard And Base Isolation | Enforce base mutation rules. | AT-031, AT-040, AT-041, AT-060 to AT-063 | E1, E2 | Full security engine | Grant checks that do not guard writes. |
| E5 Distro Skill Boundary | Decide focused skill boundary. | AT-030, AT-032 | E1 | Replacing MissionCTL harness | Graphify leaking into BMAD truth. |

## Stories

| ID | Story | Public Surface | Likely Files Or Areas | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Validate Workspace Distro artifact contracts. | `node test/test-workspace-distro-contracts.js` | `test/`, `tools/workspace-distro/` | Invalid packet without acceptance criteria fails. | Minimal contract validator for packet and capability fixtures. | AT-020, AT-022, AT-030 |
| S2 | Expose non-interactive workspace CLI help. | `bmad workspace --help` | `tools/installer/commands/`, `tools/installer/bmad-cli.js` | Command is missing. | `workspace` command lists V1 subcommands. | AT-001 |
| S3 | Launch one target repo safely. | `bmad workspace launch --repo <path> --goal <file>` | Workspace command, launch module | Temp Git repo launch has no mission artifacts. | Mission dir has `instance.json`, `repo-pack.json`, grants, and worktree; base diff clean. | AT-001, AT-003 |
| S4 | Launch multiple target repos. | `bmad workspace launch --repo <a> --repo <b>` | Launch module | Second repo is not recorded. | Repo Pack records each repo, branch, HEAD, and worktree path. | AT-002 |
| S5 | Run Repo Intake before packet creation. | `bmad workspace intake <mission-id>` | Intake module | Intake output missing. | `repo-intake.json` and `provenance.json` record repo HEAD and scanner metadata. | AT-010, AT-013 |
| S6 | Block packet without fresh intake. | `bmad workspace packet <mission-id>` | Packet validator | Packet succeeds without intake or with stale HEAD. | Missing or stale intake exits nonzero with clear error. | AT-011, AT-012 |
| S7 | Create BMAD Mission Packet as source artifact. | `bmad workspace packet <mission-id>` | Packet builder | Packet omits required refs. | Packet includes goal, evidence refs, constraints, grants, acceptance criteria, Capability Contract ref, and Rendered Prompt ref. | AT-020, AT-021 |
| S8 | Emit Worktree Review artifacts. | `bmad workspace review <mission-id>` | Review module, Git adapter | Review emits no patch or status. | Per-repo `status.json`, changed files, and `diff.patch` exist; clean case works. | AT-050 to AT-052 |
| S9 | Destroy disposable runtime safely. | `bmad workspace destroy <mission-id> [--keep-review]` | Destroy module | Destroy deletes target repo work. | Runtime removed, target repo changes preserved, optional review retention honored. | AT-070 to AT-072 |
| S10 | Block Workspace Distro writes without grant. | Workspace commands through Grant Guard | Grant Guard | Normal mission can write base path. | Base mutation attempt exits nonzero and records violation artifact. | AT-031, AT-041, AT-060 |
| S11 | Allow scoped Base Improvement Mission with grant. | `bmad workspace launch --base-improvement --grant <file>` | Grant Guard, base worktree module | Granted path is ignored or overbroad. | Dedicated base worktree branch exists; writes limited to granted paths; Promotion remains explicit. | AT-061 to AT-063 |

## Story Dependency Order

```text
S1 -> S2 -> S3 -> S5 -> S6 -> S7 -> S8 -> S9 -> S10 -> S11
             \-> S4
```

S4 can start after S3 is green. S10 can start after S1 and S3 define enough
artifact and path structure.

## Minimal First Implementation Slice

Implement S1, S2, and S3 only.

The first proof is:

```bash
bmad workspace launch --repo <temp-git-repo> --goal <goal-file>
```

Expected outcome:

- command exits zero
- Mission Workspace exists
- `instance.json`, `repo-pack.json`, and grants exist
- repo worktree exists
- Workspace Distro Git diff remains clean except intentional implementation files

## TDD Tracer Order

| Step | Red Test | Green Implementation |
| --- | --- | --- |
| T1 | `bmad workspace --help` is missing. | Register `workspace` command and subcommand help. |
| T2 | Launch one temp Git repo does not create mission files. | Minimal launch writes mission artifacts. |
| T3 | Launch mutates Workspace Distro unexpectedly. | Write mission state only under configured runtime path. |
| T4 | Intake does not record target repo HEAD. | Read Git HEAD and write intake provenance. |
| T5 | Packet succeeds without intake. | Add missing-intake guard. |
| T6 | Packet succeeds after target repo HEAD changes. | Add stale-intake guard. |
| T7 | Packet lacks acceptance criteria or Rendered Prompt ref. | Build minimal BMAD Mission Packet. |
| T8 | Review lacks Git status or patch. | Add Git status and diff output. |
| T9 | Destroy removes target repo changes. | Remove runtime only; preserve target work. |
| T10 | Base write without grant succeeds. | Add Grant Guard denial path. |

Use vertical red-green-refactor only. Do not write all tests first.

## Implementation Readiness Findings

- Ready to start S1 because source PRD, architecture, Capability Contract, ADRs,
  and acceptance tests exist.
- Ready to start S2 and S3 after S1 defines minimum artifact contract.
- Not ready for `run` or Codex execution until lifecycle, review, and grant
  boundaries are green.
- Not ready for live OpenClaw, Hermes, Context7, MCP, GitHub, or broad Graphify
  integration.
- Need one default mission runtime root before implementation. Tests should use
  a temp directory; user-facing config can come later.

## Adversarial Findings

- Workspace Distro can become a broad platform. V1 must stay CLI, files, and Git.
- Grant Guard can become theatre if it checks intent but not durable writes.
- Graphify can leak into truth. Keep it evidence-only.
- Multi-repo launch can distract from the one-repo tracer. Keep it after S3.
- Base Improvement Mission can invite unsafe self-mutation. Put it behind S10.
- Whole-file markdown snapshots will be brittle. Prefer structured assertions.
- Any story that requires daemon, scheduler, hidden memory, or live adapters must
  be cut from V1.

## Cut List

- `workspace run`
- real Codex execution
- OpenClaw or Hermes runtime calls
- Context7, MCP, GitHub, or network calls
- daemon, watcher, Cron, Heartbeat, or background worker
- custom review UI
- hidden memory, vector store, or cache-as-truth
- auto-promotion
- broad graph extraction
- replacing `missionctl-graphify-bmad`

## Skill Recommendation

Do not replace `missionctl-graphify-bmad`.

Create `bmad-workspace-distro` after this backlog is accepted. The new skill
should own Workspace Distro planning, contracts, acceptance mapping, Base
Mutation Grant rules, and TDD slices. `missionctl-graphify-bmad` should remain
the broad MissionCTL and Graphify evidence harness.

