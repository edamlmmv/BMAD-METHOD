---
title: 'BMAD Workspace Capability Contract'
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

| Group                       | Purpose                                                                                                 | Known Providers                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `bmad.workflow`             | Route, create artifacts, check readiness, review.                                                       | BMAD skills                      |
| `evidence.graph`            | Produce Repo Intake from code and docs.                                                                 | Graphify                         |
| `evidence.docs`             | Retrieve trusted current docs.                                                                          | Context7, official docs          |
| `executor.codex`            | Execute rendered prompts.                                                                               | Codex                            |
| `executor.codex.manual`     | Declare manual Codex readiness without runtime execution.                                               | Codex                            |
| `operator.codex.affordance` | Surface slash commands, goals, hooks, subagents, plugins, and future Codex tools as operator aids only. | Codex config and UI              |
| `runtime.session`           | Provide sessions, tasks, goals, Cron, or Heartbeat.                                                     | OpenClaw, Hermes                 |
| `repo.git`                  | Create worktrees, diff, status, commit, rollback.                                                       | Git                              |
| `host.mcp`                  | Expose bounded tool and context surfaces.                                                               | MCP servers, Context7, Git MCP, Docker MCP Toolkit, PostgreSQL MCP, Google Calendar MCP |
| `collab.github`             | Inspect issues, PRs, CI, and reviews.                                                                   | GitHub                           |

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

| Field                      | Meaning                                                 |
| -------------------------- | ------------------------------------------------------- |
| `id`                       | Stable BMAD-owned capability identifier.                |
| `group`                    | Capability family used by BMAD Router.                  |
| `provider`                 | Concrete adapter implementation.                        |
| `interface`                | Contract the adapter satisfies.                         |
| `allowedInNormalSession`   | Whether normal sessions may use it.                     |
| `allowedInBaseImprovement` | Whether base improvement sessions may use it.           |
| `requiresGrant`            | Whether explicit grant is required.                     |
| `writes`                   | Paths or artifact classes the adapter may write.        |
| `forbiddenWrites`          | Paths or artifact classes the adapter must never write. |
| `outputs`                  | Reviewable artifacts expected after use.                |
| `upstreamGapProofRequired` | Whether provider duplicates an existing engine class.   |

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
Codex and Graphify examples live at
`docs/workspace/templates/capability-request.codex-manual.example.json` and
`docs/workspace/templates/capability-request.graphify-repo-intake.example.json`.
Git Worktree Review lives at
`docs/workspace/templates/capability-request.git-worktree-review.example.json`.
Context7 Docs MCP lives at
`docs/workspace/templates/capability-request.context7-docs.example.json`.
Git local MCP lives at
`docs/workspace/templates/capability-request.git-mcp-local.example.json`.
Docker MCP Toolkit lives at
`docs/workspace/templates/capability-request.docker-mcp-toolkit.example.json`.
PostgreSQL MCP lives at
`docs/workspace/templates/capability-request.postgresql-mcp-readonly.example.json`.

### Git Worktree Review Capability

`repo.git.worktree-review` declares the Git CLI review surface already used by
`bmad workspace review`. It uses `provider: git`,
`interface: worktree-review`, `writes: ["workspace-session/review"]`, and outputs
`summary.json`, `review-manifest.json`, `status.json`, and `diff.patch`.

The declaration does not authorize target repo mutation, push, reset, clean,
merge, restore, replay, promotion, scheduler behavior, daemon behavior, or live
adapter activation. Git status and diff output are Worktree Review evidence for
manual inspection; they are not verifier input, Grant Guard authority, or
runtime permission.

### Context7 Docs MCP Candidate

`host.mcp.context7.docs` declares an experimental `host.mcp` capability for
Context7-backed documentation retrieval. It uses `provider: context7`,
`interface: remote-docs-mcp`, `requiresGrant: true`, `writes: []`, and
`outputs: ["context7-docs-operator-evidence.json"]`.

Context7 fetches documentation context; it does not perform Git operations,
mutate the target repo, authorize writes, configure MCP servers, or prove live
MCP availability. Context7 may help an operator research Git MCP docs, but the
self-contained Capability Request JSON remains the only verifier input.

