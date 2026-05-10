---
title: "Outlook Calendar Capability Planning"
description: Boundary notes for Outlook Calendar remote MCP capability requests
---

# Outlook Calendar Capability Planning

This page defines the review boundary for `host.mcp.outlook-calendar.remote`.
It is planning context only. The Workspace verifier still reads only a
self-contained Capability Request JSON.

## Source Register

| Source | Used for | Not used for |
| --- | --- | --- |
| Microsoft Graph List events | Outlook Calendar event vocabulary and permission boundary | Live MCP proof, token proof, Workspace verifier input |
| Microsoft Graph findMeetingTimes | Availability and meeting-time vocabulary | Mailbox state proof, Workspace verifier input |
| Office Add-ins platform overview | Office.js add-in runtime, manifest, and host vocabulary | Remote MCP proof, Workspace verifier input |
| Outlook add-in APIs | Office.js Outlook item API vocabulary and client add-in boundary | Microsoft Graph permission proof, Workspace verifier input |
| OpenAI Codex MCP docs | Codex remote MCP host vocabulary | Microsoft product claims, Workspace verifier input |
| BMAD Workspace Capability Contract | Declared id, exact matching, verifier boundary | Runtime availability proof |

## Boundary Map

Outlook Calendar remote MCP is an experimental `host.mcp` declaration. It uses
`provider: outlook-calendar-mcp`, `interface: remote-calendar-mcp`, and output
`outlook-calendar-mcp-operator-evidence.json`.

The declaration does not prove live MCP discovery, Outlook Calendar connector
availability, Microsoft Graph permission state, Office.js add-in runtime state,
local OAuth setup, token cache, mailbox state, or calendar contents. Those
observations are operator evidence only and are never Workspace verifier input.

Office.js is useful Outlook add-in context, but it is not the remote MCP
contract in this slice. If a future capability needs Office.js add-in authoring,
give it a separate draft or declared contract instead of overloading
`host.mcp.outlook-calendar.remote`.

`writes: ["external/outlook-calendar/events"]` is declaration metadata. Any
Calendar-affecting action still requires human review before execution and a
grant-aware operator path. The declaration forbids Workspace Base writes,
target repo writes, scheduler behavior, daemon behavior, live adapter
activation, Microsoft Graph permission changes, OAuth token-store mutation, and
mailbox-state mutation.

## Artifacts

- `docs/workspace/templates/capability-request.outlook-calendar-mcp.example.json`
- `docs/workspace/templates/outlook-calendar-mcp-operator-evidence.template.json`

The evidence template may record `OUTLOOK_CALENDAR_AUTH=set|unset` only. Do not
store OAuth tokens, refresh tokens, mailbox screenshots, event payloads,
calendar contents, logs, fixtures, or live MCP output.

## Readiness

Outlook is verifier-ready only when:

- the declared capability request verifies offline
- evidence refs are local and advisory
- generated Forge artifacts state draft/review boundaries
- human review happens before any Calendar-affecting action
- no live MCP, network, token store, mailbox state, or runtime proof is treated
  as verifier authority
