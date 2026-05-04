---
title: "BMAD Workspace V18 Traceability"
description: Traceability for Codex operator affordance planning
---

# BMAD Workspace V18 Traceability

## Story Trace

| Story | Status | Evidence | Acceptance |
| --- | --- | --- | --- |
| S155 V18 artifacts exist and link from history | Planned | `docs/workspace/history/v18-*.md`, `docs/workspace/history/index.md` | AT18-001 |
| S156 Command contract names operator affordances | Planned | `docs/workspace/command-contract.md` | AT18-002 |
| S157 Source skill teaches `/goal` boundary | Planned | `src/core-skills/bmad-workspace/SKILL.md` | AT18-003, AT18-009 |
| S158 `/goal` bridges Codex and BMAD evidence | Planned | `docs/workspace/history/v18-prd.md`, `docs/workspace/operator-guide.md` | AT18-004, AT18-005 |
| S159 Config use is capability discovery only | Planned | `docs/workspace/capability-contract.md`, `src/core-skills/bmad-workspace/SKILL.md` | AT18-006, AT18-007 |
| S160 Future commands stay generic | Planned | `docs/workspace/command-contract.md` | AT18-008 |
| S161 Guardrails remain explicit | Planned | `docs/workspace/guardrails.md`, `test/test-workspace-contracts.js` | AT18-009, AT18-010 |

## Acceptance Mapping

| Acceptance | Epic | Stories | Evidence |
| --- | --- | --- | --- |
| AT18-001 | E72 | S155 | `test/test-workspace-contracts.js` |
| AT18-002 | E73 | S156 | `test/test-workspace-contracts.js`, `docs/workspace/command-contract.md` |
| AT18-003 | E73 | S157 | `test/test-workspace-contracts.js`, `src/core-skills/bmad-workspace/SKILL.md` |
| AT18-004 | E74 | S158 | `docs/workspace/history/v18-prd.md` |
| AT18-005 | E74 | S158 | `docs/workspace/history/v18-backlog.md` |
| AT18-006 | E75 | S159 | `docs/workspace/capability-contract.md` |
| AT18-007 | E75 | S159 | `test/test-workspace-contracts.js` |
| AT18-008 | E76 | S160 | `docs/workspace/command-contract.md` |
| AT18-009 | E77 | S157, S161 | `docs/workspace/guardrails.md`, `src/core-skills/bmad-workspace/SKILL.md` |
| AT18-010 | E77 | S161 | `npm run test:workspace` |

