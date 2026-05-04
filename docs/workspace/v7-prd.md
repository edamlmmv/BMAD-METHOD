---
title: "BMAD Workspace V7 PRD"
description: Portable Session archive and verification
---

# BMAD Workspace V7 PRD

## Overview

V7 preserves a Workspace Session as a portable evidence bundle. The archive is
for inspection and handoff. It is not a backup, restore package, replay input,
or Promotion artifact.

## Goals

- Add `bmad workspace archive <sessionId> --output <archive-dir>`.
- Add `bmad workspace verify-archive <archive-dir>`.
- Preserve known Session artifacts, status, handoff, and closeout guidance.
- Verify archive shape and checksums without touching runtime or repos.

## Non-Goals

- No restore, import, replay, or execution.
- No daemon, scheduler, watcher, hidden memory, or live adapter.
- No compression, encryption, signing, upload, or auto-promotion.
- No target repo or Workspace Base content snapshot.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V7-FR-001 | Help shall list `archive`, `verify-archive`, and `--output`. |
| V7-FR-002 | `archive` shall fail missing or invalid sessions without partial output. |
| V7-FR-003 | `archive` shall create the exact requested output directory and fail if it exists. |
| V7-FR-004 | `archive` shall write only the output directory. |
| V7-FR-005 | `archive` shall include manifest, checksums, status, handoff, closeout, and allowlisted Session artifacts. |
| V7-FR-006 | `archive` shall preserve setup refs and checksums without copying setup evidence files. |
| V7-FR-007 | `verify-archive` shall reject missing, malformed, unsupported, unsafe, missing-file, and tampered archives. |
| V7-FR-008 | `verify-archive` shall be read-only. |
| V7-FR-009 | Base Improvement archives shall remain diagnostic and avoid durable action wording. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- Archive output is portable, local, deterministic, and evidence-only.
