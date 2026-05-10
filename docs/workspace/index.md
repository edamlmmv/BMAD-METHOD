---
title: "BMAD Workspace"
description: Current Workspace documentation map and historical delivery archive
---

# BMAD Workspace

BMAD Workspace is a manual, evidence-first CLI for launching disposable
Workspace Sessions against one or more repositories. BMAD artifacts remain the
source of truth. Codex or a human executes outside the Workspace CLI, then the
CLI records reviewable evidence.

## Current Docs

| Need | Read |
| --- | --- |
| Product scope and non-goals | [Product Requirements](./prd.md) |
| Current architecture and artifact model | [Architecture](./architecture.md) |
| Current command contract and output rules | [Command Contract](./command-contract.md) |
| First-hour operator path | [Operator Quickstart](./operator-quickstart.md) |
| Manual operator sequence | [Operator Guide](./operator-guide.md) |
| Readiness-gap closure for operators | [Operator Readiness](./operator-readiness.md) |
| Codex self-improvement workflow | [Manual bmad-self-improve Operator Runbook](./self-improvement-codex.md) |
| Current system summary | [Current State](./current-state.md) |
| Session lifecycle and artifacts | [Session Lifecycle](./session-lifecycle.md) |
| Capability and grant model | [Capability Contract](./capability-contract.md) |
| Advisory capability profiles | [Capability Profile Registry](./capability-profile-registry.json) |
| Capability pack artifact generator | [Capability Pack Forge](./capability-pack-forge.md) |
| Capability Forge TOML/PostgreSQL integration plan | [Forge TOML/PostgreSQL BMAD Integration Plan](./capability-forge-toml-postgresql-bmad-integration-plan.md) |
| Upstream BMAD update planning | [BMAD Upstream Sync](./upstream-sync.md) |
| MCP planning boundaries and advisory evidence routes | [Workspace MCP Planning](./mcp/index.md) |
| Generic BMAD loop contract | [BMAD Loop Runbook](./bmad-loop.md) |
| Thin pre-established loop platform | [Loop Platform v1](./loop-platform-v1.md) |
| Deferred starter loop backlog | [Loop Candidate Registry](./loop-candidate-registry.md) |
| Explicit guardrails and unsupported behavior | [Guardrails](./guardrails.md) |
| Fresh-chat operator prompt and templates | [Workspace Templates](./templates/index.md) |
| Release validation checklist | [Release Checklist](./release-checklist.md) |
| Current release note | [Release Note 6.6.0](./release-note-6.6.0.md) |
| Deferred architecture decisions | [ADR Candidates](./adr-candidates.md) |

## Canonical Artifact Map

| Artifact | Canonical Doc |
| --- | --- |
| BMAD Work Packet | [Architecture](./architecture.md) |
| Manual Executor Contract | [Command Contract](./command-contract.md) |
| Result Ledger | [Command Contract](./command-contract.md) |
| Manual Closeout | [Command Contract](./command-contract.md) |
| Evidence Index | [Command Contract](./command-contract.md) |
| Archive and verify-archive | [Operator Guide](./operator-guide.md) |
| Archive Diff | [Command Contract](./command-contract.md) |
| Worktree Review | [Session Lifecycle](./session-lifecycle.md) |
| Review Manifest | [Command Contract](./command-contract.md) |

## Historical Delivery Records

Versioned PRDs, backlogs, acceptance tests, and traceability tables are retained
as historical evidence under [History](./history/index.md). Historical delivery
records are not current operator guidance.

## Templates

Use [Fresh-Chat Workspace Prompt](./templates/fresh-chat-prompt.md) to start a
new Codex chat with Workspace guardrails, BMAD skill routing, and evidence
expectations already stated.

Use [Workspace Runbook](./templates/workspace-runbook.md) to record manual
operator decisions, evidence refs, review manifest refs, closeout, and archive
verification for a real engagement.

Use [Capability Request Template](./templates/capability-request.template.json)
to author a declared-contract compatibility check for
`bmad workspace verify-capability --input <request-json>`. The verifier accepts
declared capabilities and advisory observations from the request fixture only;
it does not inspect `_bmad/custom`, local Codex config, app-server APIs, or live
Graphify state.

Use [Capability Pack Forge](./capability-pack-forge.md) with
[Capability Pack Forge Request Template](./templates/capability-pack-forge-request.template.json)
when local Context7 docs evidence and Capability Request JSON should become a
reviewable BMAD capability-pack draft. Forge emits draft artifacts only; it does
not add Workspace commands, call live tools, change verifier behavior, install
skills, grant authority, or activate `_bmad/custom`.

Use [Browser Affordance Evidence Template](./templates/browser-affordance-evidence.template.json)
to record manual Playwright CLI, Agent Browser CLI, Browser Use IAB, or Computer
Use MCP observations. Browser and desktop observations are manual evidence only;
they are not verifier input, grant authority, runtime authority, or Workspace
authority.

Use [BMad Customize And Codex MCP Planning](./mcp/customize-codex-mcp-planning.md)
when a customization discussion mentions Codex MCP. Customize may use Codex MCP
as advisory authoring context, but Workspace accepts only self-contained
Capability Request JSON as sealed verifier evidence.

