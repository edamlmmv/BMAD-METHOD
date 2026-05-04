---
title: "BMAD Workspace V7 Traceability"
description: Progress tracking for portable Session archive and verification
---

# BMAD Workspace V7 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S55 V7 artifacts are traceable | Done | `docs/workspace/v7-traceability.md` | Acceptance mapping exists. |
| S56 Help lists archive commands | Done | `test/test-workspace-cli.js` | Help checks `archive`, `verify-archive`, and `--output`. |
| S57 Missing or invalid archive Session is loud | Done | `test/test-workspace-cli.js` | Missing/invalid Sessions fail without output. |
| S58 Valid Session archives | Done | `tools/workspace/archive.js` | Archive writes core evidence bundle. |
| S59 Archive includes review and packet artifacts | Done | `test/test-workspace-cli.js` | Packet and review artifacts are copied. |
| S60 Setup evidence stays referenced | Done | `test/test-workspace-cli.js` | Setup evidence files are not copied. |
| S61 Output collision is safe | Done | `test/test-workspace-cli.js` | Existing output fails with `ARCHIVE_OUTPUT_EXISTS`. |
| S62 Archive respects source boundary | Done | `test/test-workspace-cli.js` | Runtime and target fingerprints unchanged. |
| S63 Missing or malformed archive is loud | Done | `test/test-workspace-cli.js` | Missing/invalid manifest errors are stable. |
| S64 Clean archive verifies | Done | `test/test-workspace-cli.js` | Writer output verifies. |
| S65 Tampered archive fails | Done | `test/test-workspace-cli.js` | Checksum mismatch detected. |
| S66 Unsafe paths fail | Done | `test/test-workspace-cli.js` | Path traversal rejected. |
| S67 Verify is read-only | Done | `test/test-workspace-cli.js` | Archive fingerprint unchanged. |
| S68 Closeout captures blockers and route | Done | `tools/workspace/archive.js` | `closeout.md` records diagnostic state. |
| S69 Base Improvement archive avoids durable action wording | Done | `test/test-workspace-cli.js` | Closeout avoids Promotion wording. |
| S70 V7 docs exist | Done | `docs/workspace/v7-prd.md` | PRD, backlog, acceptance, traceability exist. |
| S71 Skill teaches archive | Done | `src/core-skills/bmad-workspace/SKILL.md` | Skill documents archive and verify. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT7-001 | E29 | S55, S70 | `test/test-workspace-contracts.js` | `docs/workspace/v7-traceability.md` |
| AT7-002 | E26 | S56 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT7-003 | E26 | S57 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-004 | E26 | S57 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-005 | E26 | S58, S59, S68 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-006 | E26 | S61 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-007 | E26 | S62 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-008 | E26 | S60 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-009 | E27 | S63 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-010 | E27 | S64 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-011 | E27 | S65 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-012 | E27 | S66 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-013 | E27 | S67 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-014 | E28 | S69 | `test/test-workspace-cli.js` | `tools/workspace/archive.js` |
| AT7-015 | E29 | S71 | `test/test-workspace-contracts.js` | `src/core-skills/bmad-workspace/SKILL.md` |
