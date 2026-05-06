---
title: "Google Calendar Capability Planning"
description: Official-source boundary plan for BMAD Workspace Google Calendar MCP capability authoring
---

# Google Calendar Capability Planning

## Summary

BMAD Workspace recognizes `host.mcp.google-calendar.remote` as an experimental
host MCP capability declaration for operator-granted Google Calendar access. The
declaration is verifier-compatible only. Official Google and OpenAI sources
inform authoring context; they do not make the verifier read the network,
Codex config, live MCP state, target repositories, `_bmad/custom`, or Workspace
Session artifacts.

Primary invariant: `bmad workspace verify-capability` evaluates only the
self-contained Capability Request JSON supplied to it. Same request, same
verdict, even with no repo, session, network, live MCP, connector, Codex config,
or target runtime available.

## Source Register

| source_id | Title | URL | Publisher | Retrieved | Stability | Used For | Do Not Use For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `google_calendar_mcp_config` | Configure the Calendar MCP server | [Calendar MCP server](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server) | Google for Developers | 2026-05-06 | Developer Preview, page last updated 2026-04-22 UTC | Calendar MCP endpoint, OAuth 2.0, HTTP transport, Calendar MCP tools, API enablement prerequisites, indirect prompt injection warning | Apps Script runtime proof, target repo manifest proof, Codex connector proof, Workspace verifier input | Official Calendar MCP source for external Calendar MCP claims. |
| `google_workspace_mcp_config` | Configure Google Workspace MCP servers | [Workspace MCP servers](https://developers.google.com/workspace/guides/configure-mcp-servers) | Google for Developers | 2026-05-06 | Developer Preview | Google Workspace MCP family, dedicated Calendar MCP server, Calendar MCP tool list, Workspace-wide security boundary | Product-specific Calendar API behavior, Codex config proof, Workspace verifier input | Official Workspace MCP overview. |
| `google_calendar_api_overview` | Google Calendar API overview | [Calendar API overview](https://developers.google.com/workspace/calendar/api/guides/overview) | Google for Developers | 2026-05-06 | API guide | Calendar API REST boundary, calendar and event resource terms | MCP endpoint proof, Apps Script deployment proof, trigger installation proof | Separates Calendar API from Calendar MCP. |
| `google_calendar_addons_create_conference` | Create third-party conferences | [Create conferences](https://developers.google.com/workspace/add-ons/calendar/conferencing/create-conference) | Google for Developers | 2026-05-06 | Add-ons guide | Calendar add-on conferencing behavior, manifest/on-create boundary | Calendar MCP support proof, Workspace verifier input, API enablement proof | Planning context for Google Apps Script add-ons only. |
| `google_calendar_addons_sync_conference_changes` | Sync calendar conference changes | [Sync conference changes](https://developers.google.com/workspace/add-ons/calendar/conferencing/sync-calendar-changes) | Google for Developers | 2026-05-06 | Add-ons guide | Apps Script installable trigger and event-sync planning context | Calendar MCP support proof, Workspace verifier input, trigger installation guarantee | Planning context for target add-on behavior only. |
| `openai_codex_mcp_docs` | Model Context Protocol for Codex | [Codex MCP](https://developers.openai.com/codex/mcp) | OpenAI Developers | 2026-05-06 | Product docs | Codex MCP host configuration, streamable HTTP MCP, OAuth login semantics, config scope | Google Calendar product claims, Calendar API proof, Workspace verifier input | Official Codex host boundary source. |
| `bmad_workspace_capability_contract` | BMAD Workspace Capability Contract | docs/workspace/capability-contract.md | BMAD-METHOD | 2026-05-06 | Repo-owned contract | Declared capability schema, exact id matching, grant boundary, sealed verifier invariant | Google external product claims | Local source for BMAD-owned fields only. |

## Boundary Map

| Surface | What It Is | What It Can Support | Boundary |
| --- | --- | --- | --- |
| Calendar MCP | Google Calendar remote MCP server at `https://calendarmcp.googleapis.com/mcp/v1` | Operator-granted Calendar read/action tools through MCP | Developer Preview. Does not prove Apps Script runtime, deploy, trigger install, target manifest, or Calendar API enablement in a repo. |
| Google Workspace docs MCP | Documentation/context surface for Google Workspace docs | Official-doc retrieval and authoring evidence | Docs context only. It is not Calendar account access and not verifier authority. |
| Calendar API | REST API for Calendar resources | Calendar API planning vocabulary and resource behavior | Separate from Calendar MCP. API availability or manifest scopes are not verifier proof. |
| Codex Google Calendar connector | Codex app connector/plugin surface, when installed for an operator | Scheduling and event-management assistance inside Codex | Connector availability is operator context only and is not official Calendar MCP proof. |
| Workspace verifier | `bmad workspace verify-capability` | Declared-contract compatibility over one JSON request | No filesystem, network, live MCP, connector, Codex config, target repo, `_bmad/custom`, or session artifact reads. |
| Target repo | `/Users/edam/Documents/TODA/toda-gsuite-plugin` | Planning context for the local Google Workspace add-on target repo | Read-only unless implementation is explicitly approved. Dirty state and `appsscript.json` never prove this capability. |

## Candidate Declaration

The committed declaration uses only fields accepted by the Workspace verifier:

```json
{
  "id": "host.mcp.google-calendar.remote",
  "group": "host.mcp",
  "provider": "google-calendar-mcp",
  "interface": "remote-calendar-mcp",
  "allowedInNormalSession": true,
  "allowedInBaseImprovement": false,
  "requiresGrant": true,
  "writes": ["external/google-calendar/events"],
  "forbiddenWrites": [
    "workspace-base",
    "target-repo",
    "target-repo/appsscript",
    "scheduler",
    "daemon",
    "live-adapter",
    "apps-script-runtime",
    "calendar-api-enablement",
    "trigger-install",
    "deployment"
  ],
  "outputs": ["calendar-mcp-operator-evidence.json"],
  "upstreamGapProofRequired": false
}
```

Additional planning metadata belongs in docs and request observations, not in
the declaration schema:

| Metadata | Value | source_id |
| --- | --- | --- |
| Support state | `experimental` | `google_calendar_mcp_config`, `google_workspace_mcp_config` |
| Auth | `operator_oauth_2_0` | `google_calendar_mcp_config`, `openai_codex_mcp_docs` |
| Transport | Remote HTTP MCP endpoint | `google_calendar_mcp_config`, `openai_codex_mcp_docs` |
| Boundary | Operator-granted live Calendar access only | `google_calendar_mcp_config`, `bmad_workspace_capability_contract` |

The portable fixture is
`docs/workspace/templates/capability-request.google-calendar-mcp.example.json`.
It embeds the declaration and source-referenced observations so the verifier can
run with no ambient context.

## Customize Routing

`bmad-customize` has no exposed `customize.toml` surface for changing its own
capability behavior. Google Calendar guidance therefore belongs in repo-owned
source docs and skill text, not in `_bmad/custom`.

Customize may teach, scaffold, warn, and add per-skill reminders through exposed
`persistent_facts` fields on other customizable skills. It must not invent
schema, grant authority, central capability config, live MCP access, local OAuth
setup, or verifier inputs. It must not ask users to paste tokens, secrets,
client IDs, or local credential material as verifier proof.

## Workspace Planning Pack

Target repo planning context for the local Google Workspace add-on target repo:

- Target repo: `/Users/edam/Documents/TODA/toda-gsuite-plugin`
- Known dirty state when planned: `appsscript.json`, `package.json`, and
  untracked `docs/`
- Use target facts for planning only unless implementation is explicitly
  approved.
- Treat Apps Script manifest scopes, add-on triggers, deploy settings, advanced
  Calendar service declarations, and Calendar API enablement as target runtime
  context only. None are verifier inputs.

## Security Review

Calendar MCP exposes account data and actions. Google names indirect prompt
injection as a security risk when a model processes untrusted Calendar data
through powerful tools. Any plan that could read, create, update, respond to, or
delete Calendar events must require human review before Calendar-affecting
actions.
Compatibility phrase: human review before Calendar-affecting actions.

Do not connect untrusted MCP applications. Do not process untrusted event data as
instructions. Do not let Calendar content, target repo files, connector output,
or live MCP discovery alter the sealed Capability Request declaration.

## Negative Fixture Matrix

The verifier must reject or ignore support claims derived from:

| Claim Source | Expected Handling |
| --- | --- |
| `appsscript.json` scopes or add-on manifest | Reject as verifier proof; target repo context only. |
| Installed Codex Google Calendar connector | Reject as verifier proof; operator context only. |
| Live MCP discovery or `/mcp list` output | Reject as verifier proof; manual evidence only. |
| Calendar API enablement in a Cloud project | Reject as verifier proof; runtime prerequisite only. |
| Apps Script trigger install | Reject as verifier proof; target runtime state only. |
| Apps Script deploy permissions | Reject as verifier proof; target runtime state only. |
| `_bmad/custom` or per-skill reminders | Reject as verifier proof; authoring context only. |
| Codex config or local OAuth setup | Reject as verifier proof; host/operator context only. |

## Validation

Required planning gates:

- `node test/test-workspace-contracts.js`
- `npm run validate:skills`
- `npm run test:workspace`

Before pushing, run `npm ci && npm run quality` on the exact checkout to be
pushed.