Use [Context7 Google Apps Script Planning](./mcp/context7-google-apps-script-planning.md)
when a customization or Workspace discussion mentions Google Apps Script docs,
Apps Script reference APIs, or Apps Script samples through Context7. The source
labels are `apps-script-guide`, `apps-script-reference`, and
`apps-script-samples`; the exact Context7 library IDs remain the source truth.
The scoped capability is `host.mcp.context7.google-apps-script.docs`; use
[Google Apps Script Context7 Capability Request](./templates/capability-request.context7-google-apps-script.example.json)
and
[Google Apps Script Context7 Evidence Template](./templates/context7-google-apps-script-operator-evidence.template.json)
for Apps Script-specific docs planning. These sources are docs evidence only and
do not prove local MCP configuration, Apps Script runtime state, trigger
installation, deployment, or verifier authority.

Use [Context7 WebGL Fundamentals Planning](./mcp/context7-webgl-fundamentals-planning.md)
when a customization or Workspace discussion mentions WebGL Fundamentals docs
through Context7. The source label is `webgl-fundamentals`; the exact Context7
library ID is `/websites/webglfundamentals`. The scoped capability is
`host.mcp.context7.webgl-fundamentals.docs`; use
[Context7 WebGL Fundamentals Capability Request](./templates/capability-request.context7-webgl-fundamentals.example.json)
and
[Context7 WebGL Fundamentals Evidence Template](./templates/context7-webgl-fundamentals-operator-evidence.template.json)
for WebGL Fundamentals-specific docs planning. WebGL2 is an upstream caveat and
discovery route only; these sources are docs evidence only and do not prove
local MCP configuration, WebGL runtime state, browser GPU state, or verifier
authority.

Use [Google Calendar Capability Planning](./mcp/google-calendar-capability-planning.md)
when a customization or Workspace discussion mentions Calendar MCP, Google
Workspace MCP, Google Calendar API, a Codex Google Calendar connector, or the
target repo `/Users/edam/Documents/TODA/toda-gsuite-plugin`. The portable
example is
[Google Calendar MCP Capability Request](./templates/capability-request.google-calendar-mcp.example.json).

Use [Outlook Calendar Capability Planning](./mcp/outlook-calendar-capability-planning.md)
when a customization or Workspace discussion mentions Outlook Calendar MCP,
Microsoft Graph calendar APIs, Microsoft 365 calendar connectors, or Office.js
Outlook add-ins. The portable example is
[Outlook Calendar MCP Capability Request](./templates/capability-request.outlook-calendar-mcp.example.json).
Office.js remains advisory add-in/runtime context and is not verifier input.

Use [Docker MCP Toolkit And Context7 Planning](./mcp/docker-mcp-context7-planning.md)
when a customization or Workspace discussion mentions Docker MCP Toolkit,
Docker MCP Gateway, Docker MCP Catalog, Docker Hub `mcp/context7`, or Context7
through Docker MCP. The portable example is
[Docker MCP Toolkit Capability Request](./templates/capability-request.docker-mcp-toolkit.example.json).
Docker MCP and Context7 remain advisory unless explicit manual evidence is
recorded; `secretRef: Context7` is non-secret metadata and key material must
stay runtime-only.

Use [PostgreSQL MCP Capability Planning](./mcp/postgresql-mcp-capability-planning.md)
when a customization or Workspace discussion mentions PostgreSQL MCP, Postgres
MCP, Docker Hub PostgreSQL MCP, or `modelcontextprotocol/server-postgres`. The
portable example is
[PostgreSQL MCP Capability Request](./templates/capability-request.postgresql-mcp-readonly.example.json).
PostgreSQL MCP is optional/operator-provided read-only evidence only; record
`POSTGRES_URL=set|unset`, allowed schemas/tables, denied writes, and why DB
evidence is needed, never the connection string or query results.

Use [Zsh Shell MCP Capability Planning](./mcp/zsh-shell-mcp-capability-planning.md)
when a customization or Workspace discussion mentions zsh shell MCP, Desktop
Commander MCP, or local shell MCP evidence. The portable example is
[Zsh Shell MCP Capability Request](./templates/capability-request.zsh-shell-mcp.example.json).
Zsh shell MCP is optional/operator-provided evidence only; no auto-install,
auto-start, host write, process control, secret access, or live Desktop
Commander state is verifier input.

Use [Context7 Docs MCP Capability Request](./templates/capability-request.context7-docs.example.json)
when a Workspace discussion needs generic Context7 as optional docs evidence. Use
[Git MCP Capability Request](./templates/capability-request.git-mcp-local.example.json)
when a Workspace discussion needs local `mcp-server-git` tools. Context7 does
not perform Git operations, Git MCP is separate from the GitHub connector, and
both surfaces remain advisory until explicit manual evidence is recorded.

Use [BMAD Loop Codex Prompt](./templates/bmad-loop-codex-prompt.md) when Codex
should run a generic local BMAD loop for one-shot or recurring
`WorkflowBundle` goals with explicit goal input, branch safety, quality gates,
install/refresh evidence, and checkpointed continuation.

Use [Self-Improvement Codex Prompt](./templates/self-improvement-codex-prompt.md)
when Codex should improve BMAD itself as a predefined `bmad-loop` instance.

## Doctrine

- BMAD is the kernel and truth source.
- Codex is the preferred executor.
- Review Manifest is typed review evidence, not approval or workflow authority.
- Evidence Index is inspection evidence, not authority.
- Capability Verification is declared-contract compatibility, not runtime
  availability or permission.
- Workspace Diff compares archive evidence, not live sessions or worktrees.
- Normal Workspace Sessions do not mutate the BMAD Workspace.
- Base Improvement Sessions require explicit grants and Worktree Review.
