const DRAFT_STATES = Object.freeze(['ingested', 'drafted', 'review_pending', 'approved', 'rejected', 'promoted', 'superseded']);

const ARTIFACT_KINDS = Object.freeze([
  'pack_toml',
  'skill_md',
  'module_yaml',
  'module_help_csv',
  'review_md',
  'validation_report',
  'tool_leverage_packet',
  'official_mcp_packet',
  'capability_refactor_packet',
  'implementation_readiness_packet',
  'workspace_handoff_packet',
  'customize_handoff_packet',
]);

const REVIEW_EVENT_TYPES = Object.freeze(['created', 'commented', 'requested_changes', 'approved', 'rejected', 'exported', 'promoted']);

const BMAD_HANDOFF_PACKETS = Object.freeze([
  {
    kind: 'tool_leverage_packet',
    path: 'review-packets/tool-leverage-review.md',
    title: 'Tool Leverage Review Handoff',
    skill: 'bmad-tool-leverage-review-prompt',
  },
  {
    kind: 'official_mcp_packet',
    path: 'review-packets/official-mcp-addition.md',
    title: 'Official MCP Addition Handoff',
    skill: 'bmad-highest-leverage-official-mcp-addition-prompt',
  },
  {
    kind: 'capability_refactor_packet',
    path: 'review-packets/capability-refactor-plan.md',
    title: 'Capability Refactor Plan Handoff',
    skill: 'bmad-capability-refactor-plan-prompt',
  },
  {
    kind: 'implementation_readiness_packet',
    path: 'review-packets/implementation-readiness.md',
    title: 'Implementation Readiness Handoff',
    skill: 'bmad-check-implementation-readiness',
  },
  {
    kind: 'workspace_handoff_packet',
    path: 'review-packets/workspace-entry.md',
    title: 'Workspace Entry Handoff',
    skill: 'bmad-workspace',
  },
  {
    kind: 'customize_handoff_packet',
    path: 'review-packets/customize-handoff.md',
    title: 'Customize Handoff',
    skill: 'bmad-customize',
  },
]);

module.exports = {
  ARTIFACT_KINDS,
  BMAD_HANDOFF_PACKETS,
  DRAFT_STATES,
  REVIEW_EVENT_TYPES,
};
