---
name: bmad-capability-refactor-plan
description: 'Plans safe best-practice refactors for plugin/capability implementation patterns using Forge artifacts and local evidence refs. Use when a capability needs an evidence-backed refactor plan before implementation.'
---

# Capability Best-Practice Refactor Plan

Template id: `capability-refactor-plan`

Capability Improvement Toolkit skill for planning safe best-practice refactors
around plugin or capability implementation patterns. This skill is
planning-only; it produces a refactor plan, evidence map, risk register, test
strategy, rollback notes, and non-goals.

It has no runtime authority. It makes no live tool calls, does not edit files,
does not run commands, does not commit, does not deploy, does not install
plugins, does not approve implementation, does not write `_bmad/custom`, and
does not grant Workspace, verifier, MCP, Forge, or plugin authority.

## Inputs

- Target plugin/capability:
- Forge draft artifacts or Forge request path:
- Local evidence refs:
- Current repo touchpoints:
- Desired outcome:
- Constraints:
- Non-goals:
- Best-practice evidence refs:
- Acceptance criteria:

## Execution

1. Confirm the target capability/plugin and local evidence refs exist. If core
   evidence is missing, output assumptions and questions instead of a plan.
2. Treat Capability Pack Forge artifacts as advisory drafts only.
3. Map the target to local capability registry or Workspace docs when available.
4. Compare current repo touchpoints with best-practice evidence for adapters,
   config, auth, schemas, CLI, docs, tests, and workflows.
5. Require a public behavior test first for any recommended implementation.
6. Identify the smallest green change that would satisfy the first test.
7. Record refactor after green notes only after the test path is clear.
8. Keep examples such as Outlook, Google Calendar, Docker, Git, PostgreSQL,
   Context7, Codex, and TOML as examples only; keep the plan capability-neutral.

## Output

### Objective

- Target:
- Desired outcome:
- Non-goals:

### Evidence Used

| Ref | Type | Relevance | Boundary |
| --- | --- | --- | --- |
| local evidence ref | Forge / docs / registry / test / other |  | advisory only |

### Current Behavior And Risks

| Risk | Evidence | Impact | Confidence |
| --- | --- | --- | --- |
|  |  |  | low/medium/high |

### Best-Practice Gaps

| Gap | Best-practice evidence | Affected touchpoint | Fix direction |
| --- | --- | --- | --- |
|  |  |  |  |

### Proposed Refactor Plan

| Phase | Change | Evidence | Safety boundary | Validation |
| --- | --- | --- | --- | --- |
| 1 |  |  | no implementation authority |  |

### TDD Plan

- Public behavior test first:
- Smallest green change:
- Refactor after green:
- Validation gates:

### Rollback And Safety

- Rollback path:
- User approval needed before implementation:
- Deferred live/runtime setup:

### Open Questions

- 

## Decision

- Recommendation: approve / revise / block
- Required evidence before implementation:
- Workspace or Self-Improve route:
- Deferred follow-up:
