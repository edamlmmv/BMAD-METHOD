---
title: "Compiled BMAD Workspace History"
description: Consolidated historical planning record for Workspace delivery
---

# Compiled BMAD Workspace History

This archive replaces the scattered per-release BMAD planning files that previously lived in this folder. It keeps the durable release intent, goals, non-goals, acceptance anchors, and traceability markers without making current Workspace context load dozens of old PRD, backlog, acceptance, and traceability documents.

## Compilation Scope

- Source artifacts compiled: 67
- Release groups compiled: 20
- Compact entries compiled: 3
- Former artifact types: PRD, Backlog, Acceptance Tests, Traceability
- Current operator guidance remains in `docs/workspace/` root documents.

## Release Summaries

### V1

- Compiled artifacts: Implementation Backlog, Acceptance Tests, Traceability
- Implementation Backlog: TDD-first epics and stories for the BMAD Workspace V1 slice
- Acceptance Tests: Acceptance tests for the first BMAD Workspace implementation slice
- Traceability: Progress and completion tracking for the BMAD Workspace V1 backlog
- Story anchors: S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11
- Traceability markers: Evidence, First Code Surface, Test Target

### V2

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Session language and self-improvement packet kit requirements
- Backlog: TDD-first backlog for session language and self-improvement packet kit
- Acceptance Tests: Acceptance tests for session language and self-improvement packet kit
- Traceability: Progress tracking for session language and self-improvement packet kit
- Overview: V2 is the Session Language + Self-Improvement Packet Kit release. It makes the BMAD Workspace easier to use from Codex by exposing Workspace Session language, BMAD Work Packet templates, and repo-owned skill packaging while preserving the V1 lifecycle contract.
- Goals:
  - Prefer Workspace Session and BMAD Work Packet in public docs, CLI help,
  - Preserve V1 compatibility for legacy fields, paths, and commands.
  - Add `--session-id` as an additive alias for `--mission-id`.
  - Emit `sessionId` and `sessionRoot` in public JSON output while preserving
  - Provide minimal templates for Codex-guided base improvement.
  - Make V2 progress auditable through acceptance tests, stories, test targets,
- Non-goals:
  - No `workspace run`.
  - No live Codex executor.
  - No live OpenClaw, Hermes, Context7, MCP, GitHub, or Graphify adapter work.
  - No daemon, scheduler, watcher, memory graph, auto-apply, or auto-promotion.
  - No deep internal rename from mission to session.
- Acceptance anchors: AT2-001, AT2-005, AT2-010, AT2-012, AT2-020, AT2-022, AT2-030, AT2-031, AT2-002, AT2-003, AT2-004, AT2-011, AT2-021
- Story anchors: S12, S13, S14, S15, S16, S17, S18, S19
- Requirement anchors: V2-FR-001, V2-FR-002, V2-FR-003, V2-FR-004, V2-FR-005, V2-FR-006, V2-FR-007, V2-FR-008, V2-FR-009
- Traceability markers: Evidence, Test Target

### V3

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Full rename requirements for BMAD Workspace
- Backlog: TDD-first backlog for full Workspace rename
- Acceptance Tests: Acceptance tests for full Workspace rename
- Traceability: Progress tracking for full Workspace rename
- Overview: V3 removes the old Workspace naming from repo-tracked source, docs, tests, and skills. It does not add setup refs, autonomous execution, or Base Improvement Session workflow changes; those are deferred to V4.
- Goals:
  - Make `bmad-workspace` the only repo-owned Workspace skill.
  - Move Workspace source into `tools/workspace`.
  - Move Workspace docs into `docs/workspace`.
  - Move focused tests to `test/test-workspace-*.js`.
  - Replace old write-boundary tokens with `workspace-base`.
  - Keep V2 session alias behavior working.
- Non-goals:
  - No setup refs for zoom-out, ubiquitous language, grill decisions, or TDD.
  - No Base Improvement Session template redesign.
  - No `workspace run`.
  - No daemon, scheduler, watcher, live adapter, hidden memory, auto-apply, or
- Acceptance anchors: AT3-001, AT3-004, AT3-005, AT3-006, AT3-007, AT3-002, AT3-003
- Story anchors: S20, S21, S22, S23, S24
- Requirement anchors: V3-FR-001, V3-FR-002, V3-FR-003, V3-FR-004, V3-FR-005, V3-FR-006, V3-FR-007, V3-FR-008
- Traceability markers: Evidence, Test Target

### V4

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Session-first setup gate and Base Improvement Session requirements
- Backlog: TDD-first backlog for Session-first Setup Gate release
- Acceptance Tests: Acceptance tests for Session-first Setup Gate release
- Traceability: Progress tracking for Session-first Setup Gate release
- Overview: V4 makes BMAD Workspace Session-first, removes remaining V3 session compatibility aliases, adds a Minimal Explicit Setup Gate to every BMAD Work Packet, vendors Matt Pocock skill snapshots for stable setup references, and renames the improvement kit to Base Improvement Session.
- Goals:
  - Remove legacy mission fields, flags, runtime paths, and packet names from V4
  - Require `kind: "bmad-work-packet"` and `packetVersion: 4`.
  - Require Setup Gate entries for zoom-out, Ubiquitous Language, grill decisions,
  - Vendor Matt Pocock skill snapshots with source, license, checksum, date, and
  - Rename user-facing improvement templates to Base Improvement Session.
- Non-goals:
  - No migration command.
  - No `workspace run`.
  - No daemon, scheduler, watcher, live adapter, hidden memory, auto-apply, or
  - No quality scoring for setup artifacts.
- Acceptance anchors: AT4-001, AT4-003, AT4-004, AT4-008, AT4-009, AT4-010, AT4-011, AT4-002, AT4-005, AT4-007, AT4-006
- Story anchors: S25, S26, S27, S28, S29, S30, S31, S32
- Requirement anchors: V4-FR-001, V4-FR-002, V4-FR-003, V4-FR-004, V4-FR-005, V4-FR-006, V4-FR-007, V4-FR-008, V4-FR-009
- Traceability markers: Evidence, First Code Surface, Test Target

### V5

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Read-only Workspace status and setup provenance hardening
- Backlog: TDD-first backlog for read-only status and setup provenance
- Acceptance Tests: Acceptance tests for read-only status and setup provenance
- Traceability: Progress tracking for read-only status and setup provenance
- Overview: V5 makes BMAD Workspace Sessions inspectable without adding execution. The user can ask what state a Workspace Session is in, why it is blocked or stale, and whether Base Improvement evidence is ready for human review.
- Goals:
  - Add read-only `bmad workspace status <sessionId>`.
  - Harden Setup Gate refs with local checksums and opaque external provenance.
  - Report Base Improvement readiness as a deterministic checklist.
  - Close V4 traceability with evidence.
  - Keep BMAD Workspace free of run, daemon, scheduler, live adapter, hidden
- Non-goals:
  - No `workspace run`.
  - No network fetch for setup refs.
  - No automatic repair, resume, migration, promotion, or merge.
  - No readiness score or quality judgment.
- Acceptance anchors: AT5-001, AT5-002, AT5-003, AT5-008, AT5-009, AT5-012, AT5-013, AT5-014, AT5-015, AT5-004, AT5-005, AT5-006, AT5-007, AT5-010, AT5-011
- Story anchors: S33, S34, S35, S36, S37, S38, S39, S40, S41, S42
- Requirement anchors: V5-FR-001, V5-FR-002, V5-FR-003, V5-FR-004, V5-FR-005, V5-FR-006, V5-FR-007, V5-FR-008, V5-FR-009, V5-FR-010
- Traceability markers: Evidence, First Code Surface, Test Target

### V6

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Read-only Session inventory and Codex handoff
- Backlog: TDD-first backlog for Session inventory and Codex handoff
- Acceptance Tests: Acceptance tests for Session inventory and Codex handoff
- Traceability: Progress tracking for Session inventory and Codex handoff
- Overview: V6 helps users see which Workspace Sessions exist and copy exact context into Codex without changing runtime or durable state.
- Goals:
  - Add read-only `bmad workspace list`.
  - Add raw Markdown `bmad workspace handoff <sessionId>`.
  - Preserve BMAD Work Packet as source of truth.
  - Keep Session continuation explicit and user-driven.
- Non-goals:
  - No execution command.
  - No daemon, scheduler, watcher, hidden memory, or live adapter.
  - No repair, fetch, auto-apply, or durable state change.
  - No `latest`, `current`, fuzzy session lookup, or inferred session selection.
- Acceptance anchors: AT6-002, AT6-007, AT6-008, AT6-013, AT6-014, AT6-001, AT6-015, AT6-003, AT6-004, AT6-005, AT6-006, AT6-009, AT6-010, AT6-011, AT6-012
- Story anchors: S43, S44, S45, S46, S47, S48, S49, S50, S51, S52, S53, S54
- Requirement anchors: V6-FR-001, V6-FR-002, V6-FR-003, V6-FR-004, V6-FR-005, V6-FR-006, V6-FR-007, V6-FR-008, V6-FR-009, V6-FR-010
- Traceability markers: Evidence, First Code Surface, Test Target

### V7

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Portable Session archive and verification
- Backlog: TDD-first backlog for portable Session archive and verification
- Acceptance Tests: Acceptance tests for portable Session archive and verification
- Traceability: Progress tracking for portable Session archive and verification
- Overview: V7 preserves a Workspace Session as a portable evidence bundle. The archive is for inspection and handoff. It is not a backup, restore package, replay input, or Promotion artifact.
- Goals:
  - Add `bmad workspace archive <sessionId> --output <archive-dir>`.
  - Add `bmad workspace verify-archive <archive-dir>`.
  - Preserve known Session artifacts, status, handoff, and closeout guidance.
  - Verify archive shape and checksums without touching runtime or repos.
- Non-goals:
  - No restore, import, replay, or execution.
  - No daemon, scheduler, watcher, hidden memory, or live adapter.
  - No compression, encryption, signing, upload, or auto-promotion.
  - No target repo or Workspace Base content snapshot.
- Acceptance anchors: AT7-002, AT7-008, AT7-009, AT7-013, AT7-014, AT7-001, AT7-015, AT7-003, AT7-004, AT7-005, AT7-006, AT7-007, AT7-010, AT7-011, AT7-012
- Story anchors: S55, S56, S57, S58, S59, S60, S61, S62, S63, S64, S65, S66, S67, S68, S69, S70, S71
- Requirement anchors: V7-FR-001, V7-FR-002, V7-FR-003, V7-FR-004, V7-FR-005, V7-FR-006, V7-FR-007, V7-FR-008, V7-FR-009
- Traceability markers: Evidence, First Code Surface, Test Target

### V8

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Deterministic routing contract for BMAD Work Packets
- Backlog: TDD-first backlog for deterministic Workspace routing
- Acceptance Tests: Acceptance tests for the V8 routing contract
- Traceability: Progress tracking for deterministic Workspace routing
- Overview: V8 makes Workspace packet creation choose an explicit BMAD workflow through a deterministic routing contract. It prepares future execution by making the next manual workflow auditable, but it does not execute that workflow.
- Goals:
  - Add deterministic routing to newly generated BMAD Work Packets.
  - Add `--workflow <skill[:action]>` as an explicit override for packet routing.
  - Keep packet V4 compatibility while adding `routing.routingSchemaVersion: 1`.
  - Make status, handoff, and archive report route provenance when present.
- Non-goals:
  - No `workspace run`.
  - No daemon, scheduler, watcher, live adapter, restore, replay, or auto-promotion.
  - No LLM-driven route selection.
  - No deep Graphify evidence expansion.
- Acceptance anchors: AT8-002, AT8-006, AT8-003, AT8-004, AT8-007, AT8-008, AT8-009, AT8-011, AT8-001, AT8-012, AT8-005, AT8-010
- Story anchors: S72, S73, S74, S75, S76, S77, S78, S79, S80, S81, S82, S83
- Requirement anchors: V8-FR-001, V8-FR-002, V8-FR-003, V8-FR-004, V8-FR-005, V8-FR-006, V8-FR-007, V8-FR-008, V8-FR-009, V8-FR-010
- Traceability markers: Evidence, First Code Surface, Test Target

### V9

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Manual Result Ledger requirements
- Backlog: TDD-first backlog for manual Result Ledger
- Acceptance Tests: Acceptance tests for the manual Result Ledger
- Traceability: Progress tracking for manual Result Ledger
- Overview: V9 adds a manual Result Ledger for Workspace Sessions. It records human-run or externally-run execution outcomes as evidence artifacts before any Workspace executor exists.
- Goals:
  - Add `bmad workspace result <sessionId> --input <result-json>`.
  - Store append-only result artifacts under `results/<resultId>.json`.
  - Link each result to the BMAD Work Packet and stored route.
  - Capture outcomes, command records, evidence refs, and failure details.
  - Block high-confidence secrets before result persistence or archive exposure.
  - Surface result state in status, list, handoff, archive, and verify-archive.
- Non-goals:
  - No `workspace run`.
  - No command execution from result input.
  - No daemon, scheduler, watcher, live adapter, restore, replay, merge, or
  - No network secret service or external scanning provider.
- Acceptance anchors: AT9-003, AT9-005, AT9-007, AT9-008, AT9-001, AT9-006, AT9-009, AT9-011, AT9-012, AT9-002, AT9-004, AT9-010
- Story anchors: S84, S85, S86, S87, S88, S89, S90, S91, S92, S93
- Requirement anchors: V9-FR-001, V9-FR-002, V9-FR-003, V9-FR-004, V9-FR-005, V9-FR-006, V9-FR-007, V9-FR-008, V9-FR-009, V9-FR-010
- Traceability markers: Evidence, First Code Surface, Test Target

### V10

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Manual Executor Contract requirements
- Backlog: TDD-first backlog for Manual Executor Contract
- Acceptance Tests: Acceptance tests for Manual Executor Contract
- Traceability: Progress tracking for Manual Executor Contract
- Overview: V10 adds a Manual Executor Contract for Workspace Sessions. It makes the Codex execution boundary inspectable before manual work starts, without adding automatic execution.
- Goals:
  - Add `packets/executor-contract.json` to new BMAD Work Packet builds.
  - Record `executorContractRef` in new BMAD Work Packets.
  - Declare manual Codex execution mode, allowed write roots, forbidden actions,
  - Surface contract state in status, handoff, archive, and verify-archive.
  - Preserve legacy packets without the contract as warning-only evidence.
- Non-goals:
  - No `workspace run`.
  - No Codex invocation, shell execution, scheduler, watcher, daemon, or live
  - No restore, replay, merge, or automatic promotion behavior.
  - No multi-packet history; V10 keeps one active packet bundle per Session.
  - No Result Ledger interpretation beyond manual evidence recording.
- Acceptance anchors: AT10-002, AT10-003, AT10-010, AT10-001, AT10-004, AT10-005, AT10-009, AT10-011, AT10-007, AT10-008, AT10-006
- Story anchors: S94, S95, S96, S97, S98, S99, S100, S101, S102
- Requirement anchors: V10-FR-001, V10-FR-002, V10-FR-003, V10-FR-004, V10-FR-005, V10-FR-006, V10-FR-007, V10-FR-008, V10-FR-009, V10-FR-010
- Traceability markers: Evidence, First Code Surface, Test Target

### V11

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Manual closeout requirements for Workspace Sessions
- Backlog: TDD-first backlog for Manual Closeout
- Acceptance Tests: Acceptance tests for Manual Closeout
- Traceability: Progress tracking for Manual Closeout
- Overview: V11 adds a first-class Manual Closeout artifact for Workspace Sessions. It lets a human or Codex operator record the end-state decision for a Session after manual execution, results, and Worktree Review evidence exist. Closeout is evidence and guidance only; it does not execute, archive, destroy, merge, or promote anything.
- Goals:
  - Add a `closeout` Workspace command that records manual Session closeout data.
  - Store closeout artifacts under `closeout/<closeout-id>.json`.
  - Tie closeout to the active BMAD Work Packet, routing, Executor Contract, Result
  - Report closeout count and latest closeout in status, list, handoff, archive,
  - Keep missing closeout warning-only; invalid or secret-positive closeout
  - Preserve the manual-only boundary and avoid any durable action verbs that
