---
title: 'Tool Documentation Slash Command Template'
description: Operator-assist template for documenting one tool capability
---

# Tool Documentation Slash Command Template

## Command

`/bmad-tool-doc`

## Purpose

Create Workspace-aware documentation for one tool surface. The command helps an
operator gather sources, classify trust boundaries, choose or defer a Capability
Request fixture, and plan readiness evidence.

## Inputs

```yaml
tool_name: '<tool name>'
tool_surface: '<cli | mcp | plugin | app | docs | api | other>'
official_docs:
  - '<official docs link or local source ref>'
local_probe_commands:
  - '<non-mutating command only>'
capability_id: '<declared capability id or none>'
output_doc: '<target documentation path>'
```

## Required Output

- Source register with official docs, local docs, and observed local tool facts.
- Trust boundary explaining what the tool can inform and what it cannot prove.
- Capability fixture choice: existing fixture, new fixture, or explicit defer.
- Implementation-readiness checklist for the target workflow or skill.
- Manual evidence plan for Workspace Result, Review Manifest, Closeout, or
  archive refs.

## Boundary

This slash command is an operator aid only. It is not a Workspace command,
Capability Verifier input, approval, scheduler, watcher, hidden executor,
runtime permission, grant authority, restore input, replay input, merge trigger,
promotion trigger, or live adapter activation.

## Procedure

1. Read existing Workspace capability docs and profile registry.
2. Prefer official documentation and committed local source over live probes.
3. Run only non-mutating local probes when needed for manual evidence context.
4. Keep capability requests self-contained JSON when a declared capability
   exists.
5. Record live or local observations as manual evidence, never verifier truth.
6. Write `output_doc` with source refs, boundary, fixture decision, readiness
   checklist, and test plan.
