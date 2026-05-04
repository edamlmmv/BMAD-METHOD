---
title: "BMAD Workspace Distro"
description: BMAD-centric product and architecture artifacts for portable mission workspaces
---

# BMAD Workspace Distro

The BMAD Workspace Distro is a portable base for launching disposable agentic
workspaces against chosen repositories while keeping BMAD as the source of truth.

## Artifacts

| Artifact | Purpose |
| --- | --- |
| [Product Requirements](./prd.md) | Defines jobs, requirements, lifecycles, constraints, and success criteria. |
| [Architecture](./architecture.md) | Defines modules, boundaries, interfaces, storage, and adapter policy. |
| [Capability Contract](./capability-contract.md) | Sketches the BMAD-governed adapter registry. |
| [ADR Candidates](./adr-candidates.md) | Captures architecture decisions to promote into ADRs later. |
| [V1 Acceptance Tests](./v1-acceptance-tests.md) | Lists behavior tests for the first executable slice. |
| [V1 Implementation Backlog](./v1-implementation-backlog.md) | Defines TDD-first epics, stories, risks, and cut list. |
| [V1 Traceability](./v1-traceability.md) | Tracks story progress, acceptance mapping, and completion gates. |

## Doctrine

- BMAD is the kernel and truth source.
- Codex is the preferred executor.
- OpenClaw, Hermes, Graphify, Context7, Git, MCP, GitHub, and similar tools are
  adapters behind BMAD-owned interfaces.
- No normal mission mutates the Workspace Distro.
- Base self-improvement requires an explicit Base Mutation Grant and Worktree
  Review before Promotion.