Recommended local credential source is Apple Passwords item `Context7`. The
operator may manually expose the key only as `CONTEXT7_API_KEY` in a local
shell/session. No repository script, fixture, evidence artifact, screenshot,
log, issue, PR, or docs example may contain the real value. Examples may use
only `<CONTEXT7_API_KEY>` or `<redacted>`. Evidence may record
`CONTEXT7_API_KEY=set` and
`credentialSource: "Apple Passwords item Context7"`, never the key value.
There is no Apple Passwords or keychain automation in this slice.

### Docker MCP Toolkit Candidate

`host.mcp.docker.toolkit` declares an experimental, declaration-only
`host.mcp` capability for Docker MCP Toolkit gateway-profile authoring. It uses
`provider: docker-mcp-toolkit`, `interface: docker-mcp-gateway-profile`,
`requiresGrant: true`, `writes: []`, and outputs
`docker-mcp-operator-evidence.json`.

This declaration is not a statement that Docker Desktop is installed, Docker
MCP Gateway is running, Docker MCP Catalog can be reached, Docker MCP secrets
exist, Docker Hub `mcp/context7` is configured, a Context7 MCP server is live,
or Apple Passwords entry `Context7` contains a key. Docker MCP Toolkit, Docker
MCP Gateway, Docker MCP Catalog, Context7 output, Docker secrets, local MCP
config, network state, and Apple Passwords state are not verifier input and not
Workspace authority.

The secret-safe planning boundary and portable verifier example live at
`docs/workspace/docker-mcp-context7-planning.md` and
`docs/workspace/templates/capability-request.docker-mcp-toolkit.example.json`.
`secretRef: Context7` is non-secret metadata. Prefer Docker MCP secret /
`secretRef`, then `CONTEXT7_API_KEY` from a secret manager, and use `--api-key`
only as a last-resort manual path because process args can leak. Placeholders
must be only `<CONTEXT7_API_KEY>` or `<redacted>`. This capability does not
change verifier behavior.

### PostgreSQL Readonly MCP Candidate

`host.mcp.postgresql.readonly` declares an experimental, declaration-only
`host.mcp` capability for operator-provided PostgreSQL MCP read-only evidence.
It uses `provider: modelcontextprotocol/server-postgres`,
`interface: readonly-postgresql-mcp`, `requiresGrant: true`, `writes: []`, and
outputs `postgres-mcp-operator-evidence.json`.

The provider is reference metadata from archived/deprecated upstream sources,
not an endorsement. `readonly-postgresql-mcp` is BMAD-owned contract language,
not an upstream protocol name. The expected operator surface is a `query` tool
running under read-only transaction behavior, but live PostgreSQL state, Docker
MCP runtime state, MCP tool output, local MCP config, Codex config, network
access, `_bmad/custom`, query results, and Workspace Session artifacts are not
verifier input and not Workspace authority.

The secret-safe planning boundary and portable verifier example live at
`docs/workspace/postgresql-mcp-capability-planning.md` and
`docs/workspace/templates/capability-request.postgresql-mcp-readonly.example.json`.
Manual operator evidence should use
`docs/workspace/templates/postgres-mcp-operator-evidence.template.json` and may
record only `POSTGRES_URL=set` or unset, expected tools, read-only access mode,
allowed schemas/tables, denied writes, and why DB evidence is needed.

Read-only prevents mutation; it does not prevent sensitive reads. PostgreSQL MCP
readiness requires least-privilege database scope and must keep raw connection
strings, passwords, local MCP config secrets, and query results out of docs,
fixtures, evidence, logs, screenshots, transcripts, PRs, and issues.

### Git Local MCP Candidate

`host.mcp.git.local` declares an experimental `host.mcp` capability for local
Git MCP repository tools. It uses `provider: mcp-server-git`,
`interface: local-git-mcp`, `requiresGrant: true`, and outputs
`git-mcp-operator-evidence.json`.

