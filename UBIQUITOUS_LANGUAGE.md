# Ubiquitous Language

## BMAD workflow

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Fresh context** | A new agent session that runs the selected BMAD chain without inheriting unrelated thread baggage. | New chat, clean slate |
| **BMAD router** | The skill or step that decides which BMAD workflow should run next. | Help step, catalog lookup |
| **Quick Dev** | The BMAD implementation path for a small, single-goal existing-project change. | Dev flow, small fix workflow |
| **Code Review** | The BMAD review path that inspects the final diff for bugs, bloat, regressions, and missing tests. | CR, review pass |
| **Correct Course** | The BMAD correction path used only when PRD, epic, or sprint scope must change. | Course correction, scope repair |
| **Implementation Readiness** | The BMAD gate that checks whether PRD, architecture, and epics are ready for implementation. | IR, readiness check |
| **Prompt chain** | The ordered set of skills the next agent should run for the task. | Workflow list, skill stack |
| **Acceptance criteria** | The observable conditions that prove the prompt succeeded. | Done list, success checklist |

## Scope control

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Bloat** | Any change outside the smallest correct Office.js initialization hardening. | Cleanup extras, overwork |
| **Bloated reference** | The commit used only as evidence of prior over-scoped cleanup. | Target commit, source commit |
| **Minimal diff** | A final change limited to the smallest necessary files and behavior. | Small patch, narrow changes |
| **Scope guard** | A prompt constraint that rejects unrelated files, refactors, docs, config churn, and style churn. | Guardrail, constraint |
| **Version bump** | A package version update included only when already required by the release branch. | Release change, package bump |
| **Final diff** | The exact working-tree or commit changes reviewed after implementation. | Patch, changeset |

## Office readiness

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Office.js initialization hardening** | The smallest behavior change that makes Office readiness safe under concurrency and hung readiness. | Office cleanup, init refactor |
| **Office readiness** | The point at which Office.js reports the host environment is ready to use. | Office init, Office loaded |
| **Initialization boundary** | The public `OfficeService.initialize()` behavior that callers rely on. | Service core, init internals |
| **Concurrency guard** | The behavior that makes simultaneous initialization calls share one readiness attempt. | Lock, singleton promise |
| **Callback readiness path** | The `Office.onReady(callback)` path that signals readiness by invoking a callback. | Callback API |
| **Promise readiness path** | The `Office.onReady()` path that returns a promise resolving when Office is ready. | Promise API |
| **Hung readiness** | A readiness attempt that never resolves or invokes its callback. | Stalled init, frozen onReady |
| **Retry after timeout** | A new readiness attempt allowed after the previous one times out. | Recovery retry, init retry |
| **Focused initialization test** | A behavior test that exercises one Office readiness behavior through the public initialization boundary. | Unit test, init spec |

## Relationships

- A **Prompt chain** starts in a **Fresh context** and may begin with the **BMAD router** when routing needs confirmation.
- **Quick Dev** owns implementation; **Code Review** inspects the **Final diff** after implementation.
- **Correct Course** and **Implementation Readiness** are optional gates, not part of the default **Prompt chain**.
- **Office.js initialization hardening** changes only the **Initialization boundary** and its **Focused initialization test**.
- A **Concurrency guard** covers simultaneous calls to the **Initialization boundary**.
- A **Hung readiness** must lead to **Retry after timeout**, not permanent blocked initialization.
- A **Scope guard** prevents **Bloat** and protects the **Minimal diff**.

## Example dialogue

> **Dev:** "Should the **Prompt chain** run `to-prd` before **Quick Dev**?"
> **Domain expert:** "No. This is a **Minimal diff** task, so **Quick Dev** owns implementation in a **Fresh context**."
> **Dev:** "What if the prior **Bloated reference** includes docs and refactors?"
> **Domain expert:** "Treat those as **Bloat**. The **Scope guard** keeps only **Office.js initialization hardening**."
> **Dev:** "Which behavior proves the fix?"
> **Domain expert:** "A **Focused initialization test** must cover the **Concurrency guard**, both readiness paths, and **Retry after timeout** after **Hung readiness**."

## Flagged ambiguities

- "cleanup" could mean broad repository cleanup or the narrow **Office.js initialization hardening**. Use **Office.js initialization hardening** for this task.
- "reference" could mean a target state or evidence of prior bloat. Use **Bloated reference** and make clear it is not to be replayed wholesale.
- "CR" could mean generic review or the BMAD **Code Review** workflow. Use **Code Review** when naming the BMAD step.
- "init" could mean internal implementation details or public caller behavior. Use **Initialization boundary** for public behavior and avoid naming internals unless code requires it.