- Non-goals:
  - No `workspace run`.
  - No command execution from closeout input.
  - No automatic archive, destroy, merge, promotion, or target repo action.
  - No acceptance scoring or quality judgment.
  - No restore, replay, import, scheduler, watcher, daemon, or live adapter.
  - No multi-closeout workflow engine; V11 only records and reports artifacts.
- Acceptance anchors: AT11-005, AT11-008, AT11-015, AT11-001, AT11-009, AT11-011, AT11-012, AT11-013, AT11-014, AT11-002, AT11-004, AT11-006, AT11-007, AT11-010, AT11-003
- Story anchors: S103, S104, S105, S106, S107, S108, S109, S110, S111, S112, S113
- Requirement anchors: V11-FR-001, V11-FR-002, V11-FR-003, V11-FR-004, V11-FR-005, V11-FR-006, V11-FR-007, V11-FR-008, V11-FR-009, V11-FR-010, V11-FR-011, V11-FR-012, V11-FR-013, V11-FR-014, V11-FR-015
- Traceability markers: Evidence, First Code Surface, Test Target

### V12

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Lifecycle closure and contract hardening requirements
- Backlog: TDD-first backlog for lifecycle closure and contract hardening
- Acceptance Tests: Acceptance tests for lifecycle closure and contract hardening
- Traceability: Progress tracking for lifecycle closure and contract hardening
- Overview: V12 turns the planned Manual Closeout slice into an executable, tested Workspace capability and tightens the lifecycle contract around the existing command set. The release closes the gap between V11 planning artifacts and the V1 to V10 implementation: operators can record a final manual Session decision, inspect it in read-only surfaces, and archive it as evidence without granting artifacts any runtime authority.
- Goals:
  - Add a `closeout` Workspace command that records manual Session closeout data.
  - Store closeout artifacts under `closeout/<closeout-id>.json`.
  - Validate closeout schema, safe ids, JSON-only input, secret scanning, allowed
  - Link closeout artifacts to the active BMAD Work Packet, routing, Executor
  - Surface closeout count, latest outcome, invalid closeout blockers, and derived
  - Document command boundaries as a derived state model, not a hidden workflow
  - Preserve the manual-only guardrail across code, tests, docs, and the
- Non-goals:
  - No `workspace run`.
  - No automatic closeout, archive, destroy, merge, promotion, restore, replay, or
  - No scheduler, watcher, daemon, background worker, or live adapter activation.
  - No acceptance scoring, quality judgment, approval workflow, or multi-closeout
  - No command that treats result, review, closeout, archive, or handoff evidence
  - No party-mode execution integration. Party mode may critique plans, but it does
- Acceptance anchors: AT12-001, AT12-010, AT12-011, AT12-013, AT12-014, AT12-015, AT12-016, AT12-017, AT12-018, AT12-008, AT12-009, AT12-002, AT12-005, AT12-006, AT12-007, AT12-012, AT12-003, AT12-004
- Story anchors: S114, S115, S116, S117, S118, S119, S120, S121, S122, S123, S124, S125
- Requirement anchors: V12-FR-001, V12-FR-002, V12-FR-003, V12-FR-004, V12-FR-005, V12-FR-006, V12-FR-007, V12-FR-008, V12-FR-009, V12-FR-010, V12-FR-011, V12-FR-012, V12-FR-013, V12-FR-014, V12-FR-015, V12-FR-016
- Traceability markers: Evidence, First Code Surface, Test Target

### V13

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Release readiness and contract freeze requirements
- Backlog: TDD-first backlog for release readiness and contract freeze
- Acceptance Tests: Acceptance tests for release readiness and contract freeze
- Traceability: Progress tracking for release readiness and contract freeze
- Overview: V13 makes the V12 Workspace CLI shippable as a coherent, documented, npm-clean feature. It freezes the public command contract, aligns architecture and index docs with current behavior, removes package-manager drift, and verifies that CI, tests, docs, and source skill guidance describe the same manual-only lifecycle.
- Goals:
  - Add V13 planning artifacts and traceability.
  - Align Workspace architecture and index docs with the V12/V13 lifecycle.
  - Add a stable command contract document for all current Workspace commands.
  - Add a release-readiness checklist for maintainers.
  - Remove package-manager ambiguity by keeping npm and `package-lock.json` as the
  - Align `.github/workflows/quality.yaml` with `npm run quality`.
  - Add deterministic tests for docs/source/test parity, command inventory, CI
