---
title: "BMAD Workspace Capability Contract"
description: BMAD-governed capability registry for BMAD Workspace adapters
---

# BMAD Workspace Capability Contract

## Purpose

Capability Contract lets BMAD expose available tools to a Workspace Session
without turning provider names into prompt lore. A session prompt should say what
capability is needed; the BMAD Workspace decides which adapter provides it.

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
| `executor.codex.manual` | Declare manual Codex readiness without runtime execution. | Codex |
| `operator.codex.affordance` | Surface slash commands, goals, hooks, subagents, plugins, and future Codex tools as operator aids only. | Codex config and UI |
| `runtime.session` | Provide sessions, tasks, goals, Cron, or Heartbeat. | OpenClaw, Hermes |
| `repo.git` | Create worktrees, diff, status, commit, rollback. | Git |
| `host.mcp` | Expose bounded tool and context surfaces. | MCP servers |
| `collab.github` | Inspect issues, PRs, CI, and reviews. | GitHub |

## Contract Sketch

```json
{
  "schemaVersion": "0.1",
  "workspaceVersion": "git-sha-or-tag",
  "capabilities": [
    {
      "id": "evidence.graph.repo-intake",
      "group": "evidence.graph",
      "provider": "graphify",
      "interface": "repo-intake",
      "allowedInNormalSession": true,
      "allowedInBaseImprovement": true,
      "requiresGrant": false,
      "writes": ["workspace-session/intake"],
      "forbiddenWrites": ["workspace-base"],
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
| `allowedInNormalSession` | Whether normal sessions may use it. |
| `allowedInBaseImprovement` | Whether base improvement sessions may use it. |
| `requiresGrant` | Whether explicit grant is required. |
| `writes` | Paths or artifact classes the adapter may write. |
| `forbiddenWrites` | Paths or artifact classes the adapter must never write. |
| `outputs` | Reviewable artifacts expected after use. |
| `upstreamGapProofRequired` | Whether provider duplicates an existing engine class. |

## Grant Interaction

Capability Contract says what could be available. Grant Guard decides what is
allowed for one session. A capability can exist but still be blocked by session
grant, target repo, path, expiration, or base mutation policy.

Codex operator affordances can be discovered from explicit operator context such
as `~/.codex/config.toml`, but they remain advisory. For example,
`features.goals`, `features.multi_agent`, and `features.codex_hooks` can tell
the operator that `/goal`, subagents, or passive hooks may be available. They do
not authorize Workspace writes or hidden execution.

## Capability Verification

`bmad workspace verify-capability --input <request-json>` is a declared-contract
compatibility check over one self-contained Capability Request JSON document.
The request carries the exact capability id, session type, optional requested
contract fields, declared capability entries, and optional advisory observations.

Embedded `capabilities[]` declarations must include the current Adapter Record
fields. Missing or malformed declaration fields fail as `REQUEST_INVALID`.
Duplicate exact capability ids fail as `CAPABILITY_ID_DUPLICATE`. The verifier
does not hydrate or repair declarations from ambient Workspace, Codex, Graphify,
or customization state.

Version 1 matching is exact and case-sensitive on `request.id`. Aliases, tags,
descriptions, group fallback, provider fallback, lowercasing, trimming, and
semantic matching do not grant capability. Requested `writes` and `outputs` are
exact artifact-class subset checks; no glob, prefix, or path containment rules
are inferred.

The verifier returns `bmad-workspace-capability-verdict` JSON. `ok: true` means
declared capability compatibility only. It does not prove runtime availability,
read `_bmad/custom`, inspect local Codex config, call app-server APIs, run
Graphify, authorize writes, or replace Evidence Gate v1, Grant Guard,
Self-Improve invariants, install checks, or quality checks. `requiresGrant` is
reported as advisory; `authorize` remains the grant authority.

Author request/declaration examples through Workspace docs and BMad Customize
guidance, then pass the resolved declaration fixture to the verifier. Do not make
the verifier depend on hand-authored TOML or customization merge internals.

## Capability Profile Registry

The Capability Profile Registry is the advisory snapshot at
`docs/workspace/capability-profile-registry.json`. It helps authors map named
tools such as Codex and Graphify to declared Workspace capability ids,
support-state notes, evidence refs, trust boundaries, and repair hints.

The registry is not read by `verify-capability`. It cannot grant compatibility,
authorize writes, prove runtime availability, promote support, or demote
support. It is documentation and authoring context only. If the registry says a
tool is supported but the submitted Capability Request JSON omits or malforms
the declaration, the verifier must still fail.

Support states are `proposed`, `experimental`, `supported`, `stale`,
`deprecated`, `invalid`, and `removed`. `stale`, `deprecated`, `invalid`, and
`removed` profiles must keep a repair hint so unsupported or broken capability
knowledge stays visible instead of disappearing.

## Support Promotion

This support promotion rule is separate from Workspace Base promotion or target
repo merge decisions.

Support promotion means changing committed capability contract or profile data
after evidence is reviewed. A capability becomes supported only through a
committed evidence package: declaration, positive fixture, negative fixtures,
boundary tests, docs, validator owner, and quality evidence.

Verifier success is one evidence item, not the promotion decision. Runtime
availability, local Codex config, live Graphify state, BMad Customize resolver
output, Review Manifest, Result Ledger, Closeout, and Archive evidence cannot
promote support by themselves.

## Executor Prompt Rule

Rendered prompts should reference capability intent, not provider internals.

| Preferred | Avoid |
| --- | --- |
| "Use Repo Intake evidence." | "Run Graphify unless you think OpenClaw is better." |
| "Use Worktree Review." | "Open GitHub Desktop then inspect manually." |
| "Use runtime task capability if BMAD requires it." | "Schedule an OpenClaw Cron job by default." |

## Upstream-Gap Proof

Before adding an adapter that behaves like a scheduler, planner, ledger, memory
graph, review engine, grant engine, or base improvement brain, the architecture
must record:

- existing upstream surfaces inspected
- why they cannot satisfy the needed capability
- smallest new interface required
- test surface
- rollback path
- review owner
