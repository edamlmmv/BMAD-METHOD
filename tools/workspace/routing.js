const ROUTING_SCHEMA_VERSION = 1;

const ROUTEABLE_MODULE = 'BMad Method';
const SOURCE_VALUES = new Set(['override', 'deterministic', 'legacy-missing']);
const CONFIDENCE_VALUES = new Set(['explicit', 'strong', 'weak', 'blocked', 'needs-decision']);

function createRouteableCatalog(rows) {
  if (!Array.isArray(rows)) {
    throw routeError('ROUTE_CATALOG_INVALID', 'catalog rows must be an array');
  }

  const byKey = new Map();
  for (const row of rows) {
    if (!isRouteableRow(row)) {
      continue;
    }

    const entry = {
      module: row.module,
      skill: row.skill.trim(),
      displayName: (row['display-name'] || '').trim(),
      menuCode: (row['menu-code'] || '').trim(),
      description: (row.description || '').trim(),
      action: (row.action || '').trim(),
      phase: (row.phase || '').trim(),
      required: String(row.required || '').toLowerCase() === 'true',
    };
    const key = catalogKey(entry.skill, entry.action);
    if (!byKey.has(key)) {
      byKey.set(key, entry);
    }
  }

  const catalog = [...byKey.values()].sort(compareCatalogEntries);
  if (catalog.length === 0) {
    throw routeError('ROUTE_CATALOG_INVALID', 'catalog has no routeable BMad Method workflows');
  }
  return catalog;
}

function routeWorkspace(input = {}) {
  const catalog = createRouteableCatalog(input.catalogEntries || []);
  const goal = normalizeText(input.goal);
  const blockers = normalizeBlockers(input.blockers);
  const inputRefs = createInputRefs(input);

  if (input.workflowOverride) {
    const selected = findCatalogEntry(catalog, input.workflowOverride);
    if (!selected) {
      throw routeError(
        'ROUTE_WORKFLOW_UNKNOWN',
        `${input.workflowOverride} is not a routeable BMad Method workflow; rerun with a workflow from the routeable catalog`,
      );
    }
    return createDecision({
      selected,
      source: 'override',
      confidence: blockers.length > 0 ? 'blocked' : 'explicit',
      reasonCodes: ['ROUTE_OVERRIDE'],
      alternatives: [],
      inputRefs,
      blockers,
    });
  }

  const scored = scoreRoutes({
    catalog,
    searchableText: buildSearchableText({ goal, sessionSetup: input.sessionSetup, artifactRefs: input.artifactRefs }),
  });

  if (goal === '') {
    throwDecisionRequired(scored, 'ROUTE_EMPTY_GOAL');
  }

  const topScore = scored[0]?.score || 0;
  if (topScore <= 0) {
    throwDecisionRequired(scored, 'ROUTE_NO_STRONG_MATCH');
  }

  const tied = scored.filter((candidate) => candidate.score === topScore);
  if (tied.length > 1) {
    throwDecisionRequired(tied, 'ROUTE_TIE');
  }

  return createDecision({
    selected: scored[0].entry,
    source: 'deterministic',
    confidence: blockers.length > 0 ? 'blocked' : topScore >= 3 ? 'strong' : 'weak',
    reasonCodes: scored[0].reasonCodes,
    alternatives: scored.slice(1, 4).map(toAlternative),
    inputRefs,
    blockers,
  });
}

function createLegacyRouting(packet = {}) {
  const selectedWorkflow = typeof packet.bmadWorkflow === 'string' && packet.bmadWorkflow.trim() !== '' ? packet.bmadWorkflow : 'unknown';
  return {
    routingSchemaVersion: ROUTING_SCHEMA_VERSION,
    selectedWorkflow,
    source: 'legacy-missing',
    confidence: 'weak',
    reasonCodes: ['ROUTING_LEGACY_MISSING'],
    alternatives: [],
    inputRefs: {
      repoIntakeRefs: Array.isArray(packet.repoIntakeRefs) ? packet.repoIntakeRefs : [],
      artifactRefs: {},
    },
    blockers: [],
    nextManualStep: `Inspect legacy BMAD Work Packet workflow ${selectedWorkflow}.`,
  };
}