- Non-goals:
  - No `workspace run`.
  - No automatic closeout, archive, destroy, merge, promotion, restore, replay, or
  - No scheduler, watcher, daemon, background worker, hidden execution, hidden
  - No new command names, JSON fields, runtime adapters, or output schema changes.
- Acceptance anchors: AT13-001, AT13-002, AT13-004, AT13-005, AT13-006, AT13-007, AT13-009, AT13-010, AT13-003, AT13-008
- Story anchors: S126, S127, S128, S129, S130, S131, S132, S133
- Requirement anchors: V13-FR-001, V13-FR-002, V13-FR-003, V13-FR-004, V13-FR-005, V13-FR-006, V13-FR-007
- Traceability markers: Evidence, Test Target

### V14

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Evidence Index and operator trust requirements
- Backlog: TDD-first backlog for Evidence Index and operator trust
- Acceptance Tests: Acceptance tests for Evidence Index and operator trust
- Traceability: Progress tracking for Evidence Index and operator trust
- Overview: V14 adds a read-only Evidence Index so operators can inspect Workspace Session artifacts, checksums, validation state, and next manual actions without expanding runtime authority. It also records `evidence-index.json` in new archive bundles for portable evidence review.
- Goals:
  - Add read-only `bmad workspace evidence`.
  - Add `nextManualAction` to status and evidence checks.
  - Include Evidence Index in new archive bundles.
  - Validate archive Evidence Index shape and checksum.
  - Add Evidence Index section to handoff.
  - Add V14 docs, traceability, tests, and release readiness checks.
- Non-goals:
  - No `workspace run`.
  - No hidden execution, scheduler, watcher, daemon, or background worker.
  - No restore, replay, import, merge, promotion, or automatic target repo action.
  - No live adapter activation.
  - No automatic action from result, review, closeout, handoff, archive, or
  - No `workspace diff` or `workspace compare` in V14.
- Acceptance anchors: AT14-001, AT14-002, AT14-005, AT14-006, AT14-009, AT14-010, AT14-011, AT14-012, AT14-003, AT14-004, AT14-007, AT14-008
- Story anchors: S134, S135, S136, S137, S138, S139, S140, S141
- Requirement anchors: V14-FR-001, V14-FR-002, V14-FR-003, V14-FR-004, V14-FR-005, V14-FR-006, V14-FR-007, V14-FR-008, V14-FR-009
- Traceability markers: Evidence, Test Target

### V15

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Read-only archive diff requirements
- Backlog: TDD-first backlog for read-only archive diff
- Acceptance Tests: Acceptance tests for read-only archive diff
- Traceability: Progress tracking for read-only archive diff
- Overview: V15 adds `bmad workspace diff`, a read-only archive comparison command for portable Workspace evidence bundles. It compares two verified archives and emits deterministic JSON so operators can see changed files, status, packet, closeout, and Evidence Index deltas before manual review.
- Goals:
  - Add JSON-only `bmad workspace diff --left <archive-dir> --right <archive-dir>`.
  - Verify both archive inputs before comparing.
  - Compare archive file inventory by safe relative path, SHA-256, and byte size.
  - Compare status, packet, closeout, and Evidence Index data after removing
  - Represent missing Evidence Index data as unavailable in diff output.
  - Add V15 docs, tests, command contract updates, and source skill guidance.
- Non-goals:
  - No `workspace compare` in V15.
  - No `workspace run`.
  - No restore, replay, import, merge, promotion, sync, or apply.
  - No watcher, scheduler, daemon, background worker, live adapter, or remote
  - No AI judgment, code review verdict, or acceptance scoring.
  - No live Workspace Session or branch diff input.
- Acceptance anchors: AT15-001, AT15-002, AT15-005, AT15-006, AT15-008, AT15-009, AT15-011, AT15-012, AT15-003, AT15-004, AT15-007, AT15-010
- Story anchors: S142, S143, S144, S145, S146, S147
- Requirement anchors: V15-FR-001, V15-FR-002, V15-FR-003, V15-FR-004, V15-FR-005, V15-FR-006, V15-FR-007, V15-FR-008, V15-FR-009, V15-FR-010
- Traceability markers: Evidence, Test Target

