---
title: "Workspace Distro V2 PRD"
description: Session language and self-improvement packet kit requirements
---

# Workspace Distro V2 PRD

## Overview

V2 is the Session Language + Self-Improvement Packet Kit release. It makes the
Workspace Distro easier to use from Codex by exposing Workspace Session language,
BMAD Work Packet templates, and repo-owned skill packaging while preserving the
V1 lifecycle contract.

V2 does not add autonomous execution. It prepares reviewable improvement packets
and keeps Promotion explicit.

## Goals

- Prefer Workspace Session and BMAD Work Packet in public docs, CLI help,
  templates, and skill guidance.
- Preserve V1 compatibility for legacy fields, paths, and commands.
- Add `--session-id` as an additive alias for `--mission-id`.
- Emit `sessionId` and `sessionRoot` in public JSON output while preserving
  `missionId` and `missionRoot`.
- Provide minimal templates for Codex-guided base improvement.
- Make V2 progress auditable through acceptance tests, stories, test targets,
  and touched files.

## Non-Goals

- No `workspace run`.
- No live Codex executor.
- No live OpenClaw, Hermes, Context7, MCP, GitHub, or Graphify adapter work.
- No daemon, scheduler, watcher, memory graph, auto-apply, or auto-promotion.
- No deep internal rename from mission to session.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V2-FR-001 | CLI help shall use Workspace Session language. |
| V2-FR-002 | `workspace launch --session-id <id>` shall behave like the legacy deterministic id flag. |
| V2-FR-003 | Matching `--session-id` and `--mission-id` values shall succeed. |
| V2-FR-004 | Differing `--session-id` and `--mission-id` values shall fail with a stable conflict error. |
| V2-FR-005 | Public JSON command output shall include `sessionId` and `sessionRoot` aliases when legacy fields exist. |
| V2-FR-006 | V1 `missionId`, `missionRoot`, and packet file names shall remain valid in V2. |
| V2-FR-007 | Self-improvement templates shall validate required goal, grant, prompt, Work Packet, review, and traceability fields. |
| V2-FR-008 | The repo shall own the `bmad-workspace-distro` source skill. |
| V2-FR-009 | V2 traceability shall map acceptance IDs to stories, tests, and first code or artifact surfaces. |

## Compatibility Matrix

| Surface | V2 Preferred | V1 Compatibility |
| --- | --- | --- |
| Runtime name | Workspace Session | Mission Workspace in compatibility notes |
| Work artifact | BMAD Work Packet | `packets/bmad-mission-packet.json` file name |
| Deterministic id flag | `--session-id` | `--mission-id` |
| JSON id | `sessionId` | `missionId` |
| JSON root | `sessionRoot` | `missionRoot` |

## Success Criteria

- Focused workspace tests pass.
- Skill validation passes.
- V2 docs and templates avoid autonomous self-improvement claims.
- Grant Guard remains the only base mutation path.
- V2 can be referenced by commit id to check implementation progress.
