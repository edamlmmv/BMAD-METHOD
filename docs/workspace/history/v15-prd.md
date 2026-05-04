---
title: "BMAD Workspace V15 PRD"
description: Read-only archive diff requirements
---

# BMAD Workspace V15 PRD

## Overview

V15 adds `bmad workspace diff`, a read-only archive comparison command for
portable Workspace evidence bundles. It compares two verified archives and emits
deterministic JSON so operators can see changed files, status, packet, closeout,
and Evidence Index deltas before manual review.

V15 stays inside the trust tooling boundary. It does not add execution,
restore/replay, import, merge, promotion, scheduling, watching, live adapters,
remote fetch, or a semantic compare policy layer.

## Baseline

V14 added Evidence Index, next manual actions, archive V2, V1 archive
compatibility, and handoff trust summaries. The remaining operator gap is
comparison: archives are verifiable, but there is no compact answer to what
changed between two evidence bundles.

## Goals

- Add JSON-only `bmad workspace diff --left <archive-dir> --right <archive-dir>`.
- Verify both archive inputs before comparing.
- Compare archive file inventory by safe relative path, SHA-256, and byte size.
- Compare status, packet, closeout, and Evidence Index data after removing
  volatile timestamps and generated paths.
- Treat archive V1 Evidence Index as unavailable, not invalid.
- Add V15 docs, tests, command contract updates, and source skill guidance.

## Non-Goals

- No `workspace compare` in V15.
- No `workspace run`.
- No restore, replay, import, merge, promotion, sync, or apply.
- No watcher, scheduler, daemon, background worker, live adapter, or remote
  fetch.
- No AI judgment, code review verdict, or acceptance scoring.
- No live Workspace Session or branch diff input.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V15-FR-001 | Help shall list `diff`, `--left <archive-dir>`, and `--right <archive-dir>`. |
| V15-FR-002 | `diff` shall require both archive inputs and fail with stable source errors when missing or unreadable. |
| V15-FR-003 | `diff` shall verify each archive before comparison and fail with `DIFF_ARCHIVE_INVALID` when verification fails. |
| V15-FR-004 | `diff` shall emit JSON with `schemaVersion`, `diffVersion`, `left`, `right`, `summary`, `fileDeltas`, `statusDeltas`, `evidenceDeltas`, `packetDeltas`, and `closeoutDeltas`. |
| V15-FR-005 | File deltas shall classify safe relative paths as added, removed, changed, or unchanged using SHA-256 and byte size. |
| V15-FR-006 | Evidence deltas shall compare V2 Evidence Index artifacts and checks by stable keys. |
| V15-FR-007 | Archive V1 inputs shall keep diff usable and mark Evidence Index deltas as `incomparable`. |
| V15-FR-008 | Diff normalization shall ignore volatile timestamps, absolute roots, and generated paths. |
| V15-FR-009 | Diff shall be read-only and shall not mutate archive inputs, runtime roots, repos, or Workspace Base. |
| V15-FR-010 | Docs, tests, command contract, and the `bmad-workspace` source skill shall preserve manual-only guardrails. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- `npm ci && npm run quality` passes before push on the exact checkout.
