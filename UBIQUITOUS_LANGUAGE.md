# Ubiquitous Language

## BMAD kernel

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **BMAD Kernel** | The durable source of truth for workflow routing, artifacts, gates, acceptance criteria, and review discipline. | Orchestrator, planner, brain |
| **BMAD Artifact** | A durable BMAD-owned document or record that justifies work and can be reviewed later. | Note, prompt, file |
| **BMAD Work Packet** | A BMAD Artifact that packages one session goal, evidence, constraints, acceptance criteria, and rendered executor prompt. | Prompt, task prompt, mission prompt |
| **BMAD Router** | The BMAD step that selects the smallest valid workflow path for the session. | Help step, dispatcher |
| **Acceptance Criteria** | Observable conditions that prove a session or artifact is complete. | Done list, checklist |
| **Implementation Readiness** | The BMAD gate that decides whether requirements, architecture, and stories are ready for execution. | Readiness check, IR |
| **Code Review** | The BMAD review path that inspects a diff for defects, bloat, regressions, and missing tests. | CR, review pass |

## Session lifecycle

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **BMAD Workspace** | The durable BMAD-centered base that carries methodology, agents, skills, policies, adapters, settings, and secret references. | Base, toolchain repo, workspace |
| **Workspace Session** | A disposable runtime launched from a BMAD Workspace for one bounded goal against selected repo inputs. | Instance, run, Mission Workspace |
| **Session** | A bounded job with a goal, Repo Pack, grants, BMAD Work Packet, and exit criteria. | Mission, task, ticket, job |
| **Repo Pack** | The selected target repositories attached to a Workspace Session. | Mounted repos, repo set |
| **Target Repo** | A repository in the Repo Pack that is allowed to receive session changes. | External repo, project repo |
| **Repo Intake** | A code-only pre-prompt scan that produces evidence for a BMAD Work Packet. | Context scan, indexing, graph |
| **Rendered Prompt** | The executor-ready prompt derived from a BMAD Work Packet. | Source prompt, hand-written prompt |
| **Codex Executor** | The preferred operator that executes rendered prompts inside BMAD constraints. | Agent, worker, model |
| **Worktree Review** | A Git worktree and patch review surface for inspecting session changes before Promotion. | GitHub Desktop diff, final diff |

## Authority and persistence

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Capability Contract** | A BMAD-governed registry of adapter capabilities available to a Workspace Session. | Tool list, memory, provider map |
| **Grant** | An explicit permission record that names allowed capabilities, paths, repos, and persistence rights. | Permission, access, approval |
| **Base Mutation Grant** | A Grant that explicitly permits changes to the BMAD Workspace. | Self-improvement permission, base write |
| **Base Improvement Session** | A session whose target is the BMAD Workspace and whose writes require a Base Mutation Grant. | Self-improvement loop, Base Improvement Mission |
| **Promotion** | The explicit integration of reviewed changes into the BMAD Workspace. | Merge back, persist, learn |
| **Session State** | Runtime data created inside a Workspace Session that dies unless explicitly retained for review. | Memory, context, cache, Mission State |
| **Standing Order** | A durable BMAD-owned rule stored in the BMAD Workspace. | Persistent memory, instruction |
| **Drift** | Any durable change that lacks a BMAD Artifact, Grant, or Git diff proving why it exists. | Accidental mutation, residue |

## Adapter capabilities

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Adapter** | A concrete provider that satisfies a BMAD-owned capability interface. | Plugin, engine, integration |
| **Graph Evidence Adapter** | An Adapter that produces Repo Intake evidence, with Graphify as the first known provider. | Memory graph, context brain |
| **Runtime Adapter** | An Adapter that exposes sessions, tasks, Cron, Heartbeat, or goals without replacing BMAD governance. | Scheduler, daemon, runtime brain |
| **Documentation Evidence Adapter** | An Adapter that retrieves trusted current documentation only when freshness affects the mission. | Freshness crawler, doc memory |
| **Git Adapter** | An Adapter that provides worktrees, diffs, status, commits, provenance, and rollback evidence. | File sync, patch tool |

## Relationships

- A **BMAD Workspace** creates zero or more **Workspace Sessions**.
- A **Workspace Session** attaches one **Repo Pack** and produces one or more **BMAD Work Packets**.
- A **BMAD Work Packet** must include **Repo Intake** evidence before execution.
- A **Rendered Prompt** is derived from a **BMAD Work Packet** and executed by the **Codex Executor**.
- A **Capability Contract** exposes one or more **Adapters** to a **Workspace Session**.
- A normal **Session** may change **Target Repos** but may not change the **BMAD Workspace**.
- A **Base Improvement Session** may change the **BMAD Workspace** only through a **Base Mutation Grant**.
- **Promotion** requires a **Worktree Review** and must be explicit.
- **Session State** dies with the **Workspace Session** unless retained for **Worktree Review**.

## Example dialogue

> **Dev:** "Can this **Workspace Session** remember a fix and improve future runs?"
> **Domain expert:** "Only if you start a **Base Improvement Session**. A normal **Session** writes the **Target Repo**, not the **BMAD Workspace**."
> **Dev:** "So the **Rendered Prompt** is not the source of truth?"
> **Domain expert:** "Correct. The **BMAD Work Packet** is the source of truth; the **Rendered Prompt** is derived for the **Codex Executor**."
> **Dev:** "Where do OpenClaw, Hermes, and Graphify fit?"
> **Domain expert:** "They are **Adapters** behind the **Capability Contract**. BMAD still owns routing, artifacts, gates, and review."
> **Dev:** "What proves a base change is valid?"
> **Domain expert:** "A **BMAD Artifact**, a **Base Mutation Grant**, and a **Worktree Review**."

## Flagged ambiguities

- "instance" can mean a chat, process, container, or workspace. Use **Workspace Session** for the disposable launched runtime.
- "mission" is the V1 legacy public word. Use **Session** and **Workspace Session** in new public docs; keep mission only for compatibility notes, legacy JSON fields, and V1 internals.
- "context" can mean graph evidence, chat history, prompt text, or persistent memory. Use **Repo Intake** for code evidence and **Session State** for runtime residue.
- "prompt" can mean the planning artifact or executor text. Use **BMAD Work Packet** for the source artifact and **Rendered Prompt** for executor text.
- "memory" can mean adapter storage, graph evidence, session cache, or durable rules. Use **Session State** for disposable data and **Standing Order** for durable rules.
- "self-improvement" can imply automatic base mutation. Use **Base Improvement Session** and require a **Base Mutation Grant**.
- "promotion" can mean merging target repo changes or improving the base. Use **Promotion** only for explicit integration into the **BMAD Workspace**.
