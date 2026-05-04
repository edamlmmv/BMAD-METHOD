---
title: "BMAD Workspace V16 Release Readiness"
description: Maintainer checklist for the V16 Review Manifest slice
---

# BMAD Workspace V16 Release Readiness

Use this checklist before pushing V16.

## Required Checks

- Run `npm ci` on the exact checkout.
- Run `npm run test:workspace`.
- Run `npm run validate:refs`.
- Run `npm run validate:skills`.
- Run `npm run quality`.
- Confirm `package-lock.json` exists and `yarn.lock` does not exist.
- Confirm `bmad workspace review` writes `review/review-manifest.json`.
- Confirm Review Manifest includes `kind: bmad-workspace-review-manifest`.
- Confirm Review Manifest includes forbidden execution, restore, replay, merge,
  promotion, scheduling, watching, fetching, live adapter, and hidden subprocess
  actions.
- Confirm `bmad workspace status` reports Review Manifest state.
- Confirm `bmad workspace evidence` includes Review Manifest artifact checksum.
- Confirm `bmad workspace closeout` references valid Review Manifest evidence.
- Confirm archives copy Review Manifest and `verify-archive` validates it.
- Confirm new archives still include `archiveVersion: 2` and
  `evidence-index.json`.
- Confirm malformed Review Manifest fails with
  `ARCHIVE_REVIEW_MANIFEST_INVALID`.
- Confirm invalid archives still fail diff with `DIFF_ARCHIVE_INVALID`.
- Confirm `bmad workspace diff` rejects URL and live Session sources with
  `DIFF_SOURCE_UNSUPPORTED`.
- Confirm `bmad workspace diff --left <archive-dir> --right <archive-dir>`
  remains archive-only and JSON-only.
- Confirm duplicate archive manifest file paths fail with
  `ARCHIVE_MANIFEST_INVALID`.
- Confirm Workspace docs, source skill, CLI help, and tests list the same command
  set.

## Forbidden Runtime Audit

V16 must not add or document any of these as current behavior:

- `workspace run`
- `workspace compare`
- scheduler, watcher, daemon, or background worker
- hidden execution or hidden state machine
- restore, replay, import, sync, or apply
- merge, promotion, or automatic target repo action
- live adapter activation
- remote fetch or pull
- semantic scoring or acceptance verdicts
- live Session, branch, URL, or working tree diff
- automatic action from diff, result, review, Review Manifest, closeout,
  handoff, archive, or evidence data

## Release Summary

V16 is ready when Worktree Review produces typed Review Manifest evidence,
archives preserve and validate it, diff rejects unsupported source classes, and
operators still rely on the manual-only Workspace boundary.
