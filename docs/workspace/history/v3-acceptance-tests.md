---
title: "BMAD Workspace V3 Acceptance Tests"
description: Acceptance tests for full Workspace rename
---

# BMAD Workspace V3 Acceptance Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AT3-001 | Inspect `bmad workspace --help`. | Help names BMAD Workspace and lists existing subcommands. |
| AT3-002 | Inspect source skills. | `bmad-workspace` exists and old Workspace skill source is absent. |
| AT3-003 | Inspect module help. | Catalog registers `bmad-workspace` with menu code `WS`. |
| AT3-004 | Run focused workspace tests. | Tests use renamed paths and pass. |
| AT3-005 | Inspect capability output. | Capability contract uses `workspaceVersion` and `workspace-base`. |
| AT3-006 | Inspect Grant Guard output. | Granted base writes report `workspace-base` scope. |
| AT3-007 | Inspect repo-tracked source/docs/tests. | Old Workspace naming is absent, excluding `.hermes.md`. |
