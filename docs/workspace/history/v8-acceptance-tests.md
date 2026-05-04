---
title: "BMAD Workspace V8 Acceptance Tests"
description: Acceptance tests for the V8 routing contract
---

# BMAD Workspace V8 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT8-001 | Inspect help. | `--workflow <skill[:action]>` is listed; execution commands remain absent. |
| AT8-002 | Build routeable catalog. | BMad workflow rows are included; `_meta`, agent rows, non-BMad rows, and duplicates are excluded. |
| AT8-003 | Route explicit workflow override. | Selected workflow matches override with `source=override`. |
| AT8-004 | Reject unknown or excluded override. | Command fails with `ROUTE_WORKFLOW_UNKNOWN` and writes no packet artifacts. |
| AT8-005 | Route deterministic goals. | PRD, architecture, UX, story, quick-dev, review, research, docs, context, and correct-course goals map deterministically. |
| AT8-006 | Reject empty or ambiguous goals. | Router fails with `ROUTE_DECISION_REQUIRED` and reports alternatives. |
| AT8-007 | Build new packet. | Packet has `routing.routingSchemaVersion: 1` and `bmadWorkflow === routing.selectedWorkflow`. |
| AT8-008 | Preserve packet artifacts on route failure. | Existing packet files are unchanged after invalid route attempts. |
| AT8-009 | Read legacy packet. | Status and handoff show `source=legacy-missing` for V4 packets without routing. |
| AT8-010 | Surface routing. | Status, handoff, and archive report the same selected workflow and route source. |
| AT8-011 | Blockers override route. | Missing intake, stale intake, setup drift, or missing review keep deterministic next-route blockers. |
| AT8-012 | Verify guardrails. | No execution, scheduler, watcher, live adapter, restore, replay, or auto-promotion behavior is added. |
