---
title: "BMAD Workspace V7 Backlog"
description: TDD-first backlog for portable Session archive and verification
---

# BMAD Workspace V7 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E26 Session Archive | Create portable evidence bundles. | AT7-002 to AT7-008 | Restore, repo snapshot | Hidden mutation |
| E27 Archive Verification | Verify bundle integrity. | AT7-009 to AT7-013 | Repair, fetch | False trust |
| E28 Closeout Diagnostics | Record human-readable closeout. | AT7-014 | Promotion action | Unsafe wording |
| E29 Docs and Skill | Teach V7 behavior. | AT7-001, AT7-015 | Broad rewrite | Traceability theater |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S55 | V7 artifacts are traceable. | V7 traceability missing. | Add V7 traceability and docs. | AT7-001 |
| S56 | Help lists archive commands. | Help lacks commands/options. | Add `archive`, `verify-archive`, `--output`. | AT7-002 |
| S57 | Missing or invalid archive Session is loud. | Archive writes partial output or vague error. | Fail with `SESSION_NOT_FOUND` or `SESSION_INVALID`. | AT7-003, AT7-004 |
| S58 | Valid Session archives. | Archive lacks core files. | Write evidence bundle. | AT7-005 |
| S59 | Archive includes review and packet artifacts. | Review or packet absent. | Copy allowlisted artifacts. | AT7-005 |
| S60 | Setup evidence stays referenced. | Setup evidence copied. | Preserve refs/checksums only. | AT7-008 |
| S61 | Output collision is safe. | Archive overwrites output. | Fail with `ARCHIVE_OUTPUT_EXISTS`. | AT7-006 |
| S62 | Archive respects source boundary. | Runtime or repo changes. | Write only archive output. | AT7-007 |
| S63 | Missing or malformed archive is loud. | Verify accepts bad archive. | Stable manifest errors. | AT7-009 |
| S64 | Clean archive verifies. | Writer output fails verify. | Verify checksums and shape. | AT7-010 |
| S65 | Tampered archive fails. | Changed payload passes. | Fail checksum mismatch. | AT7-011 |
| S66 | Unsafe paths fail. | Manifest traversal passes. | Fail unsafe path. | AT7-012 |
| S67 | Verify is read-only. | Verify mutates archive. | Read files only. | AT7-013 |
| S68 | Closeout captures blockers and route. | Closeout absent or vague. | Write diagnostic closeout. | AT7-005, AT7-014 |
| S69 | Base Improvement archive avoids durable action wording. | Closeout implies Promotion. | Diagnostic-only wording. | AT7-014 |
| S70 | V7 docs exist. | Docs absent. | Add PRD/backlog/acceptance. | AT7-001 |
| S71 | Skill teaches archive. | Skill lacks commands. | Update `bmad-workspace`. | AT7-015 |

## TDD Order

1. Add V7 traceability red checks.
2. Add help checks for `archive`, `verify-archive`, and `--output`.
3. Add verify missing/malformed archive tests.
4. Add archive missing/invalid Session tests.
5. Add archive valid Session bundle test.
6. Add mutation boundary and output collision tests.
7. Add verify round-trip, tamper, unsafe path, and read-only tests.
8. Add Base Improvement diagnostic archive test.
9. Update docs and skill.
