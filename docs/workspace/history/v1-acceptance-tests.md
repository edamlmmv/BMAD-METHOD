---
title: "BMAD Workspace V1 Acceptance Tests"
description: Acceptance tests for the first BMAD Workspace implementation slice
---

# BMAD Workspace V1 Acceptance Tests

## Launch

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT-001 | Launch normal mission with one target repo. | Mission Workspace exists with `instance.json`, `repo-pack.json`, grants, and repo worktree. |
| AT-002 | Launch normal mission with multiple target repos. | Repo Pack records each repo, branch, HEAD, and worktree path. |
| AT-003 | Launch normal mission. | BMAD Workspace has no new or modified files. |

## Repo Intake

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT-010 | Run intake after launch. | `repo-intake.json`, `provenance.json`, and graph reference are written under mission intake. |
| AT-011 | Create packet without intake. | Command fails with missing-intake error. |
| AT-012 | Change target repo after intake, then create packet. | Command fails with stale-intake error. |
| AT-013 | Re-run intake after repo change. | Provenance records new HEAD and packet creation can proceed. |

## BMAD Mission Packet

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT-020 | Create packet from goal and current intake. | Packet includes goal, evidence refs, constraints, grants, acceptance criteria, capability contract ref, and rendered prompt ref. |
| AT-021 | Inspect rendered prompt. | Prompt is derived from packet content and does not become source of truth. |
| AT-022 | Packet lacks acceptance criteria. | Packet validation fails. |

## Capability Contract

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT-030 | Mission requests repo evidence. | Capability resolves to Graph Evidence Adapter without provider-specific prompt text. |
| AT-031 | Mission requests base write without Base Mutation Grant. | Grant Guard blocks capability use. |
| AT-032 | Proposed adapter duplicates scheduler or memory engine. | Architecture check requires upstream-gap proof. |

## Execution

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT-040 | Run normal mission with Codex Executor. | Writes are limited to target repo worktree and mission runtime paths. |
| AT-041 | Executor attempts BMAD Workspace write during normal mission. | Run stops and records Grant Guard violation. |
| AT-042 | Executor fails before completion. | Result and transcript artifacts are still written for review. |

## Worktree Review

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT-050 | Review after target repo changes. | Review emits per-repo status, changed files, and patch. |
| AT-051 | Review after no changes. | Review reports clean worktrees and no patch. |
| AT-052 | Open worktree in GitHub Desktop. | Changes are visible through ordinary Git worktree state. |

## Base Improvement

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT-060 | Launch Base Improvement Mission without Base Mutation Grant. | Launch or packet creation fails. |
| AT-061 | Launch Base Improvement Mission with grant. | BMAD Workspace worktree is created on a dedicated branch. |
| AT-062 | Base Improvement Mission writes outside granted paths. | Grant Guard blocks write and records violation. |
| AT-063 | Promote base change. | Promotion requires BMAD artifact, grant, Worktree Review, and explicit user action. |

## Destroy

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT-070 | Destroy normal Mission Workspace without `--keep-review`. | Runtime state is removed; target repo commits or worktree changes are not deleted unexpectedly. |
| AT-071 | Destroy with `--keep-review`. | Review artifacts remain at declared retention path. |
| AT-072 | Destroy after failed run. | Failure result remains if review retention is requested. |
