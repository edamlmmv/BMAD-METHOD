---
title: VS Code Copilot Capabilities
description: Comprehensive reference of VS Code GitHub Copilot features, configuration surfaces, and extensibility points
sidebar:
  order: 6
---

Complete reference for VS Code GitHub Copilot capabilities aggregated from the official documentation. This page catalogs every configuration surface, chat feature, agent capability, and extensibility point that VS Code Copilot exposes — organized so BMAD skills, workflows, and agents can explicitly reference and leverage them.

## Customization Surfaces

### Custom Instructions

Custom instructions let you define persistent context and rules that Copilot follows across all interactions in a workspace.

| Attribute | Details |
| --- | --- |
| **File** | `.github/copilot-instructions.md` |
| **Scope** | Workspace-level; applies to all Copilot interactions in the repo |
| **Format** | Markdown; Copilot reads the full content as system-level context |
| **Setting** | `github.copilot.chat.codeGeneration.useInstructionFiles` (default: `true`) |
| **Behavior** | Automatically included in every chat request; no explicit `#` reference needed |
| **Use cases** | Coding conventions, framework preferences, naming standards, architecture rules |
| **Limitations** | Not shown in chat UI; applies silently; one file per repo |

### Instruction Files (Scoped)

Fine-grained instruction files that apply to specific file patterns or contexts.

| Attribute | Details |
| --- | --- |
| **Directory** | `.github/instructions/` |
| **Format** | Markdown with YAML frontmatter (`applyTo` glob pattern) |
| **Frontmatter** | `applyTo: "**/*.ts"` — glob pattern controlling when instructions apply |
| **Scope** | Auto-attached when editing files matching the `applyTo` pattern |
| **Manual use** | Can be referenced explicitly with `#instructions` in chat |
| **Setting** | `github.copilot.chat.codeGeneration.useInstructionFiles` |
| **Use cases** | Language-specific rules, test conventions, component patterns |

**Example frontmatter:**

```yaml
---
applyTo: "**/*.test.ts"
---
Use vitest for all tests. Prefer `describe`/`it` blocks over `test`.
```

### Prompt Files (.prompt.md)

Reusable, parameterized prompt templates that can be invoked as slash commands in chat.

| Attribute | Details |
| --- | --- |
| **Directory** | `.github/prompts/` (or any directory; configured via setting) |
| **Extension** | `.prompt.md` |
| **Setting** | `chat.promptFiles` — enable and configure prompt file directories |
| **Invocation** | Type `/` in chat to see available prompts |
| **Format** | Markdown with optional YAML frontmatter for mode and description |
| **Context refs** | Can embed `#file:path/to/file` references for automatic context attachment |
| **Variables** | Support `${input:variableName}` for user-prompted values |
| **Mode binding** | Frontmatter `mode: "agent"` or `mode: "edit"` to constrain to specific chat modes |
| **Description** | Frontmatter `description:` shown in slash command picker |
| **Nesting** | Prompt files can reference other prompt files |

**Example prompt file:**

```markdown
---
mode: "agent"
description: "Generate a React component with tests"
---
Create a React component for #file:src/types.ts

Use the patterns from #file:src/components/Example.tsx
Name: ${input:componentName}
```

### Custom Chat Modes

Define custom chat modes that control how Copilot behaves, which tools it can use, and what instructions it follows.

| Attribute | Details |
| --- | --- |
| **Directory** | `.github/chat-modes/` (workspace) or `~/.config/Code/User/chat-modes/` (global) |
| **Extension** | `.chatmode.md` |
| **Format** | Markdown with YAML frontmatter |
| **Frontmatter keys** | `description`, `tools` (array of allowed tool IDs) |
| **Tool restriction** | Only tools listed in `tools:` are available in that mode |
| **Invocation** | Chat mode picker at top of chat panel |
| **Use cases** | Restrict agent to specific tools, create review-only mode, documentation-only mode |

### Custom Agents (Chat Participants)

Define workspace-local chat participants with specific expertise and tool access.

| Attribute | Details |
| --- | --- |
| **Directory** | `.github/agents/` |
| **Extension** | `.agent.md` |
| **Format** | Markdown with YAML frontmatter |
| **Frontmatter keys** | `description`, `tools` (array), `if` (activation condition) |
| **Invocation** | `@agent-name` in chat |
| **Tools** | Array of tool IDs the agent can use; empty = all tools |
| **Conditional** | `if: "resourceExists('pyproject.toml')"` for conditional activation |
| **Instructions** | Markdown body serves as the agent's system prompt |
| **Use cases** | Domain experts, specialized reviewers, project-specific assistants |

