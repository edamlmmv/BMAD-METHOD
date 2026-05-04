---
title: "BMAD Workspace V18 Backlog"
description: TDD-first backlog for Codex operator affordances
---

# BMAD Workspace V18 Backlog

## Epics

| Epic | Goal | Acceptance Tests | Non-Goals | Risk |
| --- | --- | --- | --- | --- |
| E72 V18 Planning | Create traceable V18 plan artifacts. | AT18-001 | Runtime implementation | Plan drifts from current contract |
| E73 Affordance Doctrine | Define slash commands as operator aids. | AT18-002 to AT18-003 | Workspace command engine | Slash commands imply authority |
| E74 Goal Bridge | Describe `/goal` use with BMAD evidence. | AT18-004 to AT18-005 | Duplicate goal store | Goal state splits |
| E75 Config Capability Discovery | Use `config.toml` as optional capability context. | AT18-006 to AT18-007 | User-config dependency | Tests depend on local machine |
| E76 Future Command Contract | Keep future commands generic. | AT18-008 | Plugin-specific flows | Adapter lock-in |
| E77 Guardrails | Preserve evidence-only boundaries. | AT18-009 to AT18-010 | Hidden automation | Scope creep |

## Stories

| Story | Outcome | Red Test | Green Target | Acceptance Mapping |
| --- | --- | --- | --- | --- |
| S155 | V18 artifacts exist and link. | V18 docs missing. | Add PRD, backlog, acceptance, traceability, and index row. | AT18-001 |
| S156 | Command contract names operator affordances. | `/goal` absent from contract. | Add Codex Operator Affordances section. | AT18-002 |
| S157 | Source skill teaches `/goal` boundary. | Skill implies only CLI commands exist. | Add affordance guidance and no-hidden-execution rule. | AT18-003, AT18-009 |
| S158 | `/goal` bridges Codex and BMAD evidence. | Goal guidance duplicates goal engine. | Document link, status, closeout, and evidence refs. | AT18-004, AT18-005 |
| S159 | Config use is capability discovery only. | Docs require local config. | Document optional `goals`, `multi_agent`, `codex_hooks`, plugins. | AT18-006, AT18-007 |
| S160 | Future commands stay generic. | Docs hard-code plugins. | Require name, capability, inputs, evidence refs, boundary. | AT18-008 |
| S161 | Guardrails remain explicit. | Slash command docs imply execution. | Assert no workspace run, hidden execution, restore, replay, merge, promotion. | AT18-009, AT18-010 |

## TDD Order

1. Add failing contract tests for V18 docs, `/goal`, config capability wording,
   and operator-assist-only boundaries.
2. Add V18 PRD, backlog, acceptance, and traceability docs.
3. Update command contract, capability contract, operator guide, guardrails, and
   source `bmad-workspace` skill.
4. Run `npm run test:workspace`.
5. Run `npm run validate:refs` and `npm run validate:skills`.
6. Before push, run `npm ci && npm run quality` on the exact checkout.

## Cut Line

V18 stops at doctrine, planning, source skill guidance, and deterministic tests.
Parser, ledger, and config fixture implementation should be a later PRD unless
the user explicitly asks to implement the slash-command layer now.

