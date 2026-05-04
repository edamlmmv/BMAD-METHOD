const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { readSessionStatus } = require('./status');

const SESSION_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

function renderSessionHandoff({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertSessionId(sessionId);

  const status = readSessionStatus({ sessionId, runtimeRoot });
  if (status.status === 'invalid') {
    throw new Error(`SESSION_INVALID: session artifacts are invalid for ${sessionId}`);
  }

  const instance = readJson(path.join(status.sessionRoot, 'instance.json'));
  const packet = readOptionalJson(status.artifacts.packet.path);
  const review = readOptionalJson(status.artifacts.review.path);
  const runtimeRootResolved = path.resolve(runtimeRoot);

  return [
    `# BMAD Workspace Handoff: ${sessionId}`,
    '',
    renderIdentity({ status, instance, runtimeRoot: runtimeRootResolved }),
    renderStatus(status),
    renderBlockers(status),
    renderPacket(status, packet),
    renderSetupGate(status),
    renderResultLedger(status),
    renderReview(status, review),
    renderBaseImprovement(status),
    renderNextRoute(status, packet),
    renderReadOnlyBoundary(),
  ].join('\n');
}

function assertSessionId(sessionId) {
  if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error('SESSION_NOT_FOUND: handoff requires a valid session id');
  }
}

function renderIdentity({ status, instance, runtimeRoot }) {
  const typeLabel = status.sessionType === 'base-improvement' ? 'Base Improvement' : status.sessionType;
  return `## Identity

- sessionId: \`${status.sessionId}\`
- sessionRoot: \`${status.sessionRoot}\`
- runtimeRoot: \`${runtimeRoot}\`
- sessionType: \`${status.sessionType}\`${typeLabel === status.sessionType ? '' : ` (${typeLabel})`}
- createdAt: ${instance.createdAt || 'Not found'}`;
}

function renderStatus(status) {
  return `## Status

- state: \`${status.status}\`
- lifecycle: ${formatList(status.lifecycle)}
- checks:
${formatChecks(status.checks)}`;
}

function renderBlockers(status) {
  const blockers = status.checks.filter((item) => item.severity === 'error');
  return `## Blockers

${formatChecks(blockers)}`;
}

function renderPacket(status, packet) {
  if (!status.artifacts.packet.present || !packet) {
    return `## BMAD Work Packet

- packet: Not found
- renderedPrompt: Not found`;
  }

  const renderedPromptPath = packet.renderedPromptRef ? path.join(status.sessionRoot, packet.renderedPromptRef) : null;
  return `## BMAD Work Packet

- packetRef: \`${status.artifacts.packet.ref}\`
- packetPath: \`${status.artifacts.packet.path}\`
- kind: \`${packet.kind || 'Not found'}\`
- packetVersion: \`${packet.packetVersion || 'Not found'}\`
- bmadWorkflow: \`${packet.bmadWorkflow || 'Not found'}\`
- routeWorkflow: \`${status.routing?.selectedWorkflow || packet.bmadWorkflow || 'Not found'}\`
- routeSource: \`${status.routing?.source || 'legacy-missing'}\`
- routeConfidence: \`${status.routing?.confidence || 'weak'}\`
- routeReasonCodes: ${formatList(status.routing?.reasonCodes || [])}
- renderedPromptRef: ${packet.renderedPromptRef ? `\`${packet.renderedPromptRef}\`` : 'Not found'}
- renderedPromptPath: ${renderedPromptPath ? `\`${renderedPromptPath}\`` : 'Not found'}
- capabilityContractRef: ${packet.capabilityContractRef ? `\`${packet.capabilityContractRef}\`` : 'Not found'}`;
}

function renderSetupGate(status) {
  const entries = status.setup?.entries || {};
  const steps = ['zoomOut', 'ubiquitousLanguage', 'grillDecisions', 'tddPlan'];
  const lines = steps.map((step) => {
    const entry = entries[step];
    if (!entry) {
      return `- ${step}: Not found`;
    }
    if (entry.status === 'skipped') {
      return `- ${step}: skipped; reason: ${entry.skipReason}`;
    }
    const parts = [`status=${entry.status}`, `ref=${entry.ref || 'Not found'}`, `verification=${entry.verification || 'Not found'}`];
    if (entry.sha256) {
      parts.push(`sha256=${entry.sha256}`);
    }
    if (entry.actualSha256) {
      parts.push(`actualSha256=${entry.actualSha256}`);
    }
    return `- ${step}: ${parts.join('; ')}`;
  });

  return `## Setup Gate

