---
title: VS Code Copilot ↔ BMAD Integration
description: Maps BMAD-METHOD features to VS Code Copilot capabilities with actionable configuration guidance
sidebar:
  order: 7
---

This reference maps every BMAD-METHOD capability to the corresponding VS Code Copilot feature, providing explicit configuration paths so BMAD skills and workflows can leverage VS Code Copilot capabilities by design rather than by chance.

For the full catalog of VS Code Copilot capabilities, see [VS Code Copilot Capabilities](./vscode-copilot-capabilities.md).

## Custom Instructions for BMAD

BMAD projects should use `.github/copilot-instructions.md` (and optionally `AGENTS.md` at root) to establish repo-wide conventions that Copilot follows automatically.

### Recommended BMAD Custom Instructions

A BMAD-installed project can generate or include the following in `.github/copilot-instructions.md`:

```markdown
## BMAD-METHOD Project

This project uses the BMAD-METHOD framework for structured, agent-assisted software delivery.

### Conventions
- All planning artifacts live in `_bmad-output/` (or configured output folder)
- Skills are invoked by name (e.g., `bmad-help`, `bmad-create-prd`)
- Workflows follow the 4-phase BMAD lifecycle: Analysis → Planning → Solutioning → Implementation
- Use Conventional Commits for all commit messages

### Key Artifacts
- `_bmad-output/project-context.md` — project conventions and tech stack
- `_bmad-output/PRD.md` — product requirements
- `_bmad-output/architecture.md` — technical architecture decisions
- `_bmad-output/sprint-status.yaml` — current sprint state

### When Modifying Code
- Check `_bmad-output/project-context.md` for coding conventions
- Follow architecture decisions in `_bmad-output/architecture.md`
- Reference the active story in `_bmad-output/epics/` for task scope
```

### AGENTS.md Compatibility

BMAD's existing `AGENTS.md` file at the repo root is automatically read by VS Code Copilot as always-on custom instructions. BMAD projects already benefit from this — the `AGENTS.md` file that ships with BMAD-METHOD contains quality rules, skill validation rules, and commit conventions that Copilot will follow automatically.

### Scoped Instructions for BMAD Artifacts

Create `.instructions.md` files (anywhere in the repo) for BMAD-specific file types:

| File | `applyTo` Pattern | Instructions |
| --- | --- | --- |
| `bmad-yaml.instructions.md` | `**/_bmad/**/*.yaml` | BMAD YAML config conventions; reference `config.yaml` schema |
| `bmad-skills.instructions.md` | `**/SKILL.md` | BMAD skill frontmatter requirements; `name` must match directory |
| `bmad-workflows.instructions.md` | `**/workflow.md` | BMAD workflow structure; step-file architecture conventions |
| `bmad-output.instructions.md` | `**/_bmad-output/**` | BMAD artifact format conventions; preserve frontmatter |

## Prompt Files for BMAD Workflows

BMAD workflows can be exposed as `.prompt.md` files so users can invoke them via `/` commands in chat.

### BMAD Prompt File Examples

**`.github/prompts/bmad-help.prompt.md`:**

```markdown
---
agent: "agent"
description: "Get BMAD help — what to do next in your project"
---
Run the bmad-help skill. Analyze the current project state by checking:
- #file:_bmad-output/sprint-status.yaml
- #file:_bmad-output/PRD.md
- #file:_bmad-output/architecture.md

Recommend the next BMAD workflow to run based on what artifacts exist.
```

**`.github/prompts/bmad-story.prompt.md`:**

```markdown
---
agent: "agent"
description: "Implement the next BMAD story"
tools: ['terminal', 'test', 'diagnostics', 'edit_file', 'create_file']
---
Run the bmad-dev-story workflow:
1. Read #file:_bmad-output/sprint-status.yaml to find the next ready story
2. Load the story file from the epics directory
3. Read #file:_bmad-output/project-context.md for coding conventions
4. Read #file:_bmad-output/architecture.md for technical decisions
5. Implement the story following BMAD implementation guidelines
```

**`.github/prompts/bmad-review.prompt.md`:**

