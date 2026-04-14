---
title: VS Code Copilot Capabilities
description: Comprehensive reference of VS Code GitHub Copilot features, configuration surfaces, and extensibility points
sidebar:
  order: 6
---

Complete reference for VS Code GitHub Copilot capabilities aggregated from the official documentation. This page catalogs every configuration surface, chat feature, agent capability, and extensibility point that VS Code Copilot exposes — organized so BMAD skills, workflows, and agents can explicitly reference and leverage them.

## Customization Surfaces

### Custom Instructions

Custom instructions define persistent context and rules that Copilot follows across all interactions. VS Code supports two categories: **always-on** (automatically included in every request) and **file-based** (conditionally applied based on file patterns).

#### Always-On Instructions

| Source | Details |
| --- | --- |
| **`.github/copilot-instructions.md`** | Workspace-level; auto-included in every chat request |
| **`AGENTS.md`** | Root-level or subfolder-level; compatible with multi-agent setups |
| **`CLAUDE.md`** | Root, `.claude/`, or `~/`; for compatibility with Claude Code tools |
| **Organization-level** | Shared across repos in a GitHub organization |

| Attribute | Details |
| --- | --- |
| **Format** | Markdown; Copilot reads the full content as system-level context |
| **Setting** | `github.copilot.chat.codeGeneration.useInstructionFiles` (default: `true`) |
| **Behavior** | Automatically included in every chat request; no explicit `#` reference needed |
| **Use cases** | Coding conventions, framework preferences, naming standards, architecture rules |
| **Quick start** | Type `/init` in chat to auto-generate instructions tailored to your project |
| **Monorepo** | Enable `chat.useCustomizationsInParentRepositories` to discover from parent repo root |
| **Management** | Chat Customizations editor (Preview): **Chat: Open Chat Customizations** |

#### File-Based Instructions (.instructions.md)

Conditionally applied instructions based on file type or location using glob patterns.

| Attribute | Details |
| --- | --- |
| **Extension** | `.instructions.md` |
| **Locations** | Workspace (any directory) or user profile |
| **Format** | Markdown with YAML frontmatter (`applyTo` glob pattern) |
| **Frontmatter** | `applyTo: "**/*.ts"` — glob pattern controlling when instructions apply |
| **Scope** | Auto-attached when the agent is working on files matching the `applyTo` pattern |
| **Manual use** | Can be referenced explicitly with `#instructions` in chat |
| **AI generation** | Type `/create-instruction` in chat to generate with AI assistance |
| **Use cases** | Language-specific rules, test conventions, component patterns |

**Example frontmatter:**

```yaml
---
applyTo: "**/*.test.ts"
---
Use vitest for all tests. Prefer `describe`/`it` blocks over `test`.
```

### Prompt Files (.prompt.md)

Reusable prompt templates for common tasks, invocable as slash commands in chat.

| Attribute | Details |
| --- | --- |
| **Directory** | `.github/prompts/` (workspace) or user profile (cross-workspace) |
| **Extension** | `.prompt.md` |
| **Setting** | `chat.promptFilesLocations` — configure additional prompt file directories |
| **Invocation** | Type `/` in chat; also via **Chat: Run Prompt** command |
| **Format** | Markdown with optional YAML frontmatter |
| **Context refs** | Can embed `#file:path/to/file` and `#tool:tool-name` references |
| **Variables** | Support `${input:variableName}` and `${input:variableName:placeholder}` |
| **AI generation** | Type `/create-prompt` in chat to generate with AI assistance |
| **Sync** | Enable via Settings Sync → **Prompts and Instructions** |

**Frontmatter fields:**

| Field | Required | Description |
| --- | --- | --- |
| `description` | No | Short description shown in slash command picker |
| `name` | No | Display name after `/`; defaults to file name |
| `argument-hint` | No | Hint text shown in chat input when prompt is invoked |
| `agent` | No | Agent to use: `ask`, `agent`, `plan`, or a custom agent name |
| `model` | No | Language model override (e.g., `GPT-4o`, `Claude Sonnet 4`); use lighter models like `GPT-4o mini` or `Claude Haiku` for less compute-intensive prompts |
| `tools` | No | List of tool or tool set names available for this prompt |

**Tool list priority:** prompt file tools > referenced custom agent tools > default tools.

**Example prompt file:**

```markdown
---
agent: "agent"
model: GPT-4o
tools: ['search/codebase', 'vscode/askQuestions']
description: "Generate a React component with tests"
---
Create a React component for #file:src/types.ts

Use the patterns from #file:src/components/Example.tsx
Name: ${input:componentName}
```

### Custom Agents

Custom agents (formerly custom chat modes) define specialized AI personas with specific behavior, tool access, and model preferences. Agents can hand off to each other for multi-step workflows.

