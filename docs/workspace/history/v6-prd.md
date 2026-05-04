---
title: "BMAD Workspace V6 PRD"
description: Read-only Session inventory and Codex handoff
---

# BMAD Workspace V6 PRD

## Overview

V6 helps users see which Workspace Sessions exist and copy exact context into
Codex without changing runtime or durable state.

## Goals

- Add read-only `bmad workspace list`.
- Add raw Markdown `bmad workspace handoff <sessionId>`.
- Preserve BMAD Work Packet as source of truth.
- Keep Session continuation explicit and user-driven.

## Non-Goals

- No execution command.
- No daemon, scheduler, watcher, hidden memory, or live adapter.
- No repair, fetch, auto-apply, or durable state change.
- No `latest`, `current`, fuzzy session lookup, or inferred session selection.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V6-FR-001 | Help shall list `list` and `handoff`. |
| V6-FR-002 | `list` shall emit JSON inventory and write nothing. |
| V6-FR-003 | Missing runtime roots shall return empty inventory. |
| V6-FR-004 | Invalid session dirs shall appear as invalid entries. |
| V6-FR-005 | Symlink entries under `sessions/` shall not be followed. |
| V6-FR-006 | `handoff` shall require explicit safe `sessionId`. |
| V6-FR-007 | Missing or invalid handoff sessions shall fail with stable errors and no partial Markdown. |
| V6-FR-008 | Valid blocked or stale sessions shall still render handoff Markdown. |
| V6-FR-009 | Handoff Markdown shall use fixed sections and explicit missing-state wording. |
| V6-FR-010 | Base Improvement handoff shall report readiness diagnostics without durable state wording. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- `list` and `handoff` remain read-only and deterministic.
