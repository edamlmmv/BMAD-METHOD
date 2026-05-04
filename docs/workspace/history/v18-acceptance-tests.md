---
title: "BMAD Workspace V18 Acceptance Tests"
description: Acceptance tests for Codex operator affordance planning
---

# BMAD Workspace V18 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT18-001 | Inspect history index. | V18 PRD, backlog, acceptance, and traceability are linked. |
| AT18-002 | Inspect command contract. | It defines Codex operator affordances and names `/goal`. |
| AT18-003 | Inspect source `bmad-workspace` skill. | It teaches `/goal` as operator-assist-only, not a Workspace command. |
| AT18-004 | Inspect V18 PRD. | `/goal` is a bridge to Codex goal evidence, not a second goal engine. |
| AT18-005 | Inspect V18 backlog. | Goal bridge work requires evidence refs and closeout boundaries. |
| AT18-006 | Inspect docs and skill. | `config.toml` is optional capability discovery, not authority. |
| AT18-007 | Inspect tests. | Tests do not depend on the operator's local `~/.codex/config.toml`. |
| AT18-008 | Inspect command contract. | Future commands are generic capability declarations. |
| AT18-009 | Inspect guardrails. | Slash commands do not imply hidden execution or live adapters. |
| AT18-010 | Run `npm run test:workspace`. | Workspace contract tests pass. |