### Agent Skills

Skills extend agent capabilities with structured, multi-step workflows.

| Attribute | Details |
| --- | --- |
| **Directory** | `.github/skills/` or `.claude/skills/` (auto-discovered) |
| **Structure** | `{skill-name}/SKILL.md` with optional supporting files |
| **Format** | Markdown with YAML frontmatter (`name`, `description`) |
| **Discovery** | Auto-discovered by VS Code; listed in `#skills` context |
| **Invocation** | Referenced by name; agents can invoke skills as tools |
| **Frontmatter** | `name:` must match directory name; `description:` shown in skill picker |

### Language Model Selection

Configure which AI models Copilot uses for different tasks.

| Attribute | Details |
| --- | --- |
| **Chat model** | Model picker in chat panel; supports GPT-4o, Claude, Gemini, o1, o3, etc. |
| **Completions** | `github.copilot.selectedCompletionModel` setting |
| **Per-request** | Model can be changed per chat message via the model dropdown |
| **Custom models** | Extension API `lm.registerLanguageModelChatProvider()` for custom providers |
| **Capabilities** | Models vary in speed, context window, reasoning depth, and tool use support |

### MCP Servers

Model Context Protocol servers extend Copilot with external tool access.

| Attribute | Details |
| --- | --- |
| **Configuration** | `.vscode/mcp.json` (workspace) or user `settings.json` |
| **Format** | JSON with server definitions |
| **Transport** | `stdio` (local process) or `sse` (remote HTTP) |
| **Keys** | `servers: { "name": { "type": "stdio", "command": "...", "args": [...], "env": {...} } }` |
| **Input variables** | `${input:name}` for user-prompted values; `${workspaceFolder}` for paths |
| **Discovery** | Tools from MCP servers appear in `#tools` and are available to agents |
| **Approval** | Controlled by `chat.tools.autoApprove` setting |
| **Setting** | `chat.mcp.discovery.enabled` — auto-discover `mcp.json` in workspace |

**Example `.vscode/mcp.json`:**

```json
{
  "servers": {
    "my-server": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-server.js"],
      "env": { "API_KEY": "${input:apiKey}" }
    }
  }
}
```

### Copilot Hooks

Hooks let you run commands automatically before or after Copilot agent actions.

| Attribute | Details |
| --- | --- |
| **Setting** | `github.copilot.chat.agent.hooks` in `.vscode/settings.json` |
| **Hook points** | `postSave`, `postCreate`, `postDelete`, `postRename` |
| **Format** | Array of command objects per hook point |
| **Command keys** | `command` (string), `glob` (file pattern filter), `working_directory` |
| **Approval** | Each hook execution requires user approval (safety) |
| **Use cases** | Auto-format on save, auto-lint, run tests after file creation |

**Example:**

```json
{
  "github.copilot.chat.agent.hooks": {
    "postSave": [
      { "command": "npx prettier --write ${file}", "glob": "**/*.{ts,js}" }
    ],
    "postCreate": [
      { "command": "npm run lint:fix -- ${file}" }
    ]
  }
}
```

### Agent Plugins (Extensibility)

Extend Copilot via VS Code extension API to create custom chat participants, tools, and model providers.

| Attribute | Details |
| --- | --- |
| **Chat participant API** | `vscode.chat.createChatParticipant()` — register `@name` participants |
| **Tool API** | `vscode.lm.registerTool()` — register tools callable by agents |
| **Language model API** | `vscode.lm.registerLanguageModelChatProvider()` — custom model backends |
| **Package.json** | Declare via `contributes.chatParticipants` and `contributes.languageModelTools` |
| **Tool annotations** | `confirmationMessages`, `readonlyHint`, `defaultApproval` metadata |

## Chat Features

### Chat Panel (Copilot Chat)

The primary interaction surface for conversational AI assistance.

| Attribute | Details |
| --- | --- |
| **Open** | `Ctrl+Alt+I` / `Cmd+Alt+I` or Activity Bar icon |
| **Modes** | Ask, Edit, Agent (configurable per conversation) |
| **Ask mode** | Read-only Q&A; no file modifications |
| **Edit mode** | Proposes inline edits to specified files |
| **Agent mode** | Autonomous; can run terminal commands, edit files, use tools |
| **Agent setting** | `chat.agent.enabled` (default: `true`) |
| **Max requests** | `chat.agent.maxRequests` — limit autonomous iterations |
| **Auto-fix** | `github.copilot.chat.agent.autoFix` — auto-fix lint/build errors |
| **Run tasks** | `github.copilot.chat.agent.runTasks` — allow task execution |

### Chat Sessions

Manage multiple concurrent conversations with Copilot.

| Attribute | Details |
| --- | --- |
| **Multi-session** | Multiple chat tabs; each maintains independent context |
| **History** | Sessions persist across VS Code restarts |
| **Export** | Right-click session → Export to markdown |
| **Session title** | Auto-generated from first message; editable |
| **Clear** | Clear session to reset context without closing tab |

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

### Inline Chat

Trigger Copilot directly in the editor at the cursor position.

| Attribute | Details |
| --- | --- |
| **Trigger** | `Ctrl+I` / `Cmd+I` |
| **Scope** | Acts on selected code or cursor position |
| **Actions** | Explain, fix, refactor, generate, document |
| **Preview** | Shows inline diff preview before accepting |
| **Accept** | Enter to accept; Escape to dismiss |
| **History** | `↑`/`↓` to cycle through previous inline prompts |

### Review Code Edits

Review and accept/reject Copilot's proposed changes.

| Attribute | Details |
| --- | --- |
| **Diff view** | Side-by-side or inline diff of proposed changes |
| **Navigation** | Arrow buttons or `F7`/`Shift+F7` to navigate between changes |
| **Accept/Reject** | Per-file or per-hunk accept/reject |
| **Undo** | Full undo of accepted changes via editor undo |
| **Review scope** | Changes grouped by file in the chat response |

### Chat Checkpoints

Save and restore conversation state at specific points.

| Attribute | Details |
| --- | --- |
| **Auto-checkpoints** | Created automatically at each agent iteration |
| **Restore** | Click checkpoint to restore conversation and file state to that point |
| **File state** | Checkpoints capture both conversation and workspace file state |
| **Branching** | Restore a checkpoint and take a different direction |
| **UI** | Checkpoint markers shown in chat timeline |

### Chat Debug View

Use Copilot integrated with the VS Code debugger.

| Attribute | Details |
| --- | --- |
| **Context** | `#debugContext` attaches current debug session state (call stack, variables) |
| **Fix suggestions** | Copilot can suggest fixes based on exception state |
| **Breakpoint assist** | Ask Copilot to set conditional breakpoints |
| **Watch expressions** | Copilot can suggest watch expressions |

### Prompt Crafting Best Practices

Patterns for effective Copilot interactions.

| Practice | Details |
| --- | --- |
| **Be specific** | Include technology, framework, and pattern requirements |
| **Provide context** | Use `#file:` and `#selection` to ground requests |
| **Iterate** | Refine through follow-up messages in the same session |
| **Scope work** | One task per message; break complex work into steps |
| **Examples** | Include input/output examples for generation tasks |
| **Constraints** | State what NOT to do alongside what to do |
| **Verification** | Ask Copilot to verify its own output against requirements |

## Agent Mode Capabilities

### Planning

Agent mode can create and follow multi-step plans.

| Attribute | Details |
| --- | --- |
| **Auto-planning** | Agent mode automatically plans complex multi-step tasks |
| **Plan display** | Plan shown as checklist in chat; items checked as completed |
| **Plan editing** | User can modify the plan before agent begins execution |
| **Setting** | `chat.agent.planning` — `auto`, `always`, `never` |
| **Manual trigger** | Prompt with "create a plan first" to force planning |
| **Iteration** | Agent re-plans when encountering obstacles |

### Memory

Persistent context that agents remember across sessions.

| Attribute | Details |
| --- | --- |
| **Memory file** | `.github/copilot-memory.md` — persistent facts Copilot remembers |
| **Scope** | Workspace-level; shared across all chat sessions |
| **Format** | Markdown; each fact as a bullet point or section |
| **Auto-save** | Agent can be instructed to save learnings to memory |
| **Retrieval** | Copilot automatically retrieves relevant memories |
| **Setting** | `github.copilot.chat.memory.enabled` |

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

### Subagents

Agent mode can delegate subtasks to specialized subagents.

| Attribute | Details |
| --- | --- |
| **Concept** | The main agent can spawn specialized subagents for focused subtasks |
| **Isolation** | Each subagent operates with its own context window |
| **Use cases** | Parallel file analysis, independent module work, research tasks |
| **Custom agents** | `.agent.md` files act as invocable subagents |

### Local Agents

Run agent sessions locally with full workspace access.

| Attribute | Details |
| --- | --- |
| **Environment** | Runs in VS Code with access to local filesystem and terminal |
| **Tools** | Full tool access (file ops, terminal, debugging, extensions) |
| **Authentication** | Uses your GitHub Copilot subscription |
| **Security** | Tool calls require approval (configurable via `chat.tools.autoApprove`) |
| **Multi-session** | Multiple local agent sessions can run in parallel |

### Copilot CLI

Command-line interface for Copilot interactions outside VS Code.

| Attribute | Details |
| --- | --- |
| **Install** | Part of GitHub CLI: `gh extension install github/gh-copilot` |
| **Commands** | `gh copilot suggest` — command suggestions; `gh copilot explain` — explain commands |
| **Shell integration** | Works in bash, zsh, PowerShell |

### Cloud Agents (Copilot Coding Agent)

GitHub-hosted agent sessions that run in the cloud.

| Attribute | Details |
| --- | --- |
| **Trigger** | Assign a GitHub issue to Copilot, or invoke from VS Code |
| **Environment** | Runs in a cloud VM with repo access |
| **Output** | Creates a pull request with changes |
| **Config** | `copilot-setup-steps.yml` in `.github/` for environment setup |
| **Session file** | `.github/copilot-setup-steps.yml` defines install/build/test steps |
| **Limits** | Bounded by Copilot plan quotas |
| **Review** | PR review workflow; can iterate based on review comments |

### Third-Party Agents

Extend Copilot with external service integrations.

| Attribute | Details |
| --- | --- |
| **Marketplace** | GitHub Marketplace Copilot extensions |
| **Protocol** | Agents communicate via Copilot extension protocol |
| **Invocation** | `@agent-name` in chat |
| **Capabilities** | Can access external APIs, databases, services |
| **Examples** | `@docker`, `@azure`, database agents |

### Copilot Smart Actions

Context-sensitive actions available directly in the editor.

| Attribute | Details |
| --- | --- |
| **Fix** | Lightbulb → "Fix with Copilot" for diagnostics |
| **Explain** | Right-click → "Copilot: Explain This" |
| **Generate docs** | Right-click → "Copilot: Generate Docs" |
| **Generate tests** | Right-click → "Copilot: Generate Tests" |
| **Rename** | Smart rename suggestions based on code semantics |
| **Commit message** | Auto-generate commit messages from staged changes |
| **PR description** | Auto-generate PR descriptions |
| **Terminal** | `Ctrl+I` in terminal for command suggestions |

## Extension API Surfaces

### Chat Participant API

Build custom `@name` chat participants via VS Code extensions.

| API | Details |
| --- | --- |
| `vscode.chat.createChatParticipant(id, handler)` | Register a chat participant |
| `ChatRequestHandler` | Callback receiving `ChatRequest`, `ChatContext`, `ChatResponseStream` |
| `ChatResponseStream.markdown()` | Stream markdown responses |
| `ChatResponseStream.button()` | Add action buttons to responses |
| `ChatResponseStream.reference()` | Add file/symbol references |
| `ChatResponseStream.progress()` | Show progress indicator |
| `contributes.chatParticipants` | Package.json declaration with `id`, `name`, `description` |

### Language Model API

Access and invoke language models programmatically from extensions.

| API | Details |
| --- | --- |
| `vscode.lm.selectChatModels()` | Select available models by family/vendor |
| `model.sendRequest(messages, options)` | Send chat completion request |
| `LanguageModelChatMessage` | User, assistant, and system message types |
| `LanguageModelToolCallPart` | Tool use integration in model responses |
| `vscode.lm.registerLanguageModelChatProvider()` | Register custom model backends |

### Tool API

Register custom tools that agents and chat participants can invoke.

| API | Details |
| --- | --- |
| `vscode.lm.registerTool(name, tool)` | Register a tool |
| `contributes.languageModelTools` | Declare tools in package.json |
| `LanguageModelTool.invoke()` | Tool implementation method |
| `LanguageModelTool.prepareInvocation()` | Pre-invocation hook for confirmation UI |
| **Annotations** | `confirmationMessages`, `readonlyHint`, `defaultApproval` |

### Other Extension Guide Surfaces

Additional VS Code extension capabilities relevant to AI-assisted workflows.