The declaration allows only explicit artifact classes for write-capable local
Git tools: `target-repo/git-index`, `target-repo/git-commit`, and
`target-repo/git-branch`. Git MCP tools such as add, commit, and branch are
manual/grant-gated actions. The declaration forbids Workspace Base writes,
push, fetch, reset, clean, restore, merge, scheduler behavior, daemon behavior,
and live adapter activation.

GitHub connector or GitHub MCP support is separate from local Git MCP. Local
`git` CLI remains the fallback and the exact pre-push authority; before push,
the operator must still run `npm ci && npm run quality` on the exact checkout
and `HEAD` being pushed.

### Google Calendar Remote MCP Candidate

`host.mcp.google-calendar.remote` declares an experimental `host.mcp`
capability for the official Google Calendar remote MCP surface. It uses
`provider: google-calendar-mcp`, `interface: remote-calendar-mcp`,
`requiresGrant: true`, `writes: ["external/google-calendar/events"]`, and
`outputs: ["calendar-mcp-operator-evidence.json"]`.

This declaration is not a statement that Calendar MCP is configured locally, a
Codex Google Calendar connector is installed, a Google Cloud project has enabled
the Calendar API or Calendar MCP API, or an Apps Script target repo can deploy,
install triggers, or satisfy its manifest. The official-source planning
boundary and portable verifier example live at
`docs/workspace/google-calendar-capability-planning.md` and
`docs/workspace/templates/capability-request.google-calendar-mcp.example.json`.

## Capability Profile Registry

The Capability Profile Registry is the advisory snapshot at
`docs/workspace/capability-profile-registry.json`. It helps authors map named
tools such as Codex, Graphify, Git, Context7 MCP, Git MCP, Docker MCP Toolkit,
and PostgreSQL MCP to declared
Workspace capability ids, support-state notes, evidence refs, trust boundaries,
and repair hints. It may also inventory optional host MCP surfaces as advisory
authoring context.

The registry is not read by `verify-capability`. It cannot grant compatibility,
authorize writes, prove runtime availability, promote support, or demote
support. It is documentation and authoring context only. If the registry says a
tool is supported but the submitted Capability Request JSON omits or malforms
the declaration, the verifier must still fail.

Support states are `proposed`, `experimental`, `supported`, `stale`,
`deprecated`, `invalid`, and `removed`. `stale`, `deprecated`, `invalid`, and
`removed` profiles must keep a repair hint so unsupported or broken capability
knowledge stays visible instead of disappearing.

Profile entries may inventory multiple tool affordances for one declared
capability id. For example, Codex config, Codex app-server, Graphify query,
Graphify MCP, and Graphify hook/watch profiles can all help an author understand
how to write or explain a request, while the verifier still matches only the
embedded declared capability id in the submitted JSON.

Profile entries may also carry `commandEvidence` metadata for operator-runnable
smoke checks. This metadata is informational only: it is not verifier input, not
support promotion, not grant authority, and not a Workspace instruction to run
commands. Graphify CLI command evidence uses the canonical
`uv tool run --from graphifyy graphify ...` invocation and Graphify-native
node-link fixtures with `nodes[]` and `links[]`; BMAD normalized graph artifacts
remain `nodes[]` and `edges[]` evidence.

Profile evidence refs may cite committed docs, tests, source files, and source
URLs used for authoring context. They are not support promotion by themselves.
Any Workspace result or closeout that mentions Codex or Graphify tool output
must be recorded as explicit manual evidence, not as hidden validation.

Graphify source snapshots under `.graphify/sources/graphify/` and normalized
`graph/graphify-docs.graph.json` are durable advisory graph context. They help
operators explain query, MCP, hook/watch, cache, and graph-format affordances;
they do not make Workspace call Graphify or trust live Graphify output.

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

| Preferred                                          | Avoid                                               |
| -------------------------------------------------- | --------------------------------------------------- |
| "Use Repo Intake evidence."                        | "Run Graphify unless you think OpenClaw is better." |
| "Use Worktree Review."                             | "Open GitHub Desktop then inspect manually."        |
| "Use runtime task capability if BMAD requires it." | "Schedule an OpenClaw Cron job by default."         |

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
