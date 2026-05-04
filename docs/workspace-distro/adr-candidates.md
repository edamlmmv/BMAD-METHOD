---
title: "Workspace Distro ADR Candidates"
description: Candidate architecture decisions for the BMAD Workspace Distro
---

# Workspace Distro ADR Candidates

## ADR-001 BMAD Is The Kernel

**Status:** Candidate

**Decision:** Treat BMAD as the source of truth for workflow routing, artifacts,
gates, acceptance criteria, and review.

**Rationale:** The system is meant to make AI work repeatable through structured
BMAD artifacts, not through hidden prompt memory or provider-specific behavior.

**Consequences:**

- Codex executes BMAD Mission Packets.
- Adapters serve BMAD-owned interfaces.
- Durable changes require BMAD artifact evidence.

## ADR-002 Git Worktrees Are V1 Review Surface

**Status:** Candidate

**Decision:** Use Git worktrees, patches, and status output as the V1 review
surface.

**Rationale:** Worktrees are portable, inspectable in GitHub Desktop, and require
no custom UI.

**Consequences:**

- Mission changes are visible with ordinary Git tools.
- Custom review UI is deferred.
- Target repo cleanup remains familiar.

## ADR-003 Base Promotion Is Explicit-Only

**Status:** Candidate

**Decision:** Never promote mission learnings or changes into the Workspace
Distro automatically.

**Rationale:** Normal mission residue would corrupt portability and make future
behavior non-reproducible.

**Consequences:**

- Base Improvement Mission requires explicit Base Mutation Grant.
- Promotion must include BMAD artifact, grant, and Worktree Review.
- Reusable findings may be recorded as notes, but not applied.

## ADR-004 V1 Uses CLI And Filesystem Contract

**Status:** Candidate

**Decision:** Implement V1 around CLI commands, plain files, and Git worktrees;
do not require a daemon.

**Rationale:** The core risk is boundary correctness, not scheduling. Files are
easy to test, inspect, and discard.

**Consequences:**

- Scheduler activation is out of scope for V1.
- Tests can assert filesystem artifacts and Git state.
- Later OpenClaw or Hermes runtime use remains adapter-driven.

## ADR-005 Capability Contract Replaces Provider Prompt Lore

**Status:** Candidate

**Decision:** Expose adapter capabilities through a BMAD-governed Capability
Contract rather than requiring prompts to name provider details.

**Rationale:** Users should not have to know whether OpenClaw, Hermes, Graphify,
Context7, or another provider supplies a capability.

**Consequences:**

- Rendered prompts stay BMAD-centered.
- Providers can be swapped behind stable capability names.
- Missing capabilities become explicit BMAD gaps.

## ADR-006 Repo Intake Precedes Mission Packet

**Status:** Candidate

**Decision:** Require current Repo Intake before creating a BMAD Mission Packet.

**Rationale:** The mission artifact should be grounded in the selected repo
state, not stale chat context.

**Consequences:**

- Stale intake blocks packet creation.
- Intake provenance becomes part of review evidence.
- Graph Evidence Adapter remains evidence provider, not memory brain.
