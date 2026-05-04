---
title: "BMAD Workspace V4 PRD"
description: Session-first setup gate and Base Improvement Session requirements
---

# BMAD Workspace V4 PRD

## Overview

V4 makes BMAD Workspace Session-first, removes remaining V3 session
compatibility aliases, adds a Minimal Explicit Setup Gate to every BMAD Work
Packet, vendors Matt Pocock skill snapshots for stable setup references, and
renames the improvement kit to Base Improvement Session.

## Goals

- Remove legacy mission fields, flags, runtime paths, and packet names from V4
  runtime behavior.
- Require `kind: "bmad-work-packet"` and `packetVersion: 4`.
- Require Setup Gate entries for zoom-out, Ubiquitous Language, grill decisions,
  and TDD plan.
- Vendor Matt Pocock skill snapshots with source, license, checksum, date, and
  update metadata.
- Rename user-facing improvement templates to Base Improvement Session.

## Non-Goals

- No migration command.
- No `workspace run`.
- No daemon, scheduler, watcher, live adapter, hidden memory, auto-apply, or
  auto-promotion.
- No quality scoring for setup artifacts.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V4-FR-001 | CLI help shall omit `--mission-id` and expose Setup Gate packet options. |
| V4-FR-002 | Workspace runtime artifacts shall live under `sessions/<sessionId>`. |
| V4-FR-003 | Public JSON shall emit `sessionId/sessionRoot` only. |
| V4-FR-004 | Packet creation shall write `packets/bmad-work-packet.json`. |
| V4-FR-005 | BMAD Work Packet validation shall require `kind`, `packetVersion: 4`, `sessionId`, and `sessionSetup`. |
| V4-FR-006 | BMAD Work Packet validation shall reject V3 mission fields with `v3-workspace-artifact-unsupported`. |
| V4-FR-007 | Packet creation shall fail without complete or skipped Setup Gate entries. |
| V4-FR-008 | Vendor snapshot validation shall require manifest, license, source, and checksums. |
| V4-FR-009 | Base Improvement Session Kit shall validate under new names and require setup/TDD/review evidence. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:skills` passes.
- `npm run validate:refs` passes.
- Remaining legacy terms are limited to historical docs, migration notes, and
  negative tests.
