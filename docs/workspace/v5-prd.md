---
title: "BMAD Workspace V5 PRD"
description: Read-only Workspace status and setup provenance hardening
---

# BMAD Workspace V5 PRD

## Overview

V5 makes BMAD Workspace Sessions inspectable without adding execution. The user
can ask what state a Workspace Session is in, why it is blocked or stale, and
whether Base Improvement evidence is ready for human review.

## Goals

- Add read-only `bmad workspace status <sessionId>`.
- Harden Setup Gate refs with local checksums and opaque external provenance.
- Report Base Improvement readiness as a deterministic checklist.
- Close V4 traceability with evidence.
- Keep BMAD Workspace free of run, daemon, scheduler, live adapter, hidden
  memory, and Promotion behavior.

## Non-Goals

- No `workspace run`.
- No network fetch for setup refs.
- No automatic repair, resume, migration, promotion, or merge.
- No readiness score or quality judgment.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V5-FR-001 | CLI help shall list `status` and use version-neutral Workspace language. |
| V5-FR-002 | `workspace status` shall read session artifacts and write nothing. |
| V5-FR-003 | Missing sessions shall fail with `SESSION_NOT_FOUND`. |
| V5-FR-004 | Existing sessions shall return JSON even when blocked, stale, or invalid. |
| V5-FR-005 | Status JSON shall expose artifacts, intake, setup, review, checks, and top-level state. |
| V5-FR-006 | Local setup refs shall require existing files and record `sha256`. |
| V5-FR-007 | Local setup checksum drift shall report `SETUP_REF_CHECKSUM_MISMATCH`. |
| V5-FR-008 | External setup refs shall be opaque, unfetched, warning-only provenance. |
| V5-FR-009 | Base Improvement readiness shall report grant, setup, review, and violation state without Promotion behavior. |
| V5-FR-010 | V4 traceability shall be closed with evidence before V5 claims completion. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- Status never creates, repairs, fetches, writes, promotes, or infers latest
  sessions.
