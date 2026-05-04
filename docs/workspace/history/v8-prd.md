---
title: "BMAD Workspace V8 PRD"
description: Deterministic routing contract for BMAD Work Packets
---

# BMAD Workspace V8 PRD

## Overview

V8 makes Workspace packet creation choose an explicit BMAD workflow through a
deterministic routing contract. It prepares future execution by making the next
manual workflow auditable, but it does not execute that workflow.

## Goals

- Add deterministic routing to newly generated BMAD Work Packets.
- Add `--workflow <skill[:action]>` as an explicit override for packet routing.
- Keep packet V4 compatibility while adding `routing.routingSchemaVersion: 1`.
- Make status, handoff, and archive report route provenance when present.

## Non-Goals

- No `workspace run`.
- No daemon, scheduler, watcher, live adapter, restore, replay, or auto-promotion.
- No LLM-driven route selection.
- No deep Graphify evidence expansion.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V8-FR-001 | Help shall list `--workflow <skill[:action]>` and still omit execution commands. |
| V8-FR-002 | Router shall be pure and receive all inputs as an explicit object. |
| V8-FR-003 | Routeable workflows shall come from `src/bmm-skills/module-help.csv` using the V8 catalog filter. |
| V8-FR-004 | Unknown or excluded workflow overrides shall fail with `ROUTE_WORKFLOW_UNKNOWN` and write no packet artifacts. |
| V8-FR-005 | Empty, ambiguous, or tied deterministic routes shall fail with `ROUTE_DECISION_REQUIRED`. |
| V8-FR-006 | Newly generated packets shall include `routing.routingSchemaVersion: 1`. |
| V8-FR-007 | Newly generated packets shall keep `bmadWorkflow` equal to `routing.selectedWorkflow`. |
| V8-FR-008 | Legacy V4 packets without `routing` shall remain readable as `legacy-missing`. |
| V8-FR-009 | Status, handoff, and archive shall surface route workflow, source, confidence, and blockers. |
| V8-FR-010 | Blockers shall override routing recommendations in user-facing next-route text. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- Before push, `npm ci && npm run quality` passes on the exact checkout.