### V16

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Review Manifest and diff trust hardening requirements
- Backlog: TDD-first backlog for Review Manifest and diff trust hardening
- Acceptance Tests: Acceptance tests for Review Manifest and diff trust hardening
- Traceability: Progress tracking for Review Manifest and diff trust hardening
- Overview: V16 adds typed Review Manifest evidence to Worktree Review and hardens archive diff refusal behavior. The goal is to make review evidence portable, machine-readable, and explicit about what it inspected while keeping every Workspace boundary manual-only.
- Goals:
  - Add `review/review-manifest.json` when `bmad workspace review` runs.
  - Validate Review Manifest shape in status, evidence, archive, and
  - Surface Review Manifest state in handoff and Evidence Index.
  - Let Manual Closeout reference valid Review Manifest evidence.
  - Harden `bmad workspace diff` refusal paths for non-archive sources.
  - Add V16 docs, tests, command contract updates, and source skill guidance.
- Non-goals:
  - No `workspace run`.
  - No `workspace compare`.
  - No live Session, branch, working tree, URL, or adapter diff.
  - No semantic review verdict, acceptance score, or approval engine.
  - No automatic closeout, archive, destroy, merge, promotion, restore, replay, or
  - No scheduler, watcher, daemon, background worker, remote fetch, or live
- Acceptance anchors: AT16-001, AT16-002, AT16-006, AT16-007, AT16-008, AT16-009, AT16-010, AT16-011, AT16-012, AT16-003, AT16-004, AT16-005
- Story anchors: S148, S149, S150, S151, S152, S153, S154
- Requirement anchors: V16-FR-001, V16-FR-002, V16-FR-003, V16-FR-004, V16-FR-005, V16-FR-006, V16-FR-007, V16-FR-008, V16-FR-009, V16-FR-010
- Traceability markers: Evidence, Test Target

### V18

- Compiled artifacts: PRD, Backlog, Acceptance Tests, Traceability
- PRD: Codex operator affordance and goal bridge requirements
- Backlog: TDD-first backlog for Codex operator affordances
- Acceptance Tests: Acceptance tests for Codex operator affordance planning
- Traceability: Traceability for Codex operator affordance planning
- Overview: V18 adds a plan for Codex operator affordances: slash commands, goals, hooks, subagents, plugins, and future Codex tools can help the human or Codex operator execute BMAD work, but they do not become Workspace authority. The first concrete affordance is `/goal`, treated as a bridge to Codex goal tracking and BMAD evidence, not a second goal engine.
- Goals:
  - Define a generic operator affordance model for Codex slash commands and tools.
  - Treat `/goal` as the first affordance and bridge it to BMAD goal evidence.
  - Use Codex `config.toml` as optional capability discovery, not durable
  - Keep future commands generic by declaring capability needs and evidence
  - Add docs, source skill guidance, and tests that preserve no-hidden-execution
- Non-goals:
  - No `workspace run`.
  - No Workspace slash-command execution engine.
  - No hidden shell execution from slash commands.
  - No automatic goal completion from command success.
  - No scheduler, watcher, daemon, restore, replay, merge, promotion, or live
  - No hard dependency on a user's `~/.codex/config.toml`.
  - No plugin-specific command surface before a generic capability contract exists.
- Acceptance anchors: AT18-001, AT18-002, AT18-003, AT18-004, AT18-005, AT18-006, AT18-007, AT18-008, AT18-009, AT18-010
- Story anchors: S155, S156, S157, S158, S159, S160, S161
- Requirement anchors: V18-FR-001, V18-FR-002, V18-FR-003, V18-FR-004, V18-FR-005, V18-FR-006
- Traceability markers: Evidence

### V20

- Compiled artifacts: Compact Plan, Implementation, Contract Tests
- Compact Plan: Current Workspace packet, routing, executor, archive, and diff contracts
- Implementation: Current Workspace validators and renderers now assume only the current contract
- Contract Tests: Packet, archive, diff, status, handoff, docs, source skill, and guard scans cover removed compatibility paths
- Overview: V20 makes current Workspace behavior strict and explicit. A current BMAD Work Packet must carry routing and an Executor Contract reference, unknown packet fields fail, routing source validation is deterministic, missing executor contract state is invalid, archives must satisfy the current manifest contract, and archive diff compares verified bundles only.
- Goals:
  - Require current Work Packet routing and Executor Contract references before render, status, archive, handoff, result, or closeout flows.
  - Remove synthetic routing and executor readiness fallback states from current code paths.
  - Validate archive manifests at verify and diff boundaries.
  - Update current docs and source skill guidance so current Workspace artifacts are the canonical inputs.
  - Add regression tests and guard scans for removed Workspace contract terms outside history.
- Non-goals:
  - No migration tool.
  - No archive restore, replay, import, merge, promotion, scheduler, watcher, daemon, live adapter, or `workspace run`.
  - No removal of compiled history records.
- Acceptance anchors: strict-packet-current-contract, strict-routing-source, strict-executor-contract, strict-archive-version, strict-diff-archive-validation, removed-contract-guard
- Traceability markers: Evidence, Test Target

### V21

- Compiled artifacts: Compact Plan, Implementation, Contract Tests
- Compact Plan: Current archive manifest contract language and guard scan cleanup
- Implementation: Workspace archive validation now reports current manifest contract mismatches through `ARCHIVE_MANIFEST_INVALID`
- Contract Tests: CLI fixtures and contract scans cover invalid current-manifest handling without embedding phrase lists
- Overview: V21 keeps Workspace archive behavior focused on the current manifest contract. Current docs, source skill guidance, CLI tests, and history entries describe archive validation as current contract validation, and guard scans check for contract drift through current codes and manifest literals.
- Goals:
  - Keep `verify-archive` and `diff` guidance current-contract only.
  - Route manifest contract mismatches through `ARCHIVE_MANIFEST_INVALID`.
  - Keep invalid archive manifest tests neutral.
  - Make Workspace archive guard scans generic and compact.
  - Preserve the compiled history folder as the only Workspace history surface.
- Non-goals:
  - No command shape change.
  - No archive schema change.
  - No migration tooling.
  - No archive restore, replay, import, merge, promotion, scheduler, watcher, daemon, live adapter, or `workspace run`.
- Acceptance anchors: archive-current-contract-language, archive-manifest-invalid-error, archive-generic-contract-guard, compiled-history-only
- Traceability markers: Evidence, Test Target

### V22

- Compiled artifacts: Compact Plan, Implementation, Contract Tests
- Compact Plan: Prompt Builder removal from current BMAD Workspace operator prompts
- Implementation: The deprecated `bmad-prompt-builder` skill file, catalog row, and fresh-chat template references were removed while keeping the Workspace foundation files from the original commit
- Contract Tests: Skill validation, reference validation, docs build, Workspace contract tests, and full quality gates cover the current catalog and templates without Prompt Builder references
- Overview: V22 keeps BMAD Workspace fresh-chat routing on current supported skills. `bmad-help` remains the route selection entrypoint, and the removed Prompt Builder feature no longer appears in current skill catalogs or operator templates.
- Goals:
  - Remove `bmad-prompt-builder` from current source, catalog, and fresh-chat route options.
  - Keep `BMAD.md`, `bmad.config.yaml`, and `.hermes.md` as current Workspace foundation files.
  - Preserve no-live-reference checks for deleted prompt-builder surfaces.
  - Keep compiled history as the only Workspace history surface.
- Non-goals:
  - No full revert of the original Workspace foundation commit.
  - No new prompt-routing skill.
  - No command shape change.
  - No scheduler, watcher, daemon, restore, replay, merge, promotion, live adapter, or `workspace run`.
- Acceptance anchors: prompt-builder-surface-removed, workspace-foundation-preserved, current-template-routing, full-quality-green
- Traceability markers: Evidence, Test Target

## Old Artifact Removal

The individual per-release history files were removed after this archive was generated. Future history additions should prefer a compact compiled entry unless a detailed artifact is explicitly needed for review.
