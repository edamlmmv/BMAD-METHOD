---
title: "BMAD Workspace Release Checklist"
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
- Confirm Workspace docs, source skill, CLI help, and tests list the same
  command set.
- Confirm docs navigation separates current guidance from historical delivery
  artifacts.

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

Historical delivery notes live under `docs/workspace/history/`. Current docs,
source skills, and behavior tests should use stable contract names instead of
Workspace release labels.
