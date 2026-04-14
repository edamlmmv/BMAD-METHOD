---
name: bmad-advanced-elicitation
description: 'Push the LLM to reconsider, refine, and improve its recent output. Use when user asks for deeper critique or mentions a known deeper critique method, e.g. socratic, first principles, pre-mortem, red team.'
---

# Advanced Elicitation

**Goal:** Push the LLM to reconsider, refine, and improve its recent output.

---

## CRITICAL LLM INSTRUCTIONS

- **MANDATORY:** Execute ALL steps in the flow section IN EXACT ORDER
- DO NOT skip steps or change the sequence
- HALT immediately when halt-conditions are met
- Each action within a step is a REQUIRED action to complete that step
- Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution
- **YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the `communication_language`**

---

## INTEGRATION (When Invoked Indirectly)

When invoked from another prompt or process:

1. Receive or review the current section content that was just generated
2. **Default to autonomous mode** — auto-select and execute the best methods for the content (see §AUTONOMOUS MODE below)
3. Return the enhanced version back when complete (or when user selects 'x' in interactive mode)
4. The enhanced content replaces the original section content in the output document

If the invoking skill explicitly requests interactive mode, fall back to the interactive menu flow instead.

---

## AUTONOMOUS MODE

When invoked indirectly from another skill, when the user says "run autonomously", "just pick the best ones", or "you choose", or when the context makes it clear the user does not want to manually select methods:

### Step A1: Load and Analyze

**Action:** Load and read `./methods.csv` and '{project-root}/_bmad/_config/agent-manifest.csv'

Analyze the current content and context to determine:

- **Content type** — requirements, architecture, UX, code, strategy, etc.
- **Content maturity** — early draft, mid-refinement, near-final polish
- **Risk profile** — high-stakes (security, safety, compliance) vs. standard
- **Gap type** — missing depth, missing perspectives, missing validation, missing creativity

### Step A2: Auto-Select Methods

Use the `best_for` column in `methods.csv` to match methods to the detected context. Select 2-3 methods that provide complementary coverage:

| Content signal | Method categories to favor | Example methods |
|---|---|---|
| Requirements or scope content | collaboration, core | Stakeholder Round Table, First Principles Analysis |
| Architecture or technical decisions | technical, advanced | Architecture Decision Records, Tree of Thoughts |
| Risk, security, or compliance | risk, competitive | Pre-mortem Analysis, Red Team vs Blue Team |
| UX or user-facing content | collaboration, creative | User Persona Focus Group, SCAMPER Method |
| Early draft needing depth | core, research | Socratic Questioning, Critique and Refine |
| Near-final needing validation | advanced, risk | Self-Consistency Validation, Challenge from Critical Perspective |
| Creative or ideation content | creative, collaboration | What If Scenarios, Improv Yes-And |

Present the selection with rationale before executing:

```
🔍 Auto-selected elicitation methods for this content:
1. [Method Name] — [one-line reason why this fits]
2. [Method Name] — [one-line reason why this fits]
3. [Method Name] — [one-line reason why this fits]

Applying in sequence...
```

### Step A3: Execute and Present

- Execute each selected method in sequence on the content
- Each method builds on the previous method's enhancements
- After all methods complete, present the fully enhanced version with a summary of what changed
- **CRITICAL:** Ask the user if they would like to apply the changes to the doc (y/n/other) and HALT to await response
- **CRITICAL:** ONLY if Yes, apply the changes. IF No, discard proposed changes. If any other reply, follow the instructions given
- After applying or discarding, offer: `[m] Run more methods  [i] Switch to interactive menu  [x] Proceed`

---

## INTERACTIVE MODE (Default When Invoked Directly)

When the user invokes this skill directly (e.g., "run advanced elicitation", "use elicitation") and does not request autonomous mode:

### Step 1: Method Registry Loading

**Action:** Load and read `./methods.csv` and '{project-root}/_bmad/_config/agent-manifest.csv'

#### CSV Structure

- **category:** Method grouping (core, structural, risk, etc.)
- **method_name:** Display name for the method
- **description:** Rich explanation of what the method does, when to use it, and why it's valuable
- **output_pattern:** Flexible flow guide using arrows (e.g., "analysis -> insights -> action")
- **best_for:** Semicolon-separated context tags for autonomous selection

