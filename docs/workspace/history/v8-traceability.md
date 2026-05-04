---
title: "BMAD Workspace V8 Traceability"
description: Progress tracking for deterministic Workspace routing
---

# BMAD Workspace V8 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S72 V8 artifacts are traceable | Done | `docs/workspace/v8-traceability.md` | Acceptance mapping exists. |
| S73 Help lists workflow override | Done | `test/test-workspace-cli.js` | Help checks `--workflow`. |
| S74 Catalog filtering is deterministic | Done | `test/test-workspace-contracts.js` | Catalog filter and duplicate tests exist. |
| S75 Router handles overrides | Done | `tools/workspace/routing.js` | Override source and `ROUTE_WORKFLOW_UNKNOWN` rejection tested. |
| S76 Router handles deterministic goals | Done | `test/test-workspace-contracts.js` | Matrix covers major BMad workflows. |
| S77 Ambiguous routing fails closed | Done | `tools/workspace/routing.js` | Empty and tied goals fail. |
| S78 New packets persist routing | Done | `tools/workspace/packet.js` | New packet writes routing schema. |
| S79 Route failures are atomic | Done | `test/test-workspace-cli.js` | Invalid route preserves packet files. |
| S80 Legacy packets stay readable | Done | `tools/workspace/status.js` | Legacy packets surface `legacy-missing`. |
| S81 Surfaces report routing | Done | `tools/workspace/handoff.js` | Handoff and archive carry route data. |
| S82 Blockers override recommendations | Done | `tools/workspace/handoff.js` | Existing blocker-first route rules remain. |
| S83 Skill teaches routing | Done | `src/core-skills/bmad-workspace/SKILL.md` | Skill documents override and guardrails. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT8-001 | E33 | S73 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT8-002 | E30 | S74 | `test/test-workspace-contracts.js` | `tools/workspace/routing.js` |
| AT8-003 | E31 | S75 | `test/test-workspace-contracts.js` | `tools/workspace/routing.js` |
| AT8-004 | E31 | S75, S79 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT8-005 | E30 | S76 | `test/test-workspace-contracts.js` | `tools/workspace/routing.js` |
| AT8-006 | E30 | S77 | `test/test-workspace-contracts.js` | `tools/workspace/routing.js` |
| AT8-007 | E31 | S78 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT8-008 | E31 | S79 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT8-009 | E32 | S80 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT8-010 | E32 | S81 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT8-011 | E32 | S82 | `test/test-workspace-cli.js` | `tools/workspace/handoff.js` |
| AT8-012 | E33 | S83 | `test/test-workspace-contracts.js` | `src/core-skills/bmad-workspace/SKILL.md` |
