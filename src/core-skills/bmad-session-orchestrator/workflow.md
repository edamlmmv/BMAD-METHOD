# Session Orchestrator Workflow

This workflow reads workspace state (sprint status, memory sidecars, output artifacts) and recommends which BMAD skills to run as parallel agent sessions. It supports the VS Code Agents app model where each session runs in an isolated worktree, but also works with multiple Copilot Chat tabs, terminal sessions, or any other multi-session setup.

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` (if it exists) or `{project-root}/_bmad/core/config.yaml` and resolve:

- `project_name`, `user_name`, `communication_language`
- `implementation_artifacts`, `planning_artifacts`, `output_folder`
- `date` as system-generated current datetime

### State Loading

| Source | Path | Purpose |
|--------|------|---------|
| Sprint status | `{implementation_artifacts}/sprint-status.yaml` | Story positions and recommendations |
| Memory sidecars | `_bmad/_memory/*/` | Active session state from previous orchestrations |
| Discovery contexts | `{output_folder}/discovery-context-*.md` | In-progress or completed discovery sessions |
| Help catalog | `{project-root}/_bmad/_config/bmad-help.csv` | Available skills for session routing |

If sprint-status.yaml does not exist, the orchestrator operates in discovery-only mode (recommend discovery-rigor sessions based on workspace evidence).

## EXECUTION

### Step 1: Build the Session Dashboard

Scan all state sources and produce a compact dashboard:

```
📋 Session Dashboard — {project_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stories:
  🟢 in-progress: [list with story keys]
  🔵 ready-for-dev: [list with story keys]
  🟡 review: [list with story keys]
  ⚪ backlog: [count]
  ✅ done: [count]

Discovery Sessions:
  [list of discovery-context-*.md files with sessionTag, status, lastStep]

Active Memory:
  [list of *-sidecar/ directories with last-modified dates]
```

### Step 2: Identify Parallelizable Work

Apply these rules to recommend parallel sessions:

| Rule | Condition | Recommendation |
|------|-----------|----------------|
| P1 | Multiple `ready-for-dev` stories exist | Each can run as a parallel `bmad-dev-story` session if they touch different files |
| P2 | One story is `in-progress`, another is `ready-for-dev` | Continue the active story in one session, start the next in parallel |
| P3 | A story is `review` and another is `ready-for-dev` | Run `bmad-code-review` and `bmad-dev-story` in parallel |
| P4 | No stories exist but planning artifacts are incomplete | Run discovery-rigor, create-prd, or create-architecture in parallel on different topics |
| P5 | A discovery session is `complete` with a handoff recommendation | Recommend launching the downstream skill as a new session |

**Conflict detection:** Two sessions conflict if they would write to the same output file. Flag conflicts and recommend sequencing instead.

### Step 3: Generate Session Briefs

For each recommended session, produce a brief the user can paste as custom instructions or use to start a new agent session:

```markdown
## Session Brief: {skill-name} — {story-key or topic}

**Skill:** {skill-name}
**Target:** {story file path or output file}
**Context:** {one-line description of what this session should accomplish}
**Sprint position:** {story status or discovery status}
**Dependencies:** {any prerequisite sessions that must complete first, or "none"}
```

### Step 4: Persist Session Roster

After presenting recommendations, persist the session roster:

- **persist** | scope: workspace | key: active-sessions | caller: "session-orchestrator"
- Content: list of recommended sessions with status (recommended / launched / completed)

### Step 5: User Action

Present the recommendations and wait for the user to choose:

| Option | Action |
|--------|--------|
| Launch a session | Display the session brief for copy-paste into a new agent window |
| Refresh | Re-scan state sources and rebuild the dashboard |
| Clear sessions | Clear the session roster via `bmad-memory-manager` |

## VS CODE AGENTS APP INTEGRATION

When the user is running the VS Code Agents app (v1.115+):

- Each recommended session maps to a parallel agent session in the Agents app.
- Session briefs can be used as custom instructions for each session.
- The Agents app provides built-in session monitoring, diff review, and feedback — no additional tooling needed.
- Background terminal notifications (`chat.tools.terminal.backgroundNotifications`) enhance the experience for long-running builds.

## MEMORY CHECKPOINT

Use `bmad-memory-manager` to persist session state for recovery.

| Event | Operation |
|-------|-----------|
| After dashboard built | `persist | scope: workspace | key: active-sessions | caller: "session-orchestrator"` with session roster |
| Recovery | `recover | scope: workspace | key: active-sessions | caller: "session-orchestrator"` |
