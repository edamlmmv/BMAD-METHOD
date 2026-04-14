---
title: VS Code Copilot ↔ BMAD Integration
description: Maps BMAD-METHOD features to VS Code Copilot capabilities with actionable configuration guidance
sidebar:
  order: 7
---

This reference maps every BMAD-METHOD capability to the corresponding VS Code Copilot feature, providing explicit configuration paths so BMAD skills and workflows can leverage VS Code Copilot capabilities by design rather than by chance.

For the full catalog of VS Code Copilot capabilities, see [VS Code Copilot Capabilities](./vscode-copilot-capabilities.md).

## Custom Instructions for BMAD

BMAD projects should use `.github/copilot-instructions.md` to establish repo-wide conventions that Copilot follows automatically.

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

### Scoped Instructions for BMAD Artifacts

Create scoped instruction files in `.github/instructions/` for BMAD-specific file types:

| File | `applyTo` Pattern | Instructions |
| --- | --- | --- |
| `bmad-yaml.md` | `**/_bmad/**/*.yaml` | BMAD YAML config conventions; reference `config.yaml` schema |
| `bmad-skills.md` | `**/SKILL.md` | BMAD skill frontmatter requirements; `name` must match directory |
| `bmad-workflows.md` | `**/workflow.md` | BMAD workflow structure; step-file architecture conventions |
| `bmad-output.md` | `**/_bmad-output/**` | BMAD artifact format conventions; preserve frontmatter |

## Prompt Files for BMAD Workflows

BMAD workflows can be exposed as `.prompt.md` files so users can invoke them via `/` commands in chat.

### BMAD Prompt File Examples

**`.github/prompts/bmad-help.prompt.md`:**

```markdown
---
mode: "agent"
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
mode: "agent"
description: "Implement the next BMAD story"
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
mode: "agent"
description: "Run BMAD code review on current changes"
---
Run the bmad-code-review skill on the current changes.
Use #changes to see what was modified.
Check against #file:_bmad-output/project-context.md for convention compliance.
```

## Custom Agents for BMAD Personas

BMAD agents (Analyst, PM, Architect, Developer, etc.) can be mapped to VS Code custom agent files.

### Agent File Mapping

| BMAD Agent | File | `@` Handle | Tools |
| --- | --- | --- | --- |
| Analyst (Mary) | `analyst.agent.md` | `@analyst` | `codebase_search`, `read_file`, `create_file` |
| Product Manager (John) | `pm.agent.md` | `@pm` | `read_file`, `create_file`, `edit_file` |
| Architect (Winston) | `architect.agent.md` | `@architect` | `codebase_search`, `read_file`, `create_file`, `edit_file` |
| Developer (Amelia) | `dev.agent.md` | `@dev` | All tools |
| UX Designer (Sally) | `ux.agent.md` | `@ux` | `read_file`, `create_file`, `edit_file` |
| Technical Writer (Paige) | `writer.agent.md` | `@writer` | `read_file`, `create_file`, `edit_file`, `codebase_search` |

### Example Agent File

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

## Chat Modes for BMAD Phases

Define custom chat modes that restrict Copilot behavior to match BMAD workflow phases.

| Mode | File | Purpose | Allowed Tools |
| --- | --- | --- | --- |
| Planning | `planning.chatmode.md` | Analysis and planning phase — read-only research | `codebase_search`, `read_file`, `file_search`, `grep_search`, `fetch` |
| Solutioning | `solutioning.chatmode.md` | Architecture and story creation | `codebase_search`, `read_file`, `create_file`, `edit_file`, `file_search` |
| Implementation | `implementation.chatmode.md` | Full development — all tools available | _(all tools)_ |
| Review | `review.chatmode.md` | Code review — read-only with diagnostics | `codebase_search`, `read_file`, `grep_search`, `git_diff`, `diagnostics`, `test` |

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
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:githubToken}"
      }
    }
  }
}
```

## Copilot Hooks for BMAD

Configure hooks to enforce BMAD conventions automatically.

### Recommended Hooks

**`.vscode/settings.json`:**

```json
{
  "github.copilot.chat.agent.hooks": {
    "postSave": [
      {
        "command": "npx prettier --write ${file}",
        "glob": "**/*.{ts,js,json,yaml}"
      },
      {
        "command": "npx markdownlint-cli2 ${file}",
        "glob": "**/*.md"
      }
    ],
    "postCreate": [
      {
        "command": "npx prettier --write ${file}",
        "glob": "**/*.{ts,js,json,yaml}"
      }
    ]
  }
}
```

## Memory Integration

BMAD's memory-manager pattern maps to VS Code Copilot's memory feature.

| BMAD Concept | Copilot Feature | Notes |
| --- | --- | --- |
| `bmad-memory-manager` sidecars | `.github/copilot-memory.md` | Copilot memory is a single flat file; BMAD sidecars are scoped per skill |
| `_bmad/_memory/` directory | No direct equivalent | BMAD's memory is richer; Copilot memory is flat key-value |
| `sprint-status.yaml` | Copilot memory entries | Sprint position can be persisted to Copilot memory for cross-session awareness |
| Session recovery | Chat checkpoints | Copilot checkpoints capture conversation + file state |

### Bridging Strategy

BMAD skills should write key state to both systems:

1. **Canonical state** → BMAD artifacts (`sprint-status.yaml`, `_bmad/_memory/`)
2. **Advisory hints** → `.github/copilot-memory.md` for Copilot cross-session awareness

## Session Orchestrator ↔ VS Code Multi-Session

The `bmad-session-orchestrator` skill explicitly supports VS Code's multi-session capabilities.

| BMAD Feature | VS Code Feature |
| --- | --- |
| Parallel session recommendations | Multiple chat tabs |
| Session briefs | Custom instructions per tab (paste from brief) |
| Conflict detection | Independent context per tab |
| Sprint dashboard | Chat panel with `#file:sprint-status.yaml` |

## Planning ↔ Agent Planning

| BMAD Feature | Copilot Agent Feature |
| --- | --- |
| BMAD workflow steps | Agent mode auto-planning (`chat.agent.planning: "always"`) |
| Step-file architecture | Agent creates checklist plans from skill instructions |
| Workflow checkpoints | Chat checkpoints for restoring conversation state |
| Phase gates | Custom chat modes restricting tools per phase |

## Recommended VS Code Settings for BMAD

Complete `.vscode/settings.json` configuration for optimal BMAD + Copilot integration:

```json
{
  "chat.agent.enabled": true,
  "chat.agent.maxRequests": 30,
  "chat.agent.planning": "always",
  "github.copilot.chat.agent.runTasks": true,
  "github.copilot.chat.agent.autoFix": true,
  "chat.tools.autoApprove": false,
  "chat.tools.terminal.backgroundNotifications": true,
  "chat.promptFiles": true,
  "chat.mcp.discovery.enabled": true,
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "github.copilot.chat.memory.enabled": true
}
```

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

BMAD stories can be assigned to Copilot's cloud agent for autonomous implementation.

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
