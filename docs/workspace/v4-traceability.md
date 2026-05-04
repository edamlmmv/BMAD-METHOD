---
title: "BMAD Workspace V4 Traceability"
description: Progress tracking for Session-first Setup Gate release
---

# BMAD Workspace V4 Traceability

## Story Status

| Story | Status | Evidence | Notes |
| --- | --- | --- | --- |
| S25 CLI is Session-only | Planned | `test/test-workspace-cli.js` | Help omits `--mission-id`. |
| S26 Runtime path is Session-only | Planned | `tools/workspace/` | Runtime uses `sessions/<sessionId>`. |
| S27 Packet file is canonical | Planned | `tools/workspace/packet.js` | Packet writes `bmad-work-packet.json`. |
| S28 V4 packet schema is enforced | Planned | `test/test-workspace-contracts.js` | Legacy fields fail. |
| S29 Setup Gate blocks silent packets | Planned | `test/test-workspace-cli.js` | Setup refs or skips required. |
| S30 Matt skill snapshots are pinned | Planned | `docs/workspace/vendor/mattpocock-skills/` | Manifest and checksums validate. |
| S31 Base Improvement Session Kit is canonical | Planned | `docs/workspace/templates/` | Self-improvement template names removed. |
| S32 V4 progress is traceable | Planned | `docs/workspace/v4-traceability.md` | Acceptance mapping exists. |

## Acceptance Mapping

| Acceptance | Epic | Story | Test Target | First Code Surface |
| --- | --- | --- | --- | --- |
| AT4-001 | E13 | S25 | `test/test-workspace-cli.js` | `tools/installer/commands/workspace.js` |
| AT4-002 | E13 | S26 | `test/test-workspace-cli.js` | `tools/workspace/launch.js` |
| AT4-003 | E13 | S26 | `test/test-workspace-cli.js` | `tools/workspace/launch.js` |
| AT4-004 | E14 | S29 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT4-005 | E14 | S27, S28, S29 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT4-006 | E14 | S29 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT4-007 | E14 | S29 | `test/test-workspace-cli.js` | `tools/workspace/packet.js` |
| AT4-008 | E14 | S28 | `test/test-workspace-contracts.js` | `tools/workspace/contracts.js` |
| AT4-009 | E15 | S30 | `test/test-workspace-contracts.js` | `tools/workspace/templates.js` |
| AT4-010 | E16 | S31 | `test/test-workspace-contracts.js` | `docs/workspace/templates/` |
| AT4-011 | E16 | S31 | `npm run validate:skills` | `src/core-skills/bmad-workspace/SKILL.md` |
