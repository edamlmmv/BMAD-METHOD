---
title: "BMAD Workspace V2 Backlog"
description: TDD-first backlog for session language and self-improvement packet kit
---

# BMAD Workspace V2 Backlog

## V2 Boundary

V2 is an additive surface release. It adds Workspace Session language, BMAD Work
Packet templates, repo-owned skill packaging, and traceability. It preserves the
V1 lifecycle and does not introduce autonomous execution.

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E6 Boundary Language Contract | Add session aliases without breaking V1. | AT2-001 to AT2-005 | Internal deep rename | Two identities for one runtime |
| E7 BMAD Work Packet Template Kit | Provide validated base improvement templates. | AT2-010 to AT2-012 | Workflow engine | Paperwork not tied to tests |
| E8 Repo-Owned Codex Skill | Track the operation skill in source. | AT2-020 to AT2-022 | Installed copy sync engine | Skill drift |
| E9 V2 Traceability | Map progress to tests and files. | AT2-030, AT2-031 | Runtime dependency | Ceremonial docs |

## Stories

| Story | Outcome | Public Surface | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- | --- |
| S12 | Help and launch use session language. | `bmad workspace --help`, `workspace launch --session-id` | Help lacks `--session-id`. | CLI accepts alias and keeps V1 fields. | AT2-001, AT2-002 |
| S13 | Alias conflicts are explicit. | `workspace launch --session-id <a> --mission-id <b>` | Differing ids silently pick one. | Stable conflict error. | AT2-003, AT2-004 |
| S14 | JSON output is additive. | Workspace command output | `sessionId/sessionRoot` missing. | Aliases mirror legacy fields. | AT2-005 |
| S15 | Packet kit is validated. | `validateSelfImprovementPacketKit` | Missing kit passes. | Required files and fields checked. | AT2-010, AT2-011 |
| S16 | Packet kit forbids hidden execution. | Templates | Prompt omits no-run rule. | Templates name forbidden actions. | AT2-012 |
| S17 | Source skill is repo-owned. | `src/core-skills/bmad-workspace/SKILL.md` | Skill missing. | Skill exists and module help registers it. | AT2-020, AT2-021 |
| S18 | Skill validation remains green. | `npm run validate:skills` | New skill fails deterministic checks. | Skill frontmatter and body pass. | AT2-022 |
| S19 | V2 progress is traceable. | `v2-traceability.md` | Acceptance ids unmapped. | Matrix links acceptance, story, test, and file. | AT2-030, AT2-031 |

## TDD Order

1. Characterize V1 launch, packet, review, and destroy output.
2. Add `--session-id` red test.
3. Add matching and conflicting alias red tests.
4. Add additive JSON alias red tests.
5. Add packet kit validation red tests.
6. Add repo-owned skill red tests.
7. Add V2 traceability red tests.
8. Run focused tests and skill validation.

## Cut List

- `workspace run`
- live Codex execution
- live adapter integrations
- daemon, scheduler, watcher, or memory graph
- auto-apply or auto-promotion
- internal mission-to-session rename
