---
title: "BMAD Workspace V5 Traceability"
description: Progress tracking for read-only status and setup provenance
---

# BMAD Workspace V5 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S33 V4 traceability is closed | Done | `docs/workspace/v4-traceability.md` | V4 stories carry evidence. |
| S34 Help is version-neutral and lists status | Done | `test/test-workspace-cli.js` | Help lists `status`. |
| S35 Missing status is loud | Done | `test/test-workspace-cli.js` | Missing sessions fail with `SESSION_NOT_FOUND`. |
| S36 Session status is read-only | Done | `test/test-workspace-cli.js` | File tree fingerprint unchanged. |
| S37 Intake state is visible | Done | `test/test-workspace-cli.js` | Missing and stale intake checks exist. |
| S38 Packet/setup/review state is visible | Done | `tools/workspace/status.js` | Status reports packet, setup, review checks. |
| S39 Local setup refs are verified | Done | `tools/workspace/packet.js` | Local refs require files and `sha256`. |
| S40 External refs are opaque provenance | Done | `test/test-workspace-cli.js` | External refs are warning-only. |
| S41 Base Improvement readiness is diagnostic | Done | `test/test-workspace-cli.js` | Readiness reports review state only. |
| S42 V5 artifacts are traceable | Done | `docs/workspace/v5-traceability.md` | Acceptance mapping exists. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT5-001 | E17 | S33 | `test/test-workspace-contracts.js` | `docs/workspace/v4-traceability.md` |
| AT5-002 | E17 | S34 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT5-003 | E18 | S35 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT5-004 | E18 | S36 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT5-005 | E18 | S37 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT5-006 | E18 | S37 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT5-007 | E18 | S38 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT5-008 | E18 | S38 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT5-009 | E19 | S39 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT5-010 | E19 | S39 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT5-011 | E19 | S40 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT5-012 | E21 | S42 | `npm run validate:skills` | `src/core-skills/bmad-workspace/SKILL.md` |
| AT5-013 | E20 | S41 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT5-014 | E20 | S41 | `test/test-workspace-cli.js` | `tools/workspace/status.js` |
| AT5-015 | E21 | S42 | `test/test-workspace-contracts.js` | `docs/workspace/v5-traceability.md` |