#### Context Analysis

- Use conversation history
- Analyze: content type, complexity, stakeholder needs, risk level, and creative potential

#### Smart Selection

1. Analyze context: Content type, complexity, stakeholder needs, risk level, creative potential
2. Parse descriptions: Understand each method's purpose from the rich descriptions in CSV
3. Select 5 methods: Choose methods that best match the context based on their descriptions and `best_for` tags
4. Balance approach: Include mix of foundational and specialized techniques as appropriate

---

### Step 2: Present Options and Handle Responses

#### Display Format

```
**Advanced Elicitation Options**
_If party mode is active, agents will join in._
Choose a number (1-5), [r] to Reshuffle, [a] List All, [auto] Auto-pick best, or [x] to Proceed:

1. [Method Name] — [brief why it fits this content]
2. [Method Name] — [brief why it fits this content]
3. [Method Name] — [brief why it fits this content]
4. [Method Name] — [brief why it fits this content]
5. [Method Name] — [brief why it fits this content]
r. Reshuffle the list with 5 new options
a. List all methods with descriptions
auto. Let me pick the best 2-3 and run them
x. Proceed / No Further Actions
```

#### Response Handling

**Case 1-5 (User selects a numbered method):**

- Execute the selected method using its description from the CSV
- Adapt the method's complexity and output format based on the current context
- Apply the method creatively to the current section content being enhanced
- Display the enhanced version showing what the method revealed or improved
- **CRITICAL:** Ask the user if they would like to apply the changes to the doc (y/n/other) and HALT to await response.
- **CRITICAL:** ONLY if Yes, apply the changes. IF No, discard your memory of the proposed changes. If any other reply, try best to follow the instructions given by the user.
- **CRITICAL:** Re-present the same 1-5,r,x prompt to allow additional elicitations

**Case r (Reshuffle):**

- Select 5 random methods from methods.csv, present new list with same prompt format
- When selecting, try to think and pick a diverse set of methods covering different categories and approaches, with 1 and 2 being potentially the most useful for the document or section being discovered

**Case auto (Auto-pick):**

- Switch to §AUTONOMOUS MODE Step A2 — auto-select the best 2-3 methods and execute them in sequence
- After completion, return to the interactive menu for further elicitations or proceed

**Case x (Proceed):**

- Complete elicitation and proceed
- Return the fully enhanced content back to the invoking skill
- The enhanced content becomes the final version for that section
- Signal completion back to the invoking skill to continue with next section

**Case a (List All):**

- List all methods with their descriptions from the CSV in a compact table
- Allow user to select any method by name or number from the full list
- After selection, execute the method as described in the Case 1-5 above

**Case: Direct Feedback:**

- Apply changes to current section content and re-present choices

**Case: Multiple Numbers:**

- Execute methods in sequence on the content, then re-offer choices

---

## Execution Guidelines

These apply to both autonomous and interactive modes:

- **Method execution:** Use the description from CSV to understand and apply each method
- **Output pattern:** Use the pattern as a flexible guide (e.g., "paths -> evaluation -> selection")
- **Dynamic adaptation:** Adjust complexity based on content needs (simple to sophisticated)
- **Creative application:** Interpret methods flexibly based on context while maintaining pattern consistency
- Focus on actionable insights
- **Stay relevant:** Tie elicitation to specific content being analyzed (the current section from the document being created unless user indicates otherwise)
- **Identify personas:** For single or multi-persona methods, clearly identify viewpoints, and use party members if available in memory already
- **Critical loop behavior:** In interactive mode, always re-offer the 1-5,r,a,auto,x choices after each method execution
- Continue until user selects 'x' to proceed with enhanced content, confirm or ask the user what should be accepted from the session
- Each method application builds upon previous enhancements
- **Content preservation:** Track all enhancements made during elicitation
- **Iterative enhancement:** Each selected method should:
  1. Apply to the current enhanced version of the content
  2. Show the improvements made
  3. Return to the prompt (interactive) or proceed to next method (autonomous)