```markdown
---
agent: "agent"
description: "Run BMAD code review on current changes"
tools: ['read_file', 'grep_search', 'diagnostics', 'test', 'git_diff']
---
Run the bmad-code-review skill on the current changes.
Use #changes to see what was modified.
Check against #file:_bmad-output/project-context.md for convention compliance.
```

## Custom Agents for BMAD Personas

BMAD agents (Analyst, PM, Architect, Developer, etc.) map directly to VS Code custom agent files with handoffs between phases.

### Agent File Mapping

| BMAD Agent | File | Tools | Handoffs |
| --- | --- | --- | --- |
| Analyst (Mary) | `analyst.agent.md` | `codebase_search`, `read_file`, `create_file`, `fetch` | → PM, → Architect |
| Product Manager (John) | `pm.agent.md` | `read_file`, `create_file`, `edit_file` | → Architect, → UX |
| Architect (Winston) | `architect.agent.md` | `codebase_search`, `read_file`, `create_file`, `edit_file` | → Developer |
| Developer (Amelia) | `dev.agent.md` | All tools | → Reviewer |
| UX Designer (Sally) | `ux.agent.md` | `read_file`, `create_file`, `edit_file` | → PM |
| Technical Writer (Paige) | `writer.agent.md` | `read_file`, `create_file`, `edit_file`, `codebase_search` | — |

### Example Agent File with Handoffs

**`.github/agents/dev.agent.md`:**

```markdown
---
description: "BMAD Developer agent (Amelia) — implements stories, reviews code, manages sprints"
tools:
  - codebase_search
  - file_search
  - read_file
  - edit_file
  - create_file
  - delete_file
  - terminal
  - grep_search
  - test
  - diagnostics
  - git_diff
  - git_log
handoffs:
  - label: Run Code Review
    agent: reviewer
    prompt: Review the implementation I just completed against the story acceptance criteria.
  - label: Update Sprint Status
    agent: agent
    prompt: Update _bmad-output/sprint-status.yaml to mark the current story as complete.
---

You are Amelia, the BMAD Developer agent. Your expertise is implementing
user stories from the BMAD backlog with high-quality, tested code.

## Operating Rules

1. Always read the story file completely before starting implementation
2. Check `_bmad-output/project-context.md` for coding conventions
3. Follow architecture decisions in `_bmad-output/architecture.md`
4. Write tests alongside implementation code
5. Use Conventional Commits for all commits
6. Update sprint-status.yaml when story status changes

## Available Workflows

- **DS** (Dev Story) — full story implementation workflow
- **QD** (Quick Dev) — rapid implementation for small tasks
- **CR** (Code Review) — validate implementation quality
- **SP** (Sprint Planning) — initialize sprint tracking
```

### BMAD Phase Agents (Workflow Restrictors)

Define agents that restrict tools by BMAD phase:

| Agent | File | Purpose | Allowed Tools |
| --- | --- | --- | --- |
| Planning | `planning.agent.md` | Analysis and planning — read-only research | `codebase_search`, `read_file`, `file_search`, `grep_search`, `fetch` |
| Solutioning | `solutioning.agent.md` | Architecture and story creation | `codebase_search`, `read_file`, `create_file`, `edit_file`, `file_search` |
| Implementation | `implementation.agent.md` | Full development — all tools | _(all tools)_ |
| Review | `review.agent.md` | Code review — read-only with diagnostics | `codebase_search`, `read_file`, `grep_search`, `git_diff`, `diagnostics`, `test` |

## Agent Skills Mapping

BMAD skills use the same directory structure and naming conventions as VS Code Agent Skills. When installed to `.github/skills/`, BMAD skills are natively discovered and invocable via `/skill-name` in chat.

### BMAD Skill → VS Code Skill Compatibility

