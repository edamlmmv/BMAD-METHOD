---
title: "BMAD Workspace V14 Release Readiness"
description: Maintainer checklist for the V14 Evidence Index slice
---

# BMAD Workspace V14 Release Readiness

Use this checklist before pushing V14.

## Required Checks

- Run `npm ci` on the exact checkout.
- Run `npm run test:workspace`.
- Run `npm run validate:refs`.
- Run `npm run validate:skills`.
- Run `npm run quality`.
- Confirm `package-lock.json` exists and `yarn.lock` does not exist.
- Confirm `bmad workspace --help` lists `evidence`.
- Confirm `bmad workspace evidence` is read-only and writes JSON.
- Confirm `handoff` includes `## Evidence Index`.
- Confirm new archives include `evidence-index.json` and `archiveVersion: 2`.
- Confirm `verify-archive` accepts both archive V1 and V2 bundles.
- Confirm Workspace docs, source skill, CLI help, and tests list the same command
  set.
- Confirm V14 docs include PRD, backlog, acceptance tests, traceability,
  operator guide, and this release checklist.

## Forbidden Runtime Audit

V14 must not add or document any of these as current behavior:

- `workspace run`
- scheduler, watcher, daemon, or background worker
- hidden execution or hidden state machine
- restore, replay, or import
- merge, promotion, or automatic target repo action
- live adapter activation
- automatic action from result, review, closeout, handoff, archive, or evidence
  data

## Release Summary

V14 is ready when operators can inspect Evidence Index output, see next manual
actions, archive evidence bundles with V2 manifests, verify V1 and V2 archives,
and still rely on the manual-only Workspace boundary.
