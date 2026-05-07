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
| Customize and Codex MCP planning boundary | [BMad Customize And Codex MCP Planning](./customize-codex-mcp-planning.md) |
| Google Calendar MCP capability planning boundary | [Google Calendar Capability Planning](./google-calendar-capability-planning.md) |
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

Use [Browser Affordance Evidence Template](./templates/browser-affordance-evidence.template.json)
to record manual Playwright CLI, Agent Browser CLI, Browser Use IAB, or Computer
Use MCP observations. Browser and desktop observations are manual evidence only;
they are not verifier input, grant authority, runtime authority, or Workspace
authority.

Use [BMad Customize And Codex MCP Planning](./customize-codex-mcp-planning.md)
when a customization discussion mentions Codex MCP. Customize may use Codex MCP
as advisory authoring context, but Workspace accepts only self-contained
Capability Request JSON as sealed verifier evidence.

Use [Google Calendar Capability Planning](./google-calendar-capability-planning.md)
when a customization or Workspace discussion mentions Calendar MCP, Google
Workspace MCP, Google Calendar API, a Codex Google Calendar connector, or the
target repo `/Users/edam/Documents/TODA/toda-gsuite-plugin`. The portable
example is
[Google Calendar MCP Capability Request](./templates/capability-request.google-calendar-mcp.example.json).

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
