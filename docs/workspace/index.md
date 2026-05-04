---
title: "BMAD Workspace"
description: BMAD-centric product and architecture artifacts for portable workspaces
---

# BMAD Workspace

The BMAD Workspace is a portable base for launching disposable agentic
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
| [V2 PRD](./v2-prd.md) | Defines the session language and self-improvement packet kit release. |
| [V2 Acceptance Tests](./v2-acceptance-tests.md) | Lists behavior tests for the V2 surface upgrade. |
| [V2 Backlog](./v2-backlog.md) | Defines TDD-first epics and stories for V2. |
| [V2 Traceability](./v2-traceability.md) | Maps V2 acceptance tests to stories, tests, and files. |
| [V3 PRD](./v3-prd.md) | Defines the full Workspace rename release. |
| [V3 Acceptance Tests](./v3-acceptance-tests.md) | Lists behavior tests for removing old Workspace naming. |
| [V3 Backlog](./v3-backlog.md) | Defines TDD-first stories for V3 rename work. |
| [V3 Traceability](./v3-traceability.md) | Maps V3 acceptance tests to stories, tests, and files. |
| [V4 PRD](./v4-prd.md) | Defines Session-first Setup Gate and Base Improvement Session requirements. |
| [V4 Acceptance Tests](./v4-acceptance-tests.md) | Lists behavior tests for V4 setup and compatibility removal. |
| [V4 Backlog](./v4-backlog.md) | Defines TDD-first stories for V4. |
| [V4 Traceability](./v4-traceability.md) | Maps V4 acceptance tests to stories, tests, and files. |
| [V5 PRD](./v5-prd.md) | Defines read-only status and setup provenance hardening. |
| [V5 Acceptance Tests](./v5-acceptance-tests.md) | Lists behavior tests for V5 inspectability. |
| [V5 Backlog](./v5-backlog.md) | Defines TDD-first stories for V5. |
| [V5 Traceability](./v5-traceability.md) | Maps V5 acceptance tests to stories, tests, and files. |

## Doctrine

- BMAD is the kernel and truth source.
- Codex is the preferred executor.
- OpenClaw, Hermes, Graphify, Context7, Git, MCP, GitHub, and similar tools are
  adapters behind BMAD-owned interfaces.
- No normal Workspace Session mutates the BMAD Workspace.
- Base Improvement Session work requires an explicit Base Mutation Grant and Worktree
  Review before Promotion.
