---
title: "BMAD Workspace V2 Acceptance Tests"
description: Acceptance tests for session language and self-improvement packet kit
---

# BMAD Workspace V2 Acceptance Tests

## Boundary Language Contract

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT2-001 | Inspect `bmad workspace --help`. | Help uses Workspace Session language and lists `--session-id`. |
| AT2-002 | Launch with `--session-id`. | Command exits zero and output has matching `sessionId` and `missionId`. |
| AT2-003 | Launch with matching `--session-id` and `--mission-id`. | Command exits zero and records one identity. |
| AT2-004 | Launch with differing session and legacy ids. | Command fails with `conflicting-session-id-and-mission-id`. |
| AT2-005 | Inspect command JSON output. | `sessionId/sessionRoot` mirror `missionId/missionRoot` where root exists. |

## Packet Kit

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT2-010 | Validate self-improvement templates. | Kit includes goal, grant, prompt, Work Packet, and review templates. |
| AT2-011 | Validate an incomplete kit. | Missing templates fail deterministic validation. |
| AT2-012 | Inspect prompt and templates. | They forbid workspace run, hidden execution, live adapters, and auto-promotion. |

## Source Skill

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT2-020 | Inspect source skills. | Repo owns `src/core-skills/bmad-workspace/SKILL.md`. |
| AT2-021 | Inspect module help. | Catalog registers `bmad-workspace`. |
| AT2-022 | Run skill validation. | Deterministic skill validation passes. |

## Traceability

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT2-030 | Inspect V2 traceability. | Acceptance IDs map to story, test target, and first code or artifact surface. |
| AT2-031 | Inspect V2 docs. | Legacy mission language appears only in compatibility contexts. |
