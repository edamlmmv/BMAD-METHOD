---
title: 'BMAD Workspace Release Checklist'
description: Current validation checklist and historical release notes
---

# BMAD Workspace Release Checklist

Use this checklist before pushing Workspace changes.

## Required Checks

- Run `npm ci` on the exact checkout.
- Run `npm run test:workspace`.
- Run `npm run validate:refs`.
- Run `npm run validate:skills`.
- Run `npm run quality`.
- Confirm `package-lock.json` exists and `yarn.lock` does not exist.
- Treat lockfile mismatch as a release blocker unless a documented package
  manager policy explicitly allows both lockfiles.
- Confirm Workspace docs, source skill, CLI help, and tests list the same
  command set, options, and command classes.
- Review [Operator Readiness](./operator-readiness.md) as the readiness-gap closure path
  for Workspace/TOML/Graphify operator checks.
- Confirm `tools/workspace/command-registry.js` remains the source of truth for
  Workspace command metadata.
- Confirm docs navigation separates current guidance from historical delivery
  artifacts.
- Confirm runnable docs examples are tested or backed by captured output, and
  pseudo examples are marked `# PSEUDO`.

## Validator Owner And Manual Review Map

Durable trust claims need a validator owner or a manual-review note before a
Workspace release:

- Workspace Graph Evidence: owner is `npm run validate:graphify-manifests`
  plus `npm run test:workspace`; manual-review note checks source files remain
  authority and Graphify is not run live by Workspace.
- Route Trust And Advisory Evidence: owner is `npm run test:workspace`;
  manual-review note checks the static route registry remains authority and
  advisory evidence cannot create fuzzy, alias, fallback, or synthesized routes.
- Planning Capabilities: owner is
  `npm run validate:bmad-planning-capabilities`; manual-review note checks the
  registry stays closed and operator-invoked only.
- Capability Contract: owner is `npm run test:workspace`; manual-review note
  checks provider metadata grants no writes, route authority, live adapter
  activation, scheduler behavior, or base mutation.
- Git Worktree Review: owner is `npm run test:workspace`; manual-review note
  checks status and patch output stay manual review evidence only and cannot
  authorize push, reset, clean, merge, promotion, or hidden execution.
- Context7 Docs MCP: owner is `npm run test:workspace`; manual-review note
  checks Context7 remains optional docs evidence only, Apple Passwords item
  `Context7` is never read by repo automation, `CONTEXT7_API_KEY` values are
  redacted, and live Context7 config is not verifier input.
- Git Local MCP: owner is `npm run test:workspace`; manual-review note checks
  `mcp-server-git` add, commit, and branch tools stay manual/grant-gated,
  GitHub connector state stays separate, and local `git` CLI plus
  `npm ci && npm run quality` remains exact pre-push authority.
- PostgreSQL MCP: owner is `npm run test:workspace`; manual-review note checks
  `host.mcp.postgresql.readonly` stays optional/operator-provided, read-only
  database evidence stays out of verifier pass/fail, the secret boundary records
  only set/unset state, and `postgres-mcp-operator-evidence.json` keeps
  expected tools, allowed scope, denied writes, and evidence need explicit.
- Capability Verifier: owner is `npm run test:workspace`; manual-review note
  checks `ok: true` means declared-contract compatibility only and cannot
  replace Evidence Gate, Grant Guard, Self-Improve, install, or quality checks.
- Self-Improve Safety Loop: owner is
  `npm run validate:self-improve-invariants`; manual-review note checks
  continuation remains evidence-gated and cannot self-authorize hidden action.
- Exact Release Gate: owner is this checklist, `package.json`, and
  `.github/workflows/quality.yaml`; manual-review note checks the pre-push gate
  remains `npm ci && npm run quality` on the exact checkout being pushed.

## Current Workspace Assertions

- `bmad workspace review` writes `review/review-manifest.json`.
- Review Manifest includes `kind: bmad-workspace-review-manifest`.
- Status, Handoff, Evidence Index, Closeout, Archive, Verify Archive, and Diff
  preserve the current manual-evidence contract.
- New archives include `archiveVersion: 2` and `evidence-index.json`.
- Malformed Review Manifest fails with `ARCHIVE_REVIEW_MANIFEST_INVALID`.
- Invalid archives fail diff with `DIFF_ARCHIVE_INVALID`.
- `bmad workspace verify-archive <archive-dir>` validates archive bundles before
  manual review.
- `bmad workspace diff --left <archive-dir> --right <archive-dir>` rejects URL,
  live Session, and Git worktree sources with `DIFF_SOURCE_UNSUPPORTED`.
- Duplicate archive manifest file paths fail with `ARCHIVE_MANIFEST_INVALID`.
- Archive verification rejects tampered files, missing `evidence-index.json`,
  invalid executor contracts, invalid result artifacts, invalid closeout
  artifacts, invalid Review Manifest artifacts, and unsafe archive paths.
- Read-only commands leave Workspace Session artifacts unchanged.
- Destructive and grant-gated commands reject unsafe paths before target
  mutation.

## Release Note 6.6.0

BMAD Workspace 6.6.0 is a manual, evidence-only Workspace Session CLI. It
records BMAD Work Packets, Manual Executor Contracts, Result Ledger artifacts,
Worktree Review, Review Manifest evidence, Manual Closeout, Evidence Index,
archives, archive verification, and archive diffs. It does not provide a runtime
execution engine, scheduler, watcher, daemon, restore/replay/import/sync/apply,
merge, promotion, live adapter activation, hidden subprocess orchestration, or
automatic action from stored evidence.

## Forbidden Runtime Audit

Do not add or document any of these as current behavior:

- `workspace run`
- `workspace compare`
- scheduler, watcher, daemon, queue, webhook, or background worker
- hidden execution or hidden subprocess orchestration
- restore, replay, import, sync, or apply
- merge, promotion, or automatic target repo action
- live adapter activation
- remote fetch or pull
- semantic scoring or acceptance verdicts
- live Session, branch, URL, or working tree diff
- automatic action from diff, result, review, Review Manifest, closeout,
  handoff, archive, or evidence data

## History Boundary

Historical delivery notes are compiled under `docs/workspace/history/`. Current
docs, source skills, and behavior tests should use stable contract names instead
of Workspace release labels.
