---
title: "BMAD Workspace V5 Backlog"
description: TDD-first backlog for read-only status and setup provenance
---

# BMAD Workspace V5 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E17 V4 Closeout | Close V4 evidence and remove branch noise. | AT5-001, AT5-002 | History rewrite | Traceability theater |
| E18 Session Status | Add read-only status command. | AT5-003 to AT5-008 | Run/resume/latest | Hidden engine |
| E19 Setup Provenance | Harden Setup Gate refs. | AT5-009 to AT5-012 | Network ref validation | False trust |
| E20 Base Readiness | Report Base Improvement review readiness. | AT5-013, AT5-014 | Promotion command | Unsafe base mutation |
| E21 Docs and Skill | Document V5 behavior and skill usage. | AT5-015 | Broad rewrite | Naming drift |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S33 | V4 traceability is closed. | V4 story rows still say `Planned`. | Mark Done with commit/test evidence. | AT5-001 |
| S34 | Help is version-neutral and lists status. | Help says `V4 workspace subcommands`. | Add `status`; remove version label. | AT5-002 |
| S35 | Missing status is loud. | `workspace status missing` is unknown or vague. | Return `SESSION_NOT_FOUND`. | AT5-003 |
| S36 | Session status is read-only. | Status writes or mutates session files. | Read artifacts only. | AT5-004 |
| S37 | Intake state is visible. | Launch-only/stale sessions lack blockers. | Report missing/stale intake checks. | AT5-005, AT5-006 |
| S38 | Packet/setup/review state is visible. | Status crashes on missing or malformed packet. | Report packet/setup/review checks. | AT5-007, AT5-008 |
| S39 | Local setup refs are verified. | Packet accepts missing local refs or lacks checksums. | Require file refs and record `sha256`. | AT5-009, AT5-010 |
| S40 | External refs are opaque provenance. | External ref fetches or blocks readiness. | Warning-only `external-unverified`. | AT5-011 |
| S41 | Base Improvement readiness is diagnostic. | Readiness absent or implies promotion. | Report checklist only. | AT5-013, AT5-014 |
| S42 | V5 artifacts are traceable. | V5 docs/skill absent. | Add V5 docs, skill update, traceability. | AT5-015 |

## TDD Order

1. Close V4 traceability.
2. Make help version-neutral and list `status`.
3. Add missing-session status failure.
4. Add launch-only read-only status.
5. Add stale intake status.
6. Add local setup ref missing failure.
7. Add setup checksum metadata and mismatch status.
8. Add opaque external setup warning.
9. Add packet/setup/review status checks.
10. Add Base Improvement readiness.
11. Add V5 docs, skill text, traceability.

## Cut List

- `workspace run`
- daemon, scheduler, watcher, live adapter, hidden memory
- network fetch for external refs
- readiness scoring
- migration or Promotion command
