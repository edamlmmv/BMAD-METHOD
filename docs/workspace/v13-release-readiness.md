---
title: "BMAD Workspace V13 Release Readiness"
description: Maintainer checklist for the V13 Workspace release hardening slice
---

# BMAD Workspace V13 Release Readiness

Use this checklist before pushing V13.

## Required Checks

- Run `npm ci` on the exact checkout.
- Run `npm run test:workspace`.
- Run `npm run validate:refs`.
- Run `npm run validate:skills`.
- Run `npm run quality`.
- Confirm `.github/workflows/quality.yaml` includes URL tests and Workspace
  tests.
- Confirm `package-lock.json` exists and `yarn.lock` does not exist.
- Confirm Workspace docs, source skill, CLI help, and tests list the same command
  set.
- Confirm an archive created from a reviewed Session passes `bmad workspace
  verify-archive`.
- Confirm V13 docs include PRD, backlog, acceptance tests, traceability, command
  contract, and this release checklist.

## Forbidden Runtime Audit

V13 must not add or document any of these as current behavior:

- `workspace run`
- scheduler, watcher, daemon, or background worker
- hidden execution or hidden state machine
- restore, replay, or import
- merge, promotion, or automatic target repo action
- live adapter activation
- automatic action from result, review, closeout, handoff, or archive evidence

## Release Summary

V13 is ready when the current Workspace CLI is documented as a stable manual
contract, package-manager policy is npm-only, CI mirrors the local quality gate,
and all release-readiness checks pass.