| Attribute | Details |
| --- | --- |
| **Directory** | `.github/agents/` (workspace), `.claude/agents/` (Claude format), or user profile |
| **Extension** | `.agent.md` (or any `.md` in `.github/agents/`) |
| **Format** | Markdown with YAML frontmatter |
| **Invocation** | Agent picker dropdown in Chat view |
| **AI generation** | Type `/create-agent` in chat to generate with AI assistance |
| **Setting** | `chat.agentFilesLocations` — configure additional agent file directories |

**Frontmatter fields:**

| Field | Required | Description |
| --- | --- | --- |
| `description` | No | Description shown in agent picker |
| `tools` | No | Array of tool IDs the agent can use; empty = all tools |
| `model` | No | Preferred language model(s) for this agent; use lighter models (e.g., `GPT-4o mini`, `Claude Haiku`) for agents with simpler tasks |
| `agents` | No | List of custom agents allowed as subagents (`*` = all, `[]` = none) |
| `handoffs` | No | Array of handoff definitions for workflow transitions |
| `hooks` | No | Agent-scoped hooks (run only when this agent is active) |
| `user-invocable` | No | Whether agent appears in dropdown (default: `true`); set `false` for subagent-only |
| `disable-model-invocation` | No | Prevent automatic invocation as subagent (default: `false`) |
| `if` | No | Activation condition (e.g., `resourceExists('pyproject.toml')`) |
| `argument-hint` | No | Hint text for the agent |

**Handoffs** enable guided workflow transitions between agents:

```yaml
handoffs:
  - label: Start Implementation
    agent: implementation
    prompt: Now implement the plan outlined above.
    send: false
    model: GPT-5.2 (copilot)
```

### Agent Skills