| Surface | Relevance to BMAD |
| --- | --- |
| **Command API** | Register commands invocable from command palette or keybindings |
| **Webview API** | Rich HTML panels for dashboards, visualizations |
| **Tree View API** | Sidebar trees for skill/workflow navigation |
| **Task Provider API** | Register build/test tasks; integrate with agent `runTasks` |
| **SCM Provider API** | Custom source control; track BMAD artifact changes |
| **Debugger Extension** | Custom debug configurations for workflow debugging |
| **Testing API** | Test runner integration; connect to Copilot test generation |
| **Custom Editor API** | Visual editors for YAML configs, workflow diagrams |
| **Markdown Extension** | Custom markdown rendering for BMAD artifacts |
| **Telemetry API** | Usage tracking for BMAD skill invocations |

## Guides & Best Practices

### Context Engineering

Principles for providing optimal context to Copilot.

| Practice | Details |
| --- | --- |
| **Instruction hierarchy** | Global instructions → scoped instructions → prompt files → chat context |
| **Context budget** | Be selective; too much context degrades quality |
| **Grounding files** | Use `#file:` to attach architecture docs, type definitions, examples |
| **Negative instructions** | Explicitly state what to avoid |
| **Convention files** | `.github/copilot-instructions.md` for repo-wide conventions |
| **Scoped rules** | `.github/instructions/*.md` with `applyTo` for file-type-specific rules |

### Test-Driven Development with Copilot

Using Copilot in a TDD workflow.

| Practice | Details |
| --- | --- |
| **Test-first** | Write test files first; Copilot infers implementation from tests |
| **Test context** | Attach test files via `#file:` when requesting implementations |
| **Test generation** | Use "Generate Tests" smart action or prompt for test generation |
| **Coverage** | Ask Copilot to identify untested code paths |

### Debugging with Copilot

Leverage Copilot during debugging sessions.

| Practice | Details |
| --- | --- |
| **Debug context** | Use `#debugContext` to share current debug state |
| **Exception analysis** | Copilot analyzes stack traces and variable state |
| **Fix suggestions** | Copilot proposes fixes based on runtime state |

## VS Code Settings Reference

All Copilot-related settings that can be configured in `.vscode/settings.json`.

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `chat.agent.enabled` | boolean | `true` | Enable agent mode |
| `chat.agent.maxRequests` | number | `15` | Max autonomous iterations per agent turn |
| `chat.agent.planning` | string | `"auto"` | Planning behavior: `auto`, `always`, `never` |
| `github.copilot.chat.agent.autoFix` | boolean | `true` | Auto-fix lint/build errors |
| `github.copilot.chat.agent.runTasks` | boolean | `true` | Allow agent to run VS Code tasks |
| `github.copilot.chat.agent.hooks` | object | `{}` | Pre/post hooks for agent file operations |
| `chat.tools.autoApprove` | boolean | `false` | Auto-approve tool calls without user confirmation |
| `chat.tools.terminal.backgroundNotifications` | boolean | `true` | Notify on background terminal activity |
| `chat.promptFiles` | boolean | `true` | Enable `.prompt.md` file discovery |
| `chat.mcp.discovery.enabled` | boolean | `true` | Auto-discover MCP server configs |
| `github.copilot.chat.codeGeneration.useInstructionFiles` | boolean | `true` | Use instruction files for code generation |
| `github.copilot.chat.memory.enabled` | boolean | `true` | Enable persistent memory |
| `github.copilot.selectedCompletionModel` | string | — | Override completion model |

## File System Layout

Summary of all Copilot-related files and directories.

```text
.github/
├── copilot-instructions.md          # Global custom instructions
├── copilot-memory.md                # Persistent agent memory
├── copilot-setup-steps.yml          # Cloud agent environment setup
├── instructions/                    # Scoped instruction files
│   ├── typescript.md                #   applyTo: "**/*.ts"
│   └── tests.md                     #   applyTo: "**/*.test.*"
├── prompts/                         # Prompt file templates
│   └── component.prompt.md          #   Reusable slash commands
├── agents/                          # Custom chat agents
│   └── reviewer.agent.md            #   @reviewer participant
├── skills/                          # Agent skills
│   └── bmad-help/                   #   Skill directories
│       └── SKILL.md                 #     Skill entry point
└── chat-modes/                      # Custom chat modes
    └── review.chatmode.md           #   Mode definitions

.vscode/
├── settings.json                    # Copilot settings & hooks
└── mcp.json                         # MCP server configuration
```
