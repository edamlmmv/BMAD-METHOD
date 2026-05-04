---
title: "BMAD Workspace Distro Architecture"
description: Architecture for a BMAD-centric portable workspace distro
---

# BMAD Workspace Distro Architecture

## Architecture Thesis

BMAD is the kernel. Everything durable is justified by BMAD artifacts, gates, and
review. Codex executes. Adapter providers supply capabilities behind BMAD-owned
interfaces. The V1 system is a CLI and filesystem contract backed by Git
worktrees.

## Zoom-Out Map

```text
Workspace Distro
  -> launches Mission Workspace
  -> provides BMAD Kernel, policies, adapters, templates, secret refs

Mission Workspace
  -> attaches Repo Pack as Git worktrees
  -> runs Repo Intake
  -> asks BMAD Router for workflow
  -> produces BMAD Mission Packet
  -> renders prompt for Codex Executor
  -> receives work in Target Repos
  -> emits Worktree Review
  -> is destroyed or retained for review
```

## Module Map

| Module | Interface | Responsibility |
| --- | --- | --- |
| Workspace Distro | `launch`, `policy`, `capabilities` | Own durable BMAD base, policies, adapters, templates, and secret references. |
| Mission Workspace | `instance.json`, `destroy` | Hold disposable runtime, grants, Repo Pack links, logs, and review artifacts. |
| Repo Intake | `intake` | Produce code evidence and provenance before BMAD Mission Packet creation. |
| BMAD Router | `route` | Select BMAD workflow path and required artifacts. |
| BMAD Mission Packet | `packet` | Own mission goal, evidence, constraints, acceptance criteria, grants, and rendered prompt. |
| Capability Contract | `capabilities.json` | Expose BMAD-governed adapter capabilities to executors. |
| Codex Executor Adapter | `run` | Execute rendered prompt under grants and BMAD constraints. |
| Worktree Review | `review` | Produce per-repo status, patches, changed files, and notes. |
| Grant Guard | `authorize` | Enforce path, repo, capability, persistence, and base-write rules. |

## Storage Boundaries

| Boundary | Example Artifacts | Persistence Rule |
| --- | --- | --- |
| Workspace Distro | BMAD skills, policies, templates, adapter registry, standing orders | Durable; changed only by Base Improvement Mission with grant. |
| Mission Workspace | `instance.json`, intake output, packets, logs, review output | Disposable; retained only by explicit review policy. |
| Target Repo Worktree | Source changes, tests, commits, patches | Durable in target repo workflow, not in base. |
| Secret Store | Token references, credential handles | External; values never copied into artifacts. |

## Filesystem Sketch

```text
workspace-distro/
  bmad/
    policies/
    templates/
    standing-orders/
  adapters/
    capability-contract.json
  missions/
    .gitignore

mission-workspaces/
  <mission-id>/
    instance.json
    grants.json
    repo-pack.json
    intake/
      repo-intake.json
      provenance.json
    packets/
      bmad-mission-packet.json
      rendered-prompt.md
    runs/
      codex-result.json
      transcript.jsonl
    review/
      status.json
      diff.patch
      promotion-notes.md
    worktrees/
      <repo-name>/
```

## Interface Sketch

```bash
workspace launch --repo <path> --goal <file> --grant <grant.json>
workspace intake <mission-id>
workspace packet <mission-id>
workspace run <mission-id> --executor codex
workspace review <mission-id>
workspace destroy <mission-id> [--keep-review]
```

`launch` creates the Mission Workspace, attaches repo worktrees, records grants,
and writes `instance.json`.

`intake` runs Graph Evidence Adapter or equivalent scoped scan and writes
provenance tied to repo HEAD.

`packet` asks BMAD Router for the workflow and writes the BMAD Mission Packet.
It fails if intake is missing or stale.

`run` renders the executor prompt from the packet and invokes Codex Executor
Adapter inside Grant Guard constraints.

`review` emits per-repo Git status, patch, changed files, and Promotion notes.

`destroy` removes runtime state while preserving target repo state and any review
artifacts retained by policy.

## BMAD Mission Packet Shape

```json
{
  "id": "mission-2026-05-04-example",
  "bmadWorkflow": "bmad-quick-dev",
  "goal": "Fix the reported bug",
  "repoIntakeRefs": ["intake/repo-intake.json"],
  "constraints": ["Do not mutate Workspace Distro"],
  "grants": ["grants.json"],
  "acceptanceCriteria": ["Tests pass", "Worktree Review ready"],
  "capabilityContractRef": "capabilities.json",
  "renderedPromptRef": "packets/rendered-prompt.md",
  "reviewPlan": "Run BMAD Code Review after execution"
}
```

## Repo Intake Shape

```json
{
  "repo": "example",
  "path": "/absolute/path/or/worktree",
  "head": "40-character-git-sha",
  "scanner": "graphify",
  "scannedAt": "2026-05-04T00:00:00Z",
  "scope": ["src", "tests"],
  "summary": {
    "modules": [],
    "constraints": [],
    "risks": [],
    "relevantFiles": []
  },
  "graphRef": "intake/graph.json"
}
```

## Adapter Policy

- Graphify is a Graph Evidence Adapter, not the memory brain.
- OpenClaw and Hermes are Runtime Adapters for sessions, tasks, Cron, Heartbeat,
  and goals when a BMAD-approved workflow needs those capabilities.
- Context7 is a Documentation Evidence Adapter for trusted current docs.
- Git is the provenance, rollback, and Worktree Review Adapter.
- MCP and GitHub are capability surfaces behind the Capability Contract.
- Any adapter that duplicates scheduler, planner, memory, review, grant, or
  self-improvement behavior must provide upstream-gap proof.

## Grant Guard

Grant Guard evaluates every durable action against:

- allowed repos
- allowed paths
- allowed capabilities
- allowed persistence
- base mutation rights
- secret access references
- expiration or mission boundary

Normal missions have `baseMutation=false`. Base Improvement Missions require
`baseMutation=true` and explicit granted paths.

## Sequence

```mermaid
flowchart TD
  UserGoal["User goal + Repo Pack"] --> Launch["launch Mission Workspace"]
  Launch --> Intake["Repo Intake"]
  Intake --> Packet["BMAD Mission Packet"]
  Packet --> Prompt["Render Codex prompt"]
  Prompt --> Run["Codex Executor Adapter"]
  Run --> Review["Worktree Review"]
  Review --> Decision{"Promote or kill?"}
  Decision --> Target["Target repo merge or commit"]
  Decision --> Destroy["Destroy Mission Workspace"]
  Decision --> Base["Base Promotion only with Grant"]
```

## V1 Boundary

V1 proves the contract with CLI, files, Git worktrees, and deterministic checks.
Live schedulers, background workers, and custom UIs are later decisions only
after BMAD artifacts justify them.