| BMAD Skill Concept | VS Code Agent Skills Equivalent |
| --- | --- |
| `SKILL.md` entry point | Identical — VS Code reads `SKILL.md` with frontmatter |
| `name` in frontmatter | Must match directory name (same rule in both) |
| `description` in frontmatter | Used for auto-discovery and relevance matching |
| `workflow.md` → `./steps/` | Linked files loaded on-demand when referenced in SKILL.md |
| Slash command invocation | Type `/skill-name` in chat |
| Auto-invocation by agent | Agent loads skill based on description relevance |

### Making BMAD Skills Portable

To make BMAD skills work seamlessly across VS Code, Copilot CLI, and cloud agents:

1. **Ensure `SKILL.md` frontmatter is complete** — `name` and `description` are required
2. **Use relative links** — Reference `workflow.md` and `./steps/*.md` with Markdown link syntax
3. **Include `user-invocable` and `disable-model-invocation`** where appropriate
4. **Add `argument-hint`** for skills that benefit from user input context

## Subagent Orchestration for BMAD

BMAD's multi-agent architecture maps naturally to VS Code's subagent system.

### BMAD Session Orchestrator → VS Code Subagents

The `bmad-session-orchestrator` skill recommends parallel sessions. VS Code subagents provide the execution mechanism:

| BMAD Concept | VS Code Subagent Feature |
| --- | --- |
| Parallel session recommendations | Parallel subagent execution |
| Session briefs | Custom agent instructions per subagent |
| Conflict detection (same output file) | Independent context per subagent |
| Sprint dashboard | Main agent aggregates subagent results |

### Coordinator Agent for BMAD

A BMAD coordinator agent can orchestrate the full lifecycle:

**`.github/agents/bmad-coordinator.agent.md`:**

```markdown
---
description: "BMAD lifecycle coordinator — delegates to specialized BMAD agents"
tools: ['agent', 'read_file', 'codebase_search']
agents: ['analyst', 'pm', 'architect', 'dev', 'reviewer']
---
You are the BMAD lifecycle coordinator. For each feature request:

1. Use the analyst agent as a subagent to research and gather requirements
2. Use the pm agent as a subagent to create/validate the PRD
3. Use the architect agent as a subagent to design the architecture
4. Use the dev agent as a subagent to implement stories
5. Use the reviewer agent as a subagent to validate the implementation

Iterate between phases as needed until the feature is complete.
```

### Multi-Perspective BMAD Code Review

Run BMAD's review skills as parallel subagents:

```markdown
---
description: "BMAD comprehensive code review — multiple review perspectives"
tools: ['agent', 'read_file', 'grep_search', 'git_diff']
agents: ['review-adversarial', 'review-edge-case', 'review-structure']
---
Run these review perspectives in parallel as subagents:
1. Use review-adversarial for adversarial general review
2. Use review-edge-case for edge case hunting
3. Use review-structure for editorial structure review

Consolidate findings into a single prioritized review summary.
```

## MCP Servers for BMAD

BMAD can leverage MCP servers for external tool integration.

### Potential MCP Integrations

| Server | Purpose | BMAD Use Case |
| --- | --- | --- |
| **GitHub MCP** | GitHub API access | Sprint tracking, issue sync, PR management |
| **Filesystem MCP** | Enhanced file operations | BMAD artifact management across repositories |
| **Database MCP** | Database access | Schema validation against architecture docs |
| **Browser MCP** | Web browsing | Market research, competitor analysis workflows |

### Example MCP Configuration for BMAD

**`.vscode/mcp.json`:**

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp",
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:githubToken}"
      }
    }
  }
}
```

## Copilot Hooks for BMAD

Configure hooks to enforce BMAD conventions automatically at lifecycle points.

### Recommended Hooks

**`.github/hooks/bmad-quality.json`:**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "npx prettier --write \"$TOOL_INPUT_FILE_PATH\"",
        "windows": "npx prettier --write \"%TOOL_INPUT_FILE_PATH%\""
      }
    ],
    "SessionStart": [
      {
        "type": "command",
        "command": "echo 'BMAD project detected. Sprint status:' && cat _bmad-output/sprint-status.yaml 2>/dev/null || echo 'No sprint active'"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "npm run quality 2>&1 | tail -20"
      }
    ]
  }
}
```

### Agent-Scoped Hooks