function validateRoutingDecision(routing, errors, label = 'packet.routing') {
  if (!isObject(routing)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (routing.routingSchemaVersion !== ROUTING_SCHEMA_VERSION) {
    errors.push(`${label}.routingSchemaVersion must be ${ROUTING_SCHEMA_VERSION}`);
  }
  requireNonEmptyString(routing, 'selectedWorkflow', errors, label);
  if ('selectedAction' in routing && typeof routing.selectedAction !== 'string') {
    errors.push(`${label}.selectedAction must be a string`);
  }
  if (!SOURCE_VALUES.has(routing.source)) {
    errors.push(`${label}.source must be override, deterministic, or legacy-missing`);
  }
  if (!CONFIDENCE_VALUES.has(routing.confidence)) {
    errors.push(`${label}.confidence must be explicit, strong, weak, blocked, or needs-decision`);
  }
  requireStringArray(routing, 'reasonCodes', errors, label);
  if (!Array.isArray(routing.alternatives)) {
    errors.push(`${label}.alternatives must be an array`);
  }
  if (!isObject(routing.inputRefs)) {
    errors.push(`${label}.inputRefs must be an object`);
  }
  if (!Array.isArray(routing.blockers)) {
    errors.push(`${label}.blockers must be an array`);
  }
  requireNonEmptyString(routing, 'nextManualStep', errors, label);
}

function isRouteableRow(row) {
  if (!row || typeof row !== 'object') {
    return false;
  }
  const skill = typeof row.skill === 'string' ? row.skill.trim() : '';
  return row.module === ROUTEABLE_MODULE && skill.startsWith('bmad-') && skill !== '_meta' && !skill.startsWith('bmad-agent-');
}

function findCatalogEntry(catalog, workflowSpec) {
  const parsed = parseWorkflowSpec(workflowSpec);
  if (!parsed) {
    return null;
  }
  return catalog.find((entry) => entry.skill === parsed.skill && (parsed.action === null || entry.action === parsed.action)) || null;
}

function parseWorkflowSpec(workflowSpec) {
  if (typeof workflowSpec !== 'string' || workflowSpec.trim() === '') {
    return null;
  }
  const [skill, ...actionParts] = workflowSpec.trim().split(':');
  const action = actionParts.length > 0 ? actionParts.join(':') : null;
  if (!skill || (action !== null && action.trim() === '')) {
    return null;
  }
  return {
    skill,
    action,
  };
}

function scoreRoutes({ catalog, searchableText }) {
  const rules = [
    {
      skill: 'bmad-correct-course',
      reason: 'GOAL_CHANGE_COURSE',
      score: 5,
      patterns: [/correct course/, /change course/, /\bpivot\b/, /major change/],
    },
    { skill: 'bmad-create-prd', reason: 'GOAL_PRD', score: 4, patterns: [/\bprd\b/, /product requirements/, /requirements document/] },
    { skill: 'bmad-create-architecture', reason: 'GOAL_ARCHITECTURE', score: 4, patterns: [/architecture/, /\badr\b/, /technical design/] },
    {
      skill: 'bmad-create-ux-design',
      reason: 'GOAL_UX',
      score: 4,
      patterns: [/\bux\b/, /user experience/, /interface design/, /wireframe/],
    },
    { skill: 'bmad-create-story', action: 'create', reason: 'GOAL_STORY', score: 4, patterns: [/\bstory\b/, /\bepic\b/, /sprint plan/] },
    {
      skill: 'bmad-code-review',
      reason: 'GOAL_CODE_REVIEW',
      score: 4,
      patterns: [/code review/, /review changes/, /review implementation/],
    },
    { skill: 'bmad-market-research', reason: 'GOAL_MARKET_RESEARCH', score: 4, patterns: [/market research/, /competitive/, /competitor/] },
    {
      skill: 'bmad-technical-research',
      reason: 'GOAL_TECHNICAL_RESEARCH',
      score: 4,
      patterns: [/technical research/, /feasibility/, /implementation approach/],
    },
    {
      skill: 'bmad-domain-research',
      reason: 'GOAL_DOMAIN_RESEARCH',
      score: 4,
      patterns: [/domain research/, /terminology/, /industry domain/],
    },
    {
      skill: 'bmad-generate-project-context',
      reason: 'GOAL_PROJECT_CONTEXT',
      score: 4,
      patterns: [/project context/, /project-context\.md/],
    },
    { skill: 'bmad-document-project', reason: 'GOAL_DOCUMENT_PROJECT', score: 3, patterns: [/document project/, /project documentation/] },
    {
      skill: 'bmad-quick-dev',
      reason: 'GOAL_QUICK_DEV',
      score: 3,
      patterns: [/\bfix\b/, /\bbug\b/, /small change/, /\bimplement\b/, /\bfeature\b/, /\brefactor\b/],
    },
  ];

  const scored = [];
  for (const rule of rules) {
    const entry = findRuleEntry(catalog, rule);
    if (!entry) {
      continue;
    }
    if (rule.patterns.some((pattern) => pattern.test(searchableText))) {
      scored.push({
        entry,
        score: rule.score,
        reasonCodes: [rule.reason],
      });
    }
  }
  return scored.sort((left, right) => right.score - left.score || compareCatalogEntries(left.entry, right.entry));
}

function findRuleEntry(catalog, rule) {
  if (rule.action) {
    return catalog.find((candidate) => candidate.skill === rule.skill && candidate.action === rule.action);
  }
  return catalog.find((candidate) => candidate.skill === rule.skill && candidate.action === '');
}

function createDecision({ selected, source, confidence, reasonCodes, alternatives, inputRefs, blockers }) {
  const selectedSpec = selected.action ? `${selected.skill}:${selected.action}` : selected.skill;
  return {
    routingSchemaVersion: ROUTING_SCHEMA_VERSION,
    selectedWorkflow: selected.skill,
    ...(selected.action ? { selectedAction: selected.action } : {}),
    source,
    confidence,
    reasonCodes,
    alternatives,
    inputRefs,
    blockers,
    nextManualStep: `Use ${selectedSpec} for this Workspace Session.`,
  };
}

function throwDecisionRequired(scored, reasonCode) {
  const alternatives = scored.slice(0, 4).map(toAlternative);
  const alternativeText = alternatives.map((item) => (item.action ? `${item.workflow}:${item.action}` : item.workflow)).join(', ');
  throw routeError(
    'ROUTE_DECISION_REQUIRED',
    `choose a workflow with --workflow <skill[:action]>; alternatives: ${alternativeText || 'none'}; reason: ${reasonCode}`,
    { alternatives, nextManualStep: 'Rerun packet with --workflow <skill[:action]>.' },
  );
}

function routeError(code, message, details = {}) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.details = details;
  return error;
}