- state: \`${status.setup?.state || 'Not found'}\`
${lines.join('\n')}`;
}

function renderResultLedger(status) {
  const results = status.results || { state: 'none', count: 0, latest: null, entries: [] };
  const lines = (results.entries || []).map((entry) => {
    if (!entry.valid) {
      return `- ${entry.resultId}: invalid; ref=${entry.ref}`;
    }
    return `- ${entry.resultId}: outcome=${entry.outcome}; routeWorkflow=${entry.routeWorkflow}; ref=${entry.ref}`;
  });

  return `## Result Ledger

- state: \`${results.state}\`
- count: \`${results.count || 0}\`
- latest: ${results.latest ? `\`${results.latest.resultId}\` (${results.latest.outcome})` : 'None recorded'}
${lines.length > 0 ? lines.join('\n') : '- results: None recorded'}`;
}

function renderReview(status, review) {
  if (!status.artifacts.review.present || !review) {
    return `## Worktree Review

- review: Not found`;
  }

  const repos = (review.repos || []).map((repo) => {
    const patch = repo.patchPath ? `; patchPath=${repo.patchPath}` : '; patchPath=None recorded';
    return `- ${repo.repoId}: clean=${repo.clean}; statusPath=${repo.statusPath}${patch}`;
  });

  return `## Worktree Review

- summaryRef: \`${status.artifacts.review.ref}\`
- summaryPath: \`${status.artifacts.review.path}\`
- clean: \`${review.clean === true}\`
- changedRepos: ${formatList(status.review.changedRepos)}
${repos.length > 0 ? repos.join('\n') : '- repos: None recorded'}`;
}

function renderBaseImprovement(status) {
  if (!status.baseImprovementReadiness) {
    return `## Base Improvement Readiness

- state: Not applicable
- checks: None recorded`;
  }

  return `## Base Improvement Readiness

- state: \`${status.baseImprovementReadiness.state}\`
- checks:
${formatChecks(status.baseImprovementReadiness.checks)}`;
}

function renderNextRoute(status, packet) {
  const route = recommendRoute(status, packet);
  const source = status.routing?.source || 'deterministic status checks';
  return `## Next BMAD Route

- recommendation: ${route}
- source: ${source}`;
}

function recommendRoute(status, packet) {
  const codes = new Set(status.checks.map((item) => item.code));
  const runtimeRoot = path.dirname(path.dirname(status.sessionRoot));
  if (codes.has('MISSING_INTAKE')) {
    return `\`bmad workspace intake ${status.sessionId} --runtime-root ${runtimeRoot}\``;
  }
  if (codes.has('WORK_PACKET_MISSING')) {
    return `\`bmad workspace packet ${status.sessionId} --runtime-root ${runtimeRoot}\``;
  }
  if (codes.has('STALE_INTAKE') || codes.has('SETUP_REF_CHECKSUM_MISMATCH')) {
    return 'refresh evidence manually, then rebuild the BMAD Work Packet';
  }
  if (codes.has('REVIEW_MISSING')) {
    return `\`bmad workspace review ${status.sessionId} --runtime-root ${runtimeRoot}\``;
  }
  if (status.status === 'ready' && packet?.renderedPromptRef) {
    const workflow = status.routing?.selectedWorkflow ? ` for \`${status.routing.selectedWorkflow}\`` : '';
    return `use rendered prompt${workflow} at \`${path.join(status.sessionRoot, packet.renderedPromptRef)}\``;
  }
  return 'inspect status checks before continuing';
}

function renderReadOnlyBoundary() {
  return `## Read-only Boundary

This handoff reports stored state only. It does not create, repair, fetch, schedule, execute, apply changes, or change durable state.`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readOptionalJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatList(values = []) {
  return values.length > 0 ? values.map((value) => `\`${value}\``).join(', ') : 'None recorded';
}

function formatChecks(checks = []) {
  if (checks.length === 0) {
    return '- None recorded';
  }
  return checks.map((item) => `- ${item.code} [${item.severity}]: ${item.message}${item.path ? ` (${item.path})` : ''}`).join('\n');
}

module.exports = {
  renderSessionHandoff,
};
