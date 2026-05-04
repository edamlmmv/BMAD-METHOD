---
title: "BMAD Workspace V4 Backlog"
description: TDD-first backlog for Session-first Setup Gate release
---

# BMAD Workspace V4 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E13 Session-Only Runtime | Remove legacy mission aliases and runtime paths. | AT4-001 to AT4-003 | Migration command | Breaking scripts silently |
| E14 V4 Work Packet Contract | Add packet version and Setup Gate. | AT4-004 to AT4-008 | Setup quality scoring | Validation theater |
| E15 Vendor Setup Skills | Vendor Matt Pocock snapshots with provenance. | AT4-009 | Live updater | License drift |
| E16 Base Improvement Session Kit | Rename and validate improvement templates. | AT4-010, AT4-011 | Auto-promotion | Unsafe base mutation |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S25 | CLI is Session-only. | `--mission-id` succeeds or appears in help. | Remove legacy option and aliases. | AT4-001 |
| S26 | Runtime path is Session-only. | Launch writes `missions/<id>`. | Use `sessions/<sessionId>` for all commands. | AT4-002, AT4-003 |
| S27 | Packet file is canonical. | Packet writes `bmad-mission-packet.json`. | Write `bmad-work-packet.json`. | AT4-005 |
| S28 | V4 packet schema is enforced. | Validator accepts missing version or mission fields. | Require `kind`, `packetVersion: 4`, `sessionId`. | AT4-005, AT4-008 |
| S29 | Setup Gate blocks silent packets. | Packet succeeds without setup. | Require complete refs or skipped reasons. | AT4-004 to AT4-007 |
| S30 | Matt skill snapshots are pinned. | Missing vendor metadata passes. | Validate manifest, license, source, checksums. | AT4-009 |
| S31 | Base Improvement Session Kit is canonical. | Old self-improvement kit validates. | Rename templates and validator. | AT4-010, AT4-011 |
| S32 | V4 progress is traceable. | V4 acceptance IDs unmapped. | Add V4 traceability artifact. | AT4-001 to AT4-011 |

## TDD Order

1. Red `--mission-id`; green remove legacy option.
2. Red runtime `missions/`; green use `sessions/`.
3. Red public mission keys; green session-only JSON.
4. Red old packet file; green `bmad-work-packet.json`.
5. Red V3 packet accepted; green V4 schema rejection.
6. Red missing setup accepted; green `missing-session-setup`.
7. Red complete setup refs fail; green complete entries.
8. Red skipped setup unsupported; green skip reason.
9. Red vendor metadata missing; green snapshot validation.
10. Red old improvement kit validates; green Base Improvement Session kit.
11. Red traceability missing; green V4 mapping.

## Cut List

- migration command
- `workspace run`
- live adapter activation
- daemon, scheduler, watcher, hidden memory, auto-promotion
- setup artifact quality scoring
