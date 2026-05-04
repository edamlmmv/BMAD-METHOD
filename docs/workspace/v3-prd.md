---
title: "BMAD Workspace V3 PRD"
description: Full rename requirements for BMAD Workspace
---

# BMAD Workspace V3 PRD

## Overview

V3 removes the old Workspace naming from repo-tracked source, docs, tests, and
skills. It does not add setup refs, autonomous execution, or Base Improvement
Session workflow changes; those are deferred to V4.

## Goals

- Make `bmad-workspace` the only repo-owned Workspace skill.
- Move Workspace source into `tools/workspace`.
- Move Workspace docs into `docs/workspace`.
- Move focused tests to `test/test-workspace-*.js`.
- Replace old write-boundary tokens with `workspace-base`.
- Keep V2 session alias behavior working.

## Non-Goals

- No setup refs for zoom-out, ubiquitous language, grill decisions, or TDD.
- No Base Improvement Session template redesign.
- No `workspace run`.
- No daemon, scheduler, watcher, live adapter, hidden memory, auto-apply, or
  auto-promotion.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V3-FR-001 | Public help shall name BMAD Workspace. |
| V3-FR-002 | Repo shall own `src/core-skills/bmad-workspace/SKILL.md`. |
| V3-FR-003 | Repo shall not own the old Workspace source skill. |
| V3-FR-004 | Workspace modules shall live under `tools/workspace`. |
| V3-FR-005 | Workspace docs shall live under `docs/workspace`. |
| V3-FR-006 | Focused workspace tests shall use `test/test-workspace-*.js`. |
| V3-FR-007 | Capability contracts and grants shall use `workspace-base` for base write boundaries. |
| V3-FR-008 | Focused workspace tests and skill validation shall pass. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- Repo-tracked source/docs/tests contain no old Workspace naming, excluding
  historical `.hermes.md`.
