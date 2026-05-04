---
title: "Workspace Distro Capability Contract"
description: BMAD-governed capability registry for Workspace Distro adapters
---

# Workspace Distro Capability Contract

## Purpose

Capability Contract lets BMAD expose available tools to a Mission Workspace
without turning provider names into prompt lore. A mission prompt should say what
capability is needed; the Workspace Distro decides which adapter provides it.

## Principles

- BMAD owns capability names, constraints, and acceptance criteria.
- Adapters satisfy BMAD-owned interfaces.
- Provider-specific behavior stays behind adapter metadata.
- Missing capabilities become BMAD-visible gaps, not silent prompt edits.
- Duplicate engine proposals require upstream-gap proof.

## Capability Groups

| Group | Purpose | Known Providers |
| --- | --- | --- |
| `bmad.workflow` | Route, create artifacts, check readiness, review. | BMAD skills |
| `evidence.graph` | Produce Repo Intake from code and docs. | Graphify |
| `evidence.docs` | Retrieve trusted current docs. | Context7, official docs |
| `executor.codex` | Execute rendered prompts. | Codex |
| `runtime.session` | Provide sessions, tasks, goals, Cron, or Heartbeat. | OpenClaw, Hermes |
| `repo.git` | Create worktrees, diff, status, commit, rollback. | Git |
| `host.mcp` | Expose bounded tool and context surfaces. | MCP servers |
| `collab.github` | Inspect issues, PRs, CI, and reviews. | GitHub |

## Contract Sketch

```json
{
  "schemaVersion": "0.1",
  "workspaceDistroVersion": "git-sha-or-tag",
  "capabilities": [
    {
      "id": "evidence.graph.repo-intake",
      "group": "evidence.graph",
      "provider": "graphify",
      "interface": "repo-intake",
      "allowedInNormalMission": true,
      "allowedInBaseImprovement": true,
      "requiresGrant": false,
      "writes": ["mission-workspace/intake"],
      "forbiddenWrites": ["workspace-distro"],
      "outputs": ["repo-intake.json", "graph.json", "provenance.json"],
      "upstreamGapProofRequired": false
    }
  ]
}
```

## Adapter Record

| Field | Meaning |
| --- | --- |
| `id` | Stable BMAD-owned capability identifier. |
| `group` | Capability family used by BMAD Router. |
| `provider` | Concrete adapter implementation. |
| `interface` | Contract the adapter satisfies. |
| `allowedInNormalMission` | Whether normal missions may use it. |
| `allowedInBaseImprovement` | Whether base improvement missions may use it. |
| `requiresGrant` | Whether explicit grant is required. |
| `writes` | Paths or artifact classes the adapter may write. |
| `forbiddenWrites` | Paths or artifact classes the adapter must never write. |
| `outputs` | Reviewable artifacts expected after use. |
| `upstreamGapProofRequired` | Whether provider duplicates an existing engine class. |

## Grant Interaction

Capability Contract says what could be available. Grant Guard decides what is
allowed for one mission. A capability can exist but still be blocked by mission
grant, target repo, path, expiration, or base mutation policy.

## Executor Prompt Rule

Rendered prompts should reference capability intent, not provider internals.

| Preferred | Avoid |
| --- | --- |
| "Use Repo Intake evidence." | "Run Graphify unless you think OpenClaw is better." |
| "Use Worktree Review." | "Open GitHub Desktop then inspect manually." |
| "Use runtime task capability if BMAD requires it." | "Schedule an OpenClaw Cron job by default." |

## Upstream-Gap Proof

Before adding an adapter that behaves like a scheduler, planner, ledger, memory
graph, review engine, grant engine, or self-improvement brain, the architecture
must record:

- existing upstream surfaces inspected
- why they cannot satisfy the needed capability
- smallest new interface required
- test surface
- rollback path
- review owner
