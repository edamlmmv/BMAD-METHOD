---
title: "BMAD Workspace V15 Release Readiness"
description: Maintainer checklist for the V15 read-only diff slice
---

# BMAD Workspace V15 Release Readiness

Use this checklist before pushing V15.

## Required Checks

- Run `npm ci` on the exact checkout.
- Run `npm run test:workspace`.
- Run `npm run validate:refs`.
- Run `npm run validate:skills`.
- Run `npm run quality`.
- Confirm `package-lock.json` exists and `yarn.lock` does not exist.
- Confirm `bmad workspace --help` lists `diff`, `--left`, and `--right`.
- Confirm `bmad workspace diff` emits JSON only.
- Confirm both archive inputs pass `bmad workspace verify-archive`.
- Confirm identical V2 archives report no changes.
- Confirm file content changes appear in `fileDeltas.changed`.
- Confirm added and removed files appear in `fileDeltas`.
- Confirm archive V2 inputs include `archiveVersion: 2` and
  `evidence-index.json`.
- Confirm archive V1 to V2 diff marks Evidence Index as `incomparable`.
- Confirm invalid archives fail with `DIFF_ARCHIVE_INVALID`.
- Confirm diff is read-only by comparing archive fingerprints before and after.
- Confirm Workspace docs, source skill, CLI help, and tests list the same command
  set.

## Forbidden Runtime Audit

V15 must not add or document any of these as current behavior:

- `workspace run`
- `workspace compare`
- scheduler, watcher, daemon, or background worker
- hidden execution or hidden state machine
- restore, replay, import, sync, or apply
- merge, promotion, or automatic target repo action
- live adapter activation
- remote fetch or pull
- automatic action from diff, result, review, closeout, handoff, archive, or
  evidence data

## Release Summary

V15 is ready when operators can compare two archive evidence bundles, inspect
stable JSON deltas, keep archive V1 compatibility, and still rely on the
manual-only Workspace boundary.