Agent Skills are portable, multi-file capabilities that teach Copilot specialized workflows. Skills follow an [open standard](https://agentskills.io) that works across VS Code, Copilot CLI, and Copilot cloud agent.

| Attribute | Details |
| --- | --- |
| **Directories** | `.github/skills/`, `.claude/skills/`, `.agents/skills/` (project); `~/.copilot/skills/`, `~/.claude/skills/`, `~/.agents/skills/` (personal) |
| **Structure** | `{skill-name}/SKILL.md` with optional supporting files (scripts, examples, resources) |
| **Format** | Markdown with YAML frontmatter (`name`, `description`) |
| **Discovery** | Auto-discovered by VS Code; listed as slash commands alongside prompt files |
| **Invocation** | Type `/skill-name` in chat; or agent auto-loads based on relevance |
| **Quick access** | Type `/skills` in chat to open Configure Skills menu |
| **AI generation** | Type `/create-skill` in chat to generate with AI assistance |
| **Setting** | `chat.skillsLocations` — configure additional skill directories |
| **Extension API** | Contribute via `chatSkills` in extension `package.json` |

**SKILL.md frontmatter fields:**

| Field | Required | Description |
| --- | --- | --- |
| `name` | Yes | Unique identifier; lowercase with hyphens; must match directory name (max 64 chars) |
| `description` | Yes | What the skill does and when to use it (max 1024 chars) |
| `argument-hint` | No | Hint text shown when skill is invoked as slash command |
| `user-invocable` | No | Show in `/` menu (default: `true`); set `false` for background-only skills |
| `disable-model-invocation` | No | Prevent auto-loading by agent (default: `false`); require manual `/` invocation |

**Loading model:** Discovery (name + description) → Instructions (SKILL.md body) → Resources (linked files on-demand).

### Language Model Selection

Configure which AI models Copilot uses for different tasks.

| Attribute | Details |
| --- | --- |
| **Chat model** | Model picker in chat panel; supports GPT-4o, Claude, Gemini, o1, o3, etc. |
| **Per-agent** | Set `model` in `.agent.md` frontmatter for per-agent model preference |
| **Per-prompt** | Set `model` in `.prompt.md` frontmatter for per-prompt model |
| **Completions** | `github.copilot.selectedCompletionModel` setting |
| **Plan agent** | `chat.planAgent.defaultModel` — model for planning phase |
| **BYOK** | Bring your own API key to access additional models |
| **Custom models** | Extension API `lm.registerLanguageModelChatProvider()` for custom providers |

**Model tiers — right-size for the task:**

| Tier | Examples | When to Use |
| --- | --- | --- |
| **Full** | GPT-4o, Claude Sonnet 4, Gemini 2.5 Pro | Complex reasoning, architecture, multi-step planning, large refactors |
| **Mini / Haiku** | GPT-4o mini, Claude Haiku, Gemini Flash | Simpler tasks—formatting, boilerplate generation, lookups, linting suggestions, editorial review |

Use the `model` frontmatter field in `.prompt.md` and `.agent.md` files to assign lighter models to less compute-intensive tasks. This reduces latency and cost while reserving full-tier models for work that genuinely requires deeper reasoning.

### MCP Servers

Model Context Protocol servers extend Copilot with external tools, resources, prompts, and interactive apps.

| Attribute | Details |
| --- | --- |
| **Configuration** | `.vscode/mcp.json` (workspace) or user profile `mcp.json` |
| **Format** | JSON with server definitions |
| **Transport** | `stdio` (local process), `http` (remote HTTP), or `sse` (server-sent events) |
| **Keys** | `servers: { "name": { "type": "stdio", "command": "...", "args": [...], "env": {...} } }` |
| **Gallery** | Browse and install from Extensions view with `@mcp` search |
| **Input variables** | `${input:name}` for user-prompted values; `${workspaceFolder}` for paths |
| **Discovery** | `chat.mcp.discovery.enabled` — auto-discover configs from other tools |
| **Approval** | Controlled by `chat.tools.autoApprove` setting |
| **Trust** | Trust dialog on first start; reset with **MCP: Reset Trust** command |
| **Sandboxing** | macOS/Linux: `sandboxEnabled: true` with file/network restrictions |
| **Dev containers** | Configure in `customizations.vscode.mcp` in `devcontainer.json` |
| **Settings Sync** | Sync MCP configs across devices via Settings Sync |

**Additional MCP capabilities:**

| Capability | Description |
| --- | --- |
| **Resources** | Read-only data context from MCP servers; attach via **Add Context** > **MCP Resources** |
| **Prompts** | Preconfigured prompt templates from MCP servers; invoke with `/<server>.<prompt>` |
| **MCP Apps** | Interactive UI components rendered inline in chat |

**Example `.vscode/mcp.json`:**

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp"
    },
    "my-server": {
      "command": "node",
      "args": ["./mcp-server.js"],
      "env": { "API_KEY": "${input:apiKey}" }
    }
  }
}
```

### Copilot Hooks (Preview)

Hooks execute custom shell commands at key lifecycle points during agent sessions for automation, validation, and policy enforcement.

| Attribute | Details |
| --- | --- |
| **Config files** | `.github/hooks/*.json` (workspace), `.claude/settings.json`, `.claude/settings.local.json` |
| **Format** | JSON with `hooks` object containing arrays per lifecycle event |
| **Setting** | `chat.hookFilesLocations` — customize which hook files are loaded |
| **Agent-scoped** | Hooks in `.agent.md` frontmatter (enable with `chat.useCustomAgentHooks`) |
| **AI generation** | Type `/create-hook` in chat to generate with AI assistance |
| **Cross-agent** | Works across local agents, background agents, and cloud agents |

**Hook lifecycle events:**

| Event | When It Fires | Common Use Cases |
| --- | --- | --- |
| `SessionStart` | User submits the first prompt of a new session | Initialize resources, validate project state |
| `UserPromptSubmit` | User submits a prompt | Audit requests, inject system context |
| `PreToolUse` | Before agent invokes any tool | Block dangerous ops, require approval, modify input |
| `PostToolUse` | After tool completes successfully | Run formatters, log results, trigger follow-up |
| `PreCompact` | Before conversation context is compacted | Export important context, save state |
| `SubagentStart` | Subagent is spawned | Track nested agent usage |
| `SubagentStop` | Subagent completes | Aggregate results, cleanup |
| `Stop` | Agent session ends | Generate reports, cleanup resources |

**Hook command properties:**

| Property | Type | Description |
| --- | --- | --- |
| `type` | string | Must be `"command"` |
| `command` | string | Default command to run (cross-platform) |
| `windows` | string | Windows-specific command override |
| `linux` | string | Linux-specific command override |
| `osx` | string | macOS-specific command override |
| `timeout` | number | Timeout in seconds (default: 30) |

**Example `.github/hooks/format.json`:**

```json
{
  "hooks": {
    "PostToolUse": [
      { "type": "command", "command": "npx prettier --write \"$TOOL_INPUT_FILE_PATH\"" }
    ],
    "PreToolUse": [
      { "type": "command", "command": "./scripts/validate-tool.sh", "timeout": 15 }
    ]
  }
}
```

### Agent Plugins (Preview)

Agent plugins are prepackaged bundles of chat customizations installed from plugin marketplaces. A single plugin can provide slash commands, skills, custom agents, hooks, and MCP servers.

| Attribute | Details |
| --- | --- |
| **Discovery** | Extensions view with `@agentPlugins` search; or Chat Customizations editor |
| **Marketplaces** | GitHub repos configured via `chat.plugins.marketplaces` |
| **Install sources** | Marketplace, Git URL (**Chat: Install Plugin From Source**), or local path |
| **Setting** | `chat.plugins.enabled` — enable/disable plugin support |
| **Contents** | Slash commands, agent skills, custom agents, hooks, MCP servers |
| **Plugin file** | `plugin.json` at plugin root defines metadata and configuration |
| **MCP config** | `.mcp.json` at plugin root (uses `mcpServers` key, not `servers`) |
| **Path token** | `${CLAUDE_PLUGIN_ROOT}` expands to plugin's absolute path |
| **Workspace recs** | `enabledPlugins` and `extraKnownMarketplaces` in workspace settings |

## Chat Features

### Chat Panel (Copilot Chat)

The primary interaction surface for conversational AI assistance.

| Attribute | Details |
| --- | --- |
| **Open** | `Ctrl+Alt+I` / `Cmd+Alt+I` or Activity Bar icon |
| **Agents** | Select from agent picker dropdown (Ask, Agent, Plan, custom agents) |
| **Session targets** | Local (default), Copilot CLI (background), Cloud (remote) |
| **Ask mode** | Read-only Q&A; uses agentic capabilities for research but no file modifications |
| **Agent mode** | Autonomous; can run terminal commands, edit files, use tools |
| **Plan mode** | Creates structured implementation plan before implementation |
| **Setting** | `chat.agent.enabled` (default: `true`) |
| **Max requests** | `chat.agent.maxRequests` — limit autonomous iterations |
| **Auto-fix** | `github.copilot.chat.agent.autoFix` — auto-fix lint/build errors |
| **Run tasks** | `github.copilot.chat.agent.runTasks` — allow task execution |
| **Queued messages** | Send follow-up prompts while agent is working |

**Permission levels:**

| Level | Description |
| --- | --- |
| **Default Approvals** | Tools requiring approval show confirmation dialog |
| **Bypass Approvals** | Auto-approves all tool calls; may ask clarifying questions |
| **Autopilot** (Preview) | Auto-approves and auto-responds; fully autonomous until task completion |

### Chat Sessions

Manage multiple concurrent conversations with Copilot.

| Attribute | Details |
| --- | --- |
| **Multi-session** | Multiple chat tabs; each maintains independent context |
| **History** | Sessions persist across VS Code restarts |
| **Export** | Right-click session → Export to markdown |
| **Background sessions** | Sessions can run in background while you code |
| **Session title** | Auto-generated from first message; editable |

### Chat Context (`#` References)

Explicitly attach context to chat messages using `#` references.

| Reference | What it Attaches |
| --- | --- |
| `#file:path` | Contents of a specific file |
| `#folder:path` | File listing of a directory |
| `#selection` | Currently selected code in editor |
| `#editor` | Visible content in active editor |
| `#terminal` | Recent terminal output |
| `#terminalLastCommand` | Output of the last terminal command |
| `#terminalSelection` | Selected text in terminal |
| `#problems` | Current Problems panel entries (errors/warnings) |
| `#changes` | Pending SCM changes (git diff) |
| `#codebase` | Workspace-wide semantic search |
| `#sym:symbolName` | Specific code symbol (function, class, etc.) |
| `#tools` | List available tools |
| `#instructions` | Reference instruction files |
| `#fetch:url` | Fetch and include web page content |
| `#usages:symbol` | Find all usages of a symbol |
| `#imports:file` | Import graph of a file |
| `#testFailure` | Details of failing tests |
| `#debugContext` | Current debug session state |
| `#artifacts` | Surface resources to the artifacts panel |
| `#searchResults` | Results from the Search view |

**Additional context methods:**

| Method | Details |
| --- | --- |
| **Drag & drop** | Drag files/folders from Explorer, Search, or editor tabs onto Chat |
| **Add Context** | Button in Chat view to open the context picker |
| **Vision** | Attach images (screenshots, UI sketches) for visual context (Preview) |
| **Browser elements** | Select elements from integrated browser (Experimental) |
| **URL references** | Include URLs directly in prompts; agent fetches content |
| **@-mentions** | `@vscode`, `@terminal` for domain-specific chat participants |

### Context Window Management

| Feature | Details |
| --- | --- |
| **Context indicator** | Visual fill bar in chat input showing token usage vs. model capacity |
| **Auto-compaction** | Conversation automatically summarized when context window fills up |
| **Manual compaction** | Type `/compact` in chat; optionally add guidance |
| **Workspace indexing** | Automatic; relevant files included based on conversation |

### Inline Chat

Trigger Copilot directly in the editor at the cursor position.

| Attribute | Details |
| --- | --- |
| **Trigger** | `Ctrl+I` / `Cmd+I` |
| **Scope** | Acts on selected code or cursor position |
| **Actions** | Explain, fix, refactor, generate, document |
| **Preview** | Shows inline diff preview before accepting |
| **Accept** | Enter to accept; Escape to dismiss |

### Review Code Edits

Review and accept/reject Copilot's proposed changes.

| Attribute | Details |
| --- | --- |
| **Diff view** | Side-by-side or inline diff of proposed changes |
| **Navigation** | Arrow buttons or `F7`/`Shift+F7` to navigate between changes |
| **Accept/Reject** | Per-file or per-hunk accept/reject |
| **Undo** | Full undo of accepted changes via editor undo |

### Chat Checkpoints

Save and restore conversation state at specific points.

| Attribute | Details |
| --- | --- |
| **Auto-checkpoints** | Created automatically at each agent iteration |
| **Restore** | Click checkpoint to restore conversation and file state to that point |
| **File state** | Checkpoints capture both conversation and workspace file state |
| **Branching** | Restore a checkpoint and take a different direction |

### Chat Artifacts (Preview)

The artifacts panel surfaces important resources alongside the chat conversation.

| Attribute | Details |
| --- | --- |
| **Setting** | `chat.artifacts.enabled` — enable/disable the artifacts panel |
| **Types** | Links, screenshots/images, plans, documents |
| **Invocation** | Agent uses `#artifacts` tool; or ask agent to create artifacts |
| **Behavior** | Each time the agent sets artifacts, the previous list is replaced |

### Chat Debug View

Use Copilot integrated with the VS Code debugger.

| Attribute | Details |
| --- | --- |
| **Context** | `#debugContext` attaches current debug session state |
| **Fix suggestions** | Copilot can suggest fixes based on exception state |
| **Breakpoint assist** | Ask Copilot to set conditional breakpoints |
| **Watch expressions** | Copilot can suggest watch expressions |

## Agent Mode Capabilities

### Planning

The Plan agent creates structured implementation plans before coding begins.

| Attribute | Details |
| --- | --- |
| **Invocation** | Select **Plan** from agents dropdown, or type `/plan` followed by task description |
| **Behavior** | Researches codebase → asks clarifying questions → generates plan |
| **Todo list** | Tracks progress through implementation steps |
| **Plan storage** | Auto-saved to session memory (`/memories/session/plan.md`) |
| **Model setting** | `chat.planAgent.defaultModel` — select default model for planning |
| **Implementation model** | `github.copilot.chat.implementAgent.model` — model for implementation step |
| **Extra tools** | `github.copilot.chat.planAgent.additionalTools` — additional tools for plan agent |
| **Output** | Start implementation in same session, or open plan in editor for review |

### Memory

Agents retain context across sessions through a local memory tool and optional cloud-based Copilot Memory.

#### Memory Tool (Preview)

| Attribute | Details |
| --- | --- |
| **Setting** | `github.copilot.chat.tools.memory.enabled` (default: `true`) |
| **Storage** | Local files on your machine |
| **Management** | **Chat: Show Memory Files**, **Chat: Clear All Memory Files** |
| **Auto-load** | First 200 lines of user memory loaded at session start |

**Memory scopes:**

| Scope | Path | Persists Across Sessions | Persists Across Workspaces | Use For |
| --- | --- | --- | --- | --- |
| **User** | `/memories/` | Yes | Yes | Preferences, patterns, frequently used commands |
| **Repository** | `/memories/repo/` | Yes | No | Codebase conventions, project structure, build commands |
| **Session** | `/memories/session/` | No | No | Task-specific context, in-progress plans |

#### Copilot Memory (Preview, GitHub-hosted)

| Attribute | Details |
| --- | --- |
| **Setting** | `github.copilot.chat.copilotMemory.enabled` |
| **Storage** | GitHub-hosted (remote) |
| **Scope** | Repository-scoped only |
| **Cross-agent** | Shared across VS Code, Copilot cloud agent, Copilot code review, Copilot CLI |
| **Expiration** | Auto-deleted after 28 days |

### Agent Tools

Built-in tools available to Copilot in agent mode.

| Tool | Description |
| --- | --- |
| `codebase_search` | Semantic search across the workspace |
| `file_search` | Find files by name pattern |
| `read_file` | Read file contents |
| `edit_file` | Edit file contents |
| `create_file` | Create new files |
| `delete_file` | Delete files |
| `rename_or_move_file` | Rename or move files |
| `terminal` | Execute terminal commands |
| `grep_search` | Regex search in files |
| `list_directory` | List directory contents |
| `find_usages` | Find all references to a symbol |
| `find_implementations` | Find implementations of an interface/class |
| `diagnostics` | Get current editor diagnostics (errors/warnings) |
| `test` | Run tests and report results |
| `debug_launch` | Start a debug session |
| `fetch` | Fetch URL content |
| `thinking` | Extended thinking / reasoning |
| `vscode_search_extensions` | Search VS Code marketplace |
| `vscode_install_extensions` | Install VS Code extensions |
| `usages` | Find symbol usages across workspace |
| `git_log` | View git commit history |
| `git_diff` | View git diffs |
| `git_show` | Show git commit details |
| `runSubagent` | Delegate subtask to a subagent |

**Tool management:**

| Feature | Details |
| --- | --- |
| **Configure** | Select **Configure Tools** in Chat view to enable/disable tools |
| **Auto-approve** | `chat.tools.autoApprove` with tool ID allow-lists |
| **Tool sets** | Group tools into named sets in `.vscode/settings.json` |
| **Sandbox** | `chat.tools.sandbox.enabled` — run terminal commands in Docker sandbox |
| **URL approval** | Auto-approve external URL access via `chat.tools.urlAutoApproval` patterns |
| **Edit params** | Expand tool call in chat to edit parameters before executing |
| **Background terminal** | `chat.tools.terminal.backgroundNotifications` — notify on background output |

**Permission levels:**

| Level | Description |
| --- | --- |
| **Default Approvals** | Tools requiring approval show confirmation dialog |
| **Bypass Approvals** | Auto-approves all tool calls; may ask clarifying questions |
| **Autopilot** (Preview) | Auto-approves and auto-responds; fully autonomous until task completion |

### Subagents

Agent mode can delegate subtasks to context-isolated subagents for focused work.

| Attribute | Details |
| --- | --- |
| **Concept** | Independent AI agents with their own context window for focused subtasks |
| **Isolation** | Each subagent gets a clean context; returns only results to main agent |
| **Invocation** | Agent-initiated (via `runSubagent` tool); or user-hinted via prompt |
| **Custom agents** | `.agent.md` files can be invoked as specialized subagents |
| **Control** | `agents` frontmatter in `.agent.md` restricts which subagents an agent can use |
| **Nested** | `chat.subagents.allowInvocationsFromSubagents` — enable recursive nesting (max depth 5) |
| **Parallel** | Multiple subagents can run in parallel for independent subtasks |

**Orchestration patterns:**

| Pattern | Description |
| --- | --- |
| **Coordinator/Worker** | One agent manages workflow, delegates to specialized worker subagents |
| **Multi-perspective review** | Multiple review perspectives run in parallel as subagents |
| **Research-then-implement** | Subagent researches; main agent implements with clean context |
| **Recursive divide-and-conquer** | Agent delegates to instances of itself for large tasks |

### Local Agents

Run agent sessions locally with full workspace access.

| Attribute | Details |
| --- | --- |
| **Environment** | Runs in VS Code with access to local filesystem and terminal |
| **Tools** | Full tool access (file ops, terminal, debugging, extensions) |
| **Authentication** | Uses your GitHub Copilot subscription |
| **Security** | Tool calls require approval (configurable via `chat.tools.autoApprove`) |
| **Multi-session** | Multiple local agent sessions can run in parallel |

### Copilot CLI (Background Sessions)

Copilot CLI sessions run autonomously in the background on your local machine, freeing you to continue coding in VS Code while agents work independently.

| Attribute | Details |
| --- | --- |
| **Concept** | Background agent sessions using the Copilot CLI agent harness |
| **Auto-install** | VS Code automatically installs and configures the Copilot CLI |
| **Start** | Select **Copilot CLI** from Session Target dropdown, or run **Chat: New Copilot CLI** |
| **Isolation modes** | **Worktree** (Git worktree — changes isolated) or **Workspace** (direct edits) |
| **Worktree perms** | Worktree isolation auto-sets to Bypass Approvals (all tool calls auto-approved) |
| **Workspace perms** | All three permission levels available (Default, Bypass, Autopilot) |
| **Hand-off** | Continue any local/Plan agent conversation as a Copilot CLI session |
| **Plan → CLI** | Select **Start Implementation** → **Continue in Copilot CLI** from Plan agent |
| **Custom agents** | Enable with `github.copilot.chat.cli.customAgents.enabled` setting |
| **Slash commands** | `/compact`, `/yolo`, `/autoApprove`, reusable prompts, agent skills |
| **Persistence** | Sessions continue running when VS Code is closed |
| **Terminal** | Type `copilot` in integrated terminal, or use **GitHub Copilot CLI** terminal profile |
| **Customizations** | Uses same instructions, skills, hooks, agents, and prompt files |
| **Limitations** | Cannot access all VS Code built-in tools; limited to local MCP servers without auth |

### Cloud Agents (Copilot Coding Agent)

Cloud agents run on remote infrastructure and integrate with GitHub repositories for team collaboration through pull requests.

| Attribute | Details |
| --- | --- |
| **Concept** | Remote agent sessions running on cloud infrastructure |
| **Start** | Select **Cloud** from Session Type dropdown, or run **Chat: New Cloud Agent** |
| **Providers** | GitHub Copilot cloud agent (primary), plus third-party (Claude, Codex) |
| **Hand-off** | Continue any local or CLI conversation as a cloud session |
| **Plan → Cloud** | Select **Start Implementation** → **Continue in Cloud** from Plan agent |
| **CLI → Cloud** | Type `/delegate` in a Copilot CLI session to hand off to cloud |
| **From GitHub** | Assign a GitHub issue to Copilot, or invoke from GitHub.com |
| **Output** | Creates a pull request with detailed descriptions |
| **Config** | `copilot-setup-steps.yml` in `.github/` for environment setup |
| **Customizations** | Uses repo's instructions, skills, hooks, and agents |
| **Capabilities** | Large-scale refactoring, feature implementation, code review integration |
| **Limits** | Bounded by Copilot plan quotas; cannot access VS Code built-in tools directly |

### Third-Party Agents

Third-party agents from external providers (Anthropic, OpenAI) run within VS Code using the provider's SDK and agent harness. Both local and cloud sessions are supported.

| Attribute | Details |
| --- | --- |
| **Providers** | Claude Agent (Anthropic), OpenAI Codex |
| **Billing** | Through existing GitHub Copilot subscription |
| **Session types** | Local (select provider from Session Type dropdown) or Cloud (select Cloud → partner) |
| **Enable cloud** | Enable third-party cloud agents in Copilot account settings on GitHub |

**Claude Agent (Preview):**

| Attribute | Details |
| --- | --- |
| **Setting** | `github.copilot.chat.claudeAgent.enabled` |
| **SDK** | Uses Anthropic's Claude Agent SDK |
| **Slash commands** | `/agents`, `/hooks`, `/memory`, `/init`, `/pr-comments`, `/review`, `/security-review` |
| **Permission modes** | Edit automatically, Request approval, Plan |
| **Danger mode** | `github.copilot.chat.claudeAgent.allowDangerouslySkipPermissions` (sandbox only) |

**OpenAI Codex:**

| Attribute | Details |
| --- | --- |
| **Extension** | [OpenAI Codex](https://marketplace.visualstudio.com/items?itemName=openai.chatgpt) VS Code extension |
| **Prerequisite** | Copilot Pro+ subscription for authentication |
| **Sessions** | Interactive (local) or unattended (cloud) |

### Copilot Smart Actions

Context-sensitive AI actions available directly throughout the VS Code UI.

| Action | Details |
| --- | --- |
| **Fix with Copilot** | Lightbulb code action for diagnostics errors |
| **Explain** | Right-click → **Explain** for selected code |
| **Generate docs** | Right-click → **Generate Code** → **Generate Docs** |
| **Generate tests** | Right-click → **Generate Code** → **Generate Tests** |
| **Fix code** | Right-click → **Generate Code** → **Fix** |
| **Review code** | Right-click → **Generate Code** → **Review**; also PR-level review |
| **Rename symbols** | AI-generated rename suggestions based on symbol context |
| **Commit message** | Sparkle icon in Source Control to auto-generate commit message |
| **PR description** | Auto-generate PR titles and descriptions |
| **Resolve merge conflicts** | **Resolve Merge Conflict with AI** button in editor (Experimental) |
| **Implement TODO** | Code action on `TODO` comments → **Delegate to coding agent** |
| **Fix test failures** | Sparkle icon on failing tests in Test Explorer; or `/fixTestFailure` |
| **Fix terminal errors** | Sparkle Quick Fix in terminal after failed commands |
| **Generate alt text** | Code action on Markdown image links → **Generate alt text** |
| **Semantic search** | Search view finds semantically relevant results (`search.searchView.semanticSearchBehavior`) |
| **Search settings** | AI-powered settings search (`workbench.settings.showAISearchToggle`) |
| **Terminal assist** | `Ctrl+I` in terminal for command suggestions |

## Extension API Surfaces

### Chat Participant API

Build custom `@name` chat participants via VS Code extensions.

| API | Details |
| --- | --- |
| `vscode.chat.createChatParticipant(id, handler)` | Register a chat participant |
| `ChatResponseStream.markdown()` | Stream markdown responses |
| `ChatResponseStream.button()` | Add action buttons to responses |
| `contributes.chatParticipants` | Package.json declaration |

### Language Model API

Access and invoke language models programmatically from extensions.

| API | Details |
| --- | --- |
| `vscode.lm.selectChatModels()` | Select available models |
| `model.sendRequest(messages, options)` | Send chat completion request |
| `vscode.lm.registerLanguageModelChatProvider()` | Register custom model backends |

### Tool API

Register custom tools that agents and chat participants can invoke.

| API | Details |
| --- | --- |
| `vscode.lm.registerTool(name, tool)` | Register a tool |
| `contributes.languageModelTools` | Declare tools in package.json |
| `contributes.chatSkills` | Declare skills in package.json |
| **Annotations** | `confirmationMessages`, `readonlyHint`, `defaultApproval` |

### Other Extension Surfaces

| Surface | Relevance to BMAD |
| --- | --- |
| **Command API** | Register commands invocable from command palette |
| **Webview API** | Rich HTML panels for dashboards |
| **Tree View API** | Sidebar trees for skill/workflow navigation |
| **Task Provider API** | Register build/test tasks |
| **Testing API** | Test runner integration |
| **Custom Editor API** | Visual editors for YAML configs |

## Guides & Best Practices

### Context Engineering

| Practice | Details |
| --- | --- |
| **Instruction hierarchy** | Global instructions → scoped instructions → prompt files → chat context |
| **Context budget** | Be selective; too much context degrades quality |
| **Grounding files** | Use `#file:` to attach architecture docs, type definitions, examples |
| **Convention files** | `.github/copilot-instructions.md` for repo-wide conventions |
| **Scoped rules** | `.instructions.md` with `applyTo` for file-type-specific rules |

### Test-Driven Development with Copilot

| Practice | Details |
| --- | --- |
| **Test-first** | Write test files first; Copilot infers implementation from tests |
| **Test context** | Attach test files via `#file:` when requesting implementations |
| **Test generation** | Use "Generate Tests" smart action or `/create-skill` for testing workflows |

## VS Code Settings Reference

Key Copilot-related settings for `.vscode/settings.json`.

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `chat.agent.enabled` | boolean | `true` | Enable agent mode |
| `chat.agent.maxRequests` | number | `15` | Max autonomous iterations per agent turn |
| `github.copilot.chat.agent.autoFix` | boolean | `true` | Auto-fix lint/build errors |
| `github.copilot.chat.agent.runTasks` | boolean | `true` | Allow agent to run VS Code tasks |
| `chat.tools.autoApprove` | boolean | `false` | Auto-approve tool calls |
| `chat.tools.terminal.backgroundNotifications` | boolean | `true` | Notify on background terminal activity |
| `chat.tools.sandbox.enabled` | boolean | `false` | Run terminal commands in Docker sandbox |
| `chat.tools.urlAutoApproval` | object | — | URL patterns auto-approved for `fetch` tool |
| `chat.mcp.discovery.enabled` | boolean | `true` | Auto-discover MCP server configs |
| `github.copilot.chat.codeGeneration.useInstructionFiles` | boolean | `true` | Use instruction files |
| `github.copilot.chat.tools.memory.enabled` | boolean | `true` | Enable memory tool |
| `github.copilot.chat.copilotMemory.enabled` | boolean | `false` | Enable GitHub-hosted Copilot Memory |
| `chat.planAgent.defaultModel` | string | — | Default model for Plan agent |
| `github.copilot.chat.implementAgent.model` | string | — | Model for implementation step after planning |
| `github.copilot.chat.planAgent.additionalTools` | array | — | Additional tools available to Plan agent |
| `chat.promptFilesLocations` | array | — | Additional directories for prompt files |
| `chat.agentFilesLocations` | array | — | Additional directories for agent files |
| `chat.skillsLocations` | array | — | Additional directories for agent skills |
| `chat.hookFilesLocations` | array | — | Customize which hook files are loaded |
| `chat.useCustomAgentHooks` | boolean | `false` | Enable agent-scoped hooks in `.agent.md` frontmatter |
| `chat.plugins.enabled` | boolean | `false` | Enable agent plugins (Preview) |
| `chat.plugins.marketplaces` | array | — | Plugin marketplace repositories |
| `chat.artifacts.enabled` | boolean | `false` | Enable artifacts panel (Preview) |
| `chat.useCustomizationsInParentRepositories` | boolean | `false` | Discover customizations from parent repo root |
| `chat.subagents.allowInvocationsFromSubagents` | boolean | `false` | Allow nested subagents |
| `workbench.browser.enableChatTools` | boolean | `false` | Enable browser tools for agents |
| `github.copilot.selectedCompletionModel` | string | — | Override completion model |
| `github.copilot.chat.claudeAgent.enabled` | boolean | `false` | Enable Claude Agent (Preview) |
| `github.copilot.chat.cli.customAgents.enabled` | boolean | `false` | Enable custom agents in Copilot CLI sessions |
| `search.searchView.semanticSearchBehavior` | string | — | Enable semantic search in Search view |

## File System Layout

Summary of all Copilot-related files and directories.

```text
.github/
├── copilot-instructions.md          # Global custom instructions
├── copilot-setup-steps.yml          # Cloud agent environment setup
├── instructions/                    # Scoped instruction files
│   ├── typescript.instructions.md   #   applyTo: "**/*.ts"
│   └── tests.instructions.md       #   applyTo: "**/*.test.*"
├── prompts/                         # Prompt file templates
│   └── component.prompt.md          #   Reusable slash commands
├── agents/                          # Custom agents
│   └── reviewer.agent.md            #   Agent with persona and tools
├── skills/                          # Agent skills
│   └── bmad-help/                   #   Skill directories
│       └── SKILL.md                 #     Skill entry point
└── hooks/                           # Hook configuration
    └── format.json                  #   Lifecycle event hooks

AGENTS.md                            # Always-on instructions (root-level)

.vscode/
├── settings.json                    # Copilot settings
└── mcp.json                         # MCP server configuration
```
