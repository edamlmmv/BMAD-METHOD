---
title: "BMAD Workspace V18 PRD"
description: Codex operator affordance and goal bridge requirements
---

# BMAD Workspace V18 PRD

## Overview

V18 adds a plan for Codex operator affordances: slash commands, goals, hooks,
subagents, plugins, and future Codex tools can help the human or Codex operator
execute BMAD work, but they do not become Workspace authority. The first
concrete affordance is `/goal`, treated as a bridge to Codex goal tracking and
BMAD evidence, not a second goal engine.

## Baseline

V17 consolidated Workspace documentation after the CLI, packet, result,
closeout, archive, diff, Evidence Index, and Review Manifest layers landed. The
remaining gap is ergonomic: Codex has useful operator features, but
`bmad-workspace` does not yet describe how they should be used without violating
the manual evidence-first contract.

## Goals

- Define a generic operator affordance model for Codex slash commands and tools.
- Treat `/goal` as the first affordance and bridge it to BMAD goal evidence.
- Use Codex `config.toml` as optional capability discovery, not durable
  authority.
- Keep future commands generic by declaring capability needs and evidence
  outputs.
- Add docs, source skill guidance, and tests that preserve no-hidden-execution
  guardrails.

## Non-Goals

- No `workspace run`.
- No Workspace slash-command execution engine.
- No hidden shell execution from slash commands.
- No automatic goal completion from command success.
- No scheduler, watcher, daemon, restore, replay, merge, promotion, or live
  adapter activation.
- No hard dependency on a user's `~/.codex/config.toml`.
- No plugin-specific command surface before a generic capability contract exists.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| V18-FR-001 | Workspace docs and source skill shall define Codex operator affordances as manual aids, not Workspace commands. |
| V18-FR-002 | `/goal` shall be documented as a Codex goal bridge that can link an active Codex goal to BMAD goal evidence. |
| V18-FR-003 | Future affordances shall declare name, required capability, inputs, evidence refs, and boundary. |
| V18-FR-004 | `config.toml` shall be treated as optional capability discovery for `goals`, `multi_agent`, `codex_hooks`, and generic plugin availability. |
| V18-FR-005 | Tests shall cover docs and source skill guidance for `/goal`, config capability discovery, and no-hidden-execution boundaries. |
| V18-FR-006 | Current Workspace CLI command contract shall remain unchanged unless a later implementation PRD adds explicit commands. |

## Success Criteria

- `npm run test:workspace` passes.
- `npm run validate:refs` passes.
- `npm run validate:skills` passes.
- V18 docs explain how Codex and BMAD Workspace coexist when the repo under
  work is BMAD-METHOD itself.
- The release checklist and source skill keep `/goal` as operator-assist-only.

