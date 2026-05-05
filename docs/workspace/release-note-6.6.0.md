---
title: "BMAD Workspace Release Note 6.6.0"
description: Manual evidence-only release note for BMAD Workspace
---

# BMAD Workspace Release Note 6.6.0

BMAD Workspace 6.6.0 provides a manual, evidence-only Workspace Session CLI for
Codex-guided work. It records durable artifacts for BMAD Work Packets, Manual
Executor Contracts, Result Ledger entries, Worktree Review, Review Manifest
evidence, Manual Closeout, Evidence Index, archives, archive verification, and
archive diff inspection.

This release does not include a runtime execution engine, scheduler, watcher,
daemon, restore/replay/import/sync/apply behavior, merge, promotion,
live adapter activation, hidden subprocess orchestration, or automatic action
from stored Workspace evidence.

Review and push readiness require `npm ci && npm run quality` on the exact
checkout to be pushed.
