# Ubiquitous Language

## BMAD kernel

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **BMAD Kernel** | The durable source of truth for workflow routing, artifacts, gates, acceptance criteria, and review discipline. | Orchestrator, planner, brain |
| **BMAD Artifact** | A durable BMAD-owned document or record that justifies work and can be reviewed later. | Note, prompt, file |
| **BMAD Mission Packet** | A BMAD Artifact that packages one mission goal, evidence, constraints, acceptance criteria, and rendered executor prompt. | Prompt, task prompt, mission prompt |
| **BMAD Router** | The BMAD step that selects the smallest valid workflow path for the mission. | Help step, dispatcher |
| **Acceptance Criteria** | Observable conditions that prove a mission or artifact is complete. | Done list, checklist |
| **Implementation Readiness** | The BMAD gate that decides whether requirements, architecture, and stories are ready for execution. | Readiness check, IR |
| **Code Review** | The BMAD review path that inspects a diff for defects, bloat, regressions, and missing tests. | CR, review pass |

## Mission lifecycle

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Workspace Distro** | The durable BMAD-centered base that carries methodology, agents, skills, policies, adapters, settings, and secret references. | Base, toolchain repo, distro |
| **Mission Workspace** | A disposable runtime launched from a Workspace Distro for one bounded mission against selected repo inputs. | Instance, run, session |
| **Mission** | A bounded job with a goal, Repo Pack, grants, BMAD Mission Packet, and exit criteria. | Task, ticket, job |
| **Repo Pack** | The selected target repositories attached to a Mission Workspace. | Mounted repos, repo set |
| **Target Repo** | A repository in the Repo Pack that is allowed to receive mission changes. | External repo, project repo |
| **Repo Intake** | A code-only pre-prompt scan that produces evidence for a BMAD Mission Packet. | Context scan, indexing, graph |
| **Rendered Prompt** | The executor-ready prompt derived from a BMAD Mission Packet. | Source prompt, hand-written prompt |
| **Codex Executor** | The preferred operator that executes rendered prompts inside BMAD constraints. | Agent, worker, model |
| **Worktree Review** | A Git worktree and patch review surface for inspecting mission changes before Promotion. | GitHub Desktop diff, final diff |

## Authority and persistence

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Capability Contract** | A BMAD-governed registry of adapter capabilities available to a Mission Workspace. | Tool list, memory, provider map |
| **Grant** | An explicit permission record that names allowed capabilities, paths, repos, and persistence rights. | Permission, access, approval |
| **Base Mutation Grant** | A Grant that explicitly permits changes to the Workspace Distro. | Self-improvement permission, base write |
| **Base Improvement Mission** | A mission whose target is the Workspace Distro and whose writes require a Base Mutation Grant. | Self-improvement loop, system update |
| **Promotion** | The explicit integration of reviewed changes into the Workspace Distro. | Merge back, persist, learn |
| **Mission State** | Runtime data created inside a Mission Workspace that dies unless explicitly retained for review. | Memory, context, cache |
| **Standing Order** | A durable BMAD-owned rule stored in the Workspace Distro. | Persistent memory, instruction |
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

- A **Workspace Distro** creates zero or more **Mission Workspaces**.
- A **Mission Workspace** attaches one **Repo Pack** and produces one or more **BMAD Mission Packets**.
- A **BMAD Mission Packet** must include **Repo Intake** evidence before execution.
- A **Rendered Prompt** is derived from a **BMAD Mission Packet** and executed by the **Codex Executor**.
- A **Capability Contract** exposes one or more **Adapters** to a **Mission Workspace**.
- A normal **Mission** may change **Target Repos** but may not change the **Workspace Distro**.
- A **Base Improvement Mission** may change the **Workspace Distro** only through a **Base Mutation Grant**.
- **Promotion** requires a **Worktree Review** and must be explicit.
- **Mission State** dies with the **Mission Workspace** unless retained for **Worktree Review**.

## Example dialogue

> **Dev:** "Can this **Mission Workspace** remember a fix and improve future runs?"
> **Domain expert:** "Only if you start a **Base Improvement Mission**. A normal **Mission** writes the **Target Repo**, not the **Workspace Distro**."
> **Dev:** "So the **Rendered Prompt** is not the source of truth?"
> **Domain expert:** "Correct. The **BMAD Mission Packet** is the source of truth; the **Rendered Prompt** is derived for the **Codex Executor**."
> **Dev:** "Where do OpenClaw, Hermes, and Graphify fit?"
> **Domain expert:** "They are **Adapters** behind the **Capability Contract**. BMAD still owns routing, artifacts, gates, and review."
> **Dev:** "What proves a base change is valid?"
> **Domain expert:** "A **BMAD Artifact**, a **Base Mutation Grant**, and a **Worktree Review**."

## Flagged ambiguities

- "instance" can mean a chat, process, container, or workspace. Use **Mission Workspace** for the disposable launched runtime.
- "context" can mean graph evidence, chat history, prompt text, or persistent memory. Use **Repo Intake** for code evidence and **Mission State** for runtime residue.
- "prompt" can mean the planning artifact or executor text. Use **BMAD Mission Packet** for the source artifact and **Rendered Prompt** for executor text.
- "memory" can mean adapter storage, graph evidence, mission cache, or durable rules. Use **Mission State** for disposable data and **Standing Order** for durable rules.
- "self-improvement" can imply automatic base mutation. Use **Base Improvement Mission** and require a **Base Mutation Grant**.
- "promotion" can mean merging target repo changes or improving the base. Use **Promotion** only for explicit integration into the **Workspace Distro**.
