---
title: "BMAD Workspace Operator Guide"
description: Manual operator sequence for Workspace Sessions
---

# BMAD Workspace Operator Guide

This guide describes the manual Workspace Session sequence. Commands either read
stored state or write explicit evidence artifacts. They never infer approval,
execute stored commands, restore state, replay evidence, merge, promote, or call
live adapters.

## Manual Flow

```bash
bmad workspace launch --repo <target-repo> --goal <goal-file> --runtime-root <root>
bmad workspace intake <session-id> --runtime-root <root>
bmad workspace packet <session-id> --runtime-root <root> --workflow <skill[:action]> \
  --zoom-out-ref <ref> --ubiquitous-language-ref <ref> \
  --grill-decisions-ref <ref> --tdd-plan-ref <ref>
bmad workspace status <session-id> --runtime-root <root>
bmad workspace evidence <session-id> --runtime-root <root>
bmad workspace handoff <session-id> --runtime-root <root>
bmad workspace result <session-id> --runtime-root <root> --input <result-json> --result-id <id>
bmad workspace review <session-id> --runtime-root <root>
bmad workspace closeout <session-id> --runtime-root <root> --input <closeout-json> --closeout-id <id>
bmad workspace archive <session-id> --runtime-root <root> --output <archive-dir>
bmad workspace verify-archive <archive-dir>
```

## Evidence Index

Use `evidence` when deciding what to inspect next. It reports artifact presence,
validation state, checksums, file sizes, source commands, and next manual
actions. Treat the output as evidence only, not permission to execute.

## Failure Handling

- Missing intake: run `intake`, then rebuild the packet.
- Missing packet: complete Setup Gate evidence and run `packet`.
- Stale intake or checksum drift: refresh evidence, then rebuild the packet.
- Missing review: run `review` before completed closeout.
- Invalid or secret-positive result or closeout: remove unsafe content manually
  and rerun `status` or `evidence`.
- Archive checksum mismatch: inspect the archive bundle and rerun
  `verify-archive`.