Hooks can be embedded in agent frontmatter to run only when that agent is active:

```markdown
---
description: "BMAD Developer agent"
hooks:
  PostToolUse:
    - type: command
      command: "npx markdownlint-cli2 \"$TOOL_INPUT_FILE_PATH\""
---
```

## Memory Integration

BMAD's memory-manager pattern maps to VS Code Copilot's three-scope memory system.

### Memory Scope Mapping

| BMAD Concept | VS Code Memory Scope | Notes |
| --- | --- | --- |
| `bmad-memory-manager` session scope | **Session memory** (`/memories/session/`) | Task-specific; cleared when chat ends |
| `bmad-memory-manager` workspace scope | **Repository memory** (`/memories/repo/`) | Persists across conversations in workspace |
| `_bmad/_memory/` directory | **Repository memory** | BMAD's memory is richer; sidecars are scoped per skill |
| User preferences | **User memory** (`/memories/`) | Persists across all workspaces |
| `sprint-status.yaml` | Repository memory entries | Sprint position for cross-session awareness |
| Session recovery | Chat checkpoints + session memory | Checkpoints capture conversation + file state |

### Bridging Strategy

BMAD skills should write key state to both systems:

1. **Canonical state** → BMAD artifacts (`sprint-status.yaml`, `_bmad/_memory/`)
2. **Repository memory** → Key facts about the workspace (e.g., "This project uses the BMAD-METHOD framework, current sprint is Sprint-3, active story is S3-001")
3. **Session memory** → In-progress plans and task state during a session

### Memory Checkpoint Pattern

BMAD skills using the memory-manager consumer pattern can write to VS Code memory scopes:

```markdown
### Memory Checkpoint

When this step completes successfully, invoke the memory tool:
- persist | scope: repo | "Sprint status updated: story S3-001 moved to in-progress"
- persist | scope: session | "Current task: implementing auth middleware per story S3-001"
```

## Planning ↔ Agent Planning

| BMAD Feature | Copilot Agent Feature |
| --- | --- |
| BMAD workflow steps | Plan agent (`/plan`) creates structured implementation plans |
| Step-file architecture | Plan agent generates checklist from skill instructions |
| Workflow checkpoints | Chat checkpoints for restoring conversation state |
| Phase gates | Custom agents restricting tools per phase |
| Plan model selection | `chat.planAgent.defaultModel` for planning; separate model for implementation |
| Plan persistence | Session memory stores plan at `/memories/session/plan.md` |

### BMAD Plan → Copilot Plan Workflow

1. Invoke BMAD planning skill (e.g., `bmad-create-epics-and-stories`)
2. Select **Plan** agent from dropdown to create structured implementation plan
3. Review and edit the generated plan
4. Switch to **Agent** mode to execute the plan
5. Checkpoints auto-created at each step for rollback

## Session Orchestrator ↔ VS Code Multi-Session

The `bmad-session-orchestrator` skill explicitly supports VS Code's multi-session capabilities.

| BMAD Feature | VS Code Feature |
| --- | --- |
| Parallel session recommendations | Multiple chat tabs / subagent parallel execution |
| Session briefs | Custom agent instructions per tab or subagent prompt |
| Conflict detection | Independent context per tab/subagent |
| Sprint dashboard | Chat panel with `#file:sprint-status.yaml` |

## Context Engineering for BMAD

Optimal `#` reference patterns for BMAD workflows.

| BMAD Workflow | Recommended Context Attachments |
| --- | --- |
| Create PRD | `#file:_bmad-output/product-brief.md`, `#file:_bmad-output/brainstorming-report.md` |
| Create Architecture | `#file:_bmad-output/PRD.md`, `#file:_bmad-output/project-context.md` |
| Create Epics & Stories | `#file:_bmad-output/PRD.md`, `#file:_bmad-output/architecture.md` |
| Dev Story | `#file:_bmad-output/sprint-status.yaml`, story file, `#file:_bmad-output/project-context.md` |
| Code Review | `#changes`, `#file:_bmad-output/project-context.md`, `#problems` |
| Discovery Rigor | `#codebase`, `#file:_bmad-output/project-context.md` |
| Quick Dev | `#file:_bmad-output/project-context.md`, `#selection` |