function toAlternative(candidate) {
  return {
    workflow: candidate.entry.skill,
    ...(candidate.entry.action ? { action: candidate.entry.action } : {}),
    score: candidate.score,
    reasonCodes: candidate.reasonCodes,
  };
}

function createInputRefs(input) {
  return {
    repoIntakeRefs: Array.isArray(input.repoIntakeRefs) ? input.repoIntakeRefs : [],
    artifactRefs: normalizeArtifactRefs(input.artifactRefs),
    setupRefs: normalizeSetupRefs(input.sessionSetup),
  };
}

function normalizeSetupRefs(sessionSetup) {
  if (!isObject(sessionSetup)) {
    return {};
  }
  const refs = {};
  for (const [step, entry] of Object.entries(sessionSetup)) {
    if (isObject(entry)) {
      refs[step] = entry.ref || entry.resolvedRef || entry.skipReason || entry.status || '';
    }
  }
  return refs;
}

function normalizeArtifactRefs(artifactRefs) {
  if (!artifactRefs) {
    return {};
  }
  if (Array.isArray(artifactRefs)) {
    return Object.fromEntries(artifactRefs.map((value, index) => [`artifact-${index + 1}`, String(value)]));
  }
  if (isObject(artifactRefs)) {
    return Object.fromEntries(Object.entries(artifactRefs).map(([key, value]) => [key, String(value)]));
  }
  return {};
}

function normalizeBlockers(blockers) {
  if (!Array.isArray(blockers)) {
    return [];
  }
  return blockers.map((blocker) => {
    if (typeof blocker === 'string') {
      return { code: blocker };
    }
    if (isObject(blocker)) {
      return blocker;
    }
    return { code: String(blocker) };
  });
}

function buildSearchableText({ goal, sessionSetup, artifactRefs }) {
  return [goal, ...Object.values(normalizeSetupRefs(sessionSetup)), ...Object.values(normalizeArtifactRefs(artifactRefs))]
    .join(' ')
    .toLowerCase();
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function compareCatalogEntries(left, right) {
  return (
    compareString(left.phase, right.phase) ||
    Number(right.required) - Number(left.required) ||
    compareString(left.menuCode, right.menuCode) ||
    compareString(left.skill, right.skill) ||
    compareString(left.action, right.action)
  );
}

function compareString(left = '', right = '') {
  return left.localeCompare(right);
}

function catalogKey(skill, action) {
  return `${skill}:${action || ''}`;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmptyString(object, field, errors, label) {
  if (typeof object[field] !== 'string' || object[field].trim() === '') {
    errors.push(`${label}.${field} must be a non-empty string`);
  }
}

function requireStringArray(object, field, errors, label) {
  if (!Array.isArray(object[field]) || object[field].some((item) => typeof item !== 'string' || item.trim() === '')) {
    errors.push(`${label}.${field} must be an array of non-empty strings`);
  }
}

module.exports = {
  ROUTING_SCHEMA_VERSION,
  createLegacyRouting,
  createRouteableCatalog,
  routeWorkspace,
  validateRoutingDecision,
};
