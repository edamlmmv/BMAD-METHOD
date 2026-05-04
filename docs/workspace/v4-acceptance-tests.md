---
title: "BMAD Workspace V4 Acceptance Tests"
description: Acceptance tests for Session-first Setup Gate release
---

# BMAD Workspace V4 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT4-001 | Inspect `bmad workspace --help`. | Help omits `--mission-id` and lists Setup Gate refs. |
| AT4-002 | Launch Workspace Session. | Output has `sessionId/sessionRoot` and no legacy mission keys. |
| AT4-003 | Inspect runtime root. | Runtime artifacts are under `sessions/<sessionId>`. |
| AT4-004 | Run packet without setup refs after fresh intake. | Command fails with `missing-session-setup` and writes no packet. |
| AT4-005 | Run packet with all setup refs. | Packet has `kind: "bmad-work-packet"`, `packetVersion: 4`, and complete setup refs. |
| AT4-006 | Run packet with one skipped setup step. | Packet records skipped status and skip reason. |
| AT4-007 | Run packet with invalid setup skip. | Command fails with `invalid-session-setup-skip`. |
| AT4-008 | Validate V3 packet fixture. | Validator rejects legacy mission fields with `v3-workspace-artifact-unsupported`. |
| AT4-009 | Validate Matt Pocock vendor snapshots. | Manifest, license, source metadata, and checksums validate. |
| AT4-010 | Validate Base Improvement Session Kit. | New kit names validate and old self-improvement names are absent from runtime templates. |
| AT4-011 | Audit no-engine guardrail. | No Workspace run, scheduler, daemon, live adapter, hidden memory, or auto-promotion is added. |