## Smart Actions for BMAD

VS Code Copilot smart actions that complement BMAD workflows.

| Smart Action | BMAD Integration Point |
| --- | --- |
| Generate Tests | After `bmad-dev-story` implementation; validates story acceptance criteria |
| Generate Docs | After `bmad-dev-story` or during `bmad-tech-writer` workflows |
| Fix with Copilot | During `bmad-code-review` to address findings |
| Explain This | During `bmad-discovery-rigor` for codebase understanding |
| Generate Commit Message | During `bmad-dev-story` for Conventional Commit formatting |
| Generate PR Description | After `bmad-code-review` approval |

## Cloud Agent (Coding Agent) for BMAD

BMAD stories can be assigned to Copilot's cloud agent for autonomous implementation. Cloud agents also support hand-off from local Plan agent sessions for complex workflows.

### Setup

**`.github/copilot-setup-steps.yml`:**

```yaml
steps:
  - name: Install dependencies
    run: npm ci
  - name: Install BMAD
    run: npx bmad-method install --non-interactive --ide github-copilot
  - name: Verify
    run: npm run quality
```

### Workflow

1. Create stories with `bmad-create-epics-and-stories`
2. Convert stories to GitHub issues
3. Assign issues to Copilot for autonomous implementation
4. Review generated PRs against BMAD quality standards
5. Use `bmad-code-review` on the PR diff

### Plan → Cloud Hand-off

For complex features, use the Plan agent to create a structured plan, then hand off to cloud:

1. Select **Plan** agent and describe the feature
2. Iterate on the plan until it meets requirements
3. Select **Start Implementation** → **Continue in Cloud**
4. Cloud agent implements the plan and creates a PR

## Copilot CLI for BMAD Background Sessions

Copilot CLI sessions let BMAD workflows run autonomously in the background while you continue coding.

### BMAD Background Workflow

1. Plan a story with the **Plan** agent in a local chat session
2. Select **Start Implementation** → **Continue in Copilot CLI**
3. Choose **Worktree** isolation to keep changes separate from your active work
4. Monitor progress in the Chat view sessions list
5. Review the worktree diff when the session completes

### Parallel BMAD Story Implementation

Run multiple BMAD stories in parallel by starting multiple Copilot CLI sessions:

1. Create separate Copilot CLI sessions for independent stories
2. Each session operates in its own Git worktree
3. Changes remain isolated until you review and merge

### Custom Agents in CLI

Enable BMAD custom agents for Copilot CLI sessions:

```json
{
  "github.copilot.chat.cli.customAgents.enabled": true
}
```

Then select a BMAD persona agent (e.g., `dev`, `reviewer`) when creating a Copilot CLI session.

## Agent Plugins for BMAD (Future)

BMAD-METHOD could be distributed as an agent plugin, providing:

| Plugin Component | BMAD Content |
| --- | --- |
| **Skills** | All BMAD skills (bmad-help, bmad-create-prd, bmad-dev-story, etc.) |
| **Custom Agents** | BMAD persona agents (Analyst, PM, Architect, Developer) |
| **Hooks** | BMAD quality enforcement (formatting, linting, conventional commits) |
| **MCP Servers** | BMAD artifact management server |

This would allow one-click installation of the full BMAD framework via the VS Code agent plugins system.

## Recommended VS Code Settings for BMAD

Complete `.vscode/settings.json` configuration for optimal BMAD + Copilot integration:

```json
{
  "chat.agent.enabled": true,
  "chat.agent.maxRequests": 30,
  "github.copilot.chat.agent.runTasks": true,
  "github.copilot.chat.agent.autoFix": true,
  "chat.tools.autoApprove": false,
  "chat.tools.terminal.backgroundNotifications": true,
  "chat.mcp.discovery.enabled": true,
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "github.copilot.chat.tools.memory.enabled": true,
  "chat.useCustomizationsInParentRepositories": true
}
```
