/**
 * Validates the root UBIQUITOUS_LANGUAGE.md glossary contract.
 *
 * Usage:
 *   node tools/validate-ubiquitous-language.js [--project-root <path>]
 */

const fs = require('node:fs');
const path = require('node:path');

const GLOSSARY_PATH = 'UBIQUITOUS_LANGUAGE.md';

const REQUIRED_SECTIONS = Object.freeze([
  'Delivery method',
  'Config authority',
  'Coding workflow',
  'TDD workflow',
  'Tooling workflow',
  'Agentic search',
  'Codex and agent capability',
  'Evidence gates',
  'Relationships',
  'Example dialogue',
  'Flagged ambiguities',
]);

const REQUIRED_TERMS = Object.freeze([
  'Stories',
  'Epics',
  'Acceptance Criteria',
  'Implementation Readiness',
  'Quality Gate',
  'Config Authority',
  'Config Precedence',
  'Authority Boundary',
  'Deterministic Validation',
  'Ownership Rule',
  'Coding Capability',
  'Public Behavior Test',
  'Small Diff',
  'Reviewer-Ready Note',
  'Local Verification',
  'TDD Workflow',
  'RED',
  'GREEN',
  'REFACTOR',
  'Test-First Delivery',
  'Observable Public Behavior',
  'Tooling Capability',
  'npm Quality',
  'Skill Validation',
  'CI Parity',
  'Deterministic Command',
  'Agentic Search',
  'Context Source',
  'Search Tool',
  'Retrieved Context',
  'Context Curation',
  'Trigger Condition',
  'Negative Trigger Condition',
  'Parameter Complexity',
  'Zero-result Ambiguity',
  'Codex Executor',
  'Agent Capability',
  'Tool Affordance',
  'Sandbox Boundary',
  'Approval Policy',
  'Blocker Surface',
  'Evidence Gate',
  'Validation Evidence',
  'Exact Checkout Gate',
  'Checkpoint Evidence',
  'Install Evidence',
  'Refresh Evidence',
  'Session Identity',
]);

const REQUIRED_SCOPES = Object.freeze(['delivery', 'config', 'coding', 'tdd', 'tooling', 'search', 'agent', 'validation']);

const REQUIRED_SESSION_NOT_FOUND_GUIDANCE =
  'SESSION_NOT_FOUND means workspace session lookup failed; do not infer repo state from it. Re-establish state from git status, files, and test output.';

const FORBIDDEN_AUTHORITY_CLAIMS = Object.freeze([
  'Codex config grants Workspace authority',
  'Codex config grants authority',
  'hooks grant Workspace authority',
  'subagents grant Workspace authority',
  'profiles grant Workspace authority',
  'slash commands grant Workspace authority',
  'permission authority comes from Codex config',
]);

const HIDDEN_AUTOMATION_CLAIMS = Object.freeze([
  'automatically improve BMAD without review',
  'auto-improve BMAD without review',
  'learns from every run',
  'upgrades itself without review',
  'pushes automatically',
  'skips tests',
]);

function parseArgs(argv) {
  const args = { projectRoot: path.resolve(__dirname, '..') };
  for (let index = 2; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--project-root') {
      args.projectRoot = path.resolve(argv[++index]);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function addError(errors, code, message, details = {}) {
  const metadata = [];
  if (details.file) metadata.push(`file=${details.file}`);
  if (details.field) metadata.push(`field=${details.field}`);
  const suffix = metadata.length > 0 ? ` [${metadata.join(' ')}]` : '';
  errors.push(`${code} ${message}${suffix}`);
}

function includesTerm(content, term) {
  return content.toLowerCase().includes(term.toLowerCase());
}

function extractTableContract(content) {
  const terms = new Set();
  const scopes = new Set();

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\|\s+\*\*(?<term>[^*]+)\*\*\s+\|\s+(?<scope>[^|]+?)\s+\|/);
    if (!match) continue;
    terms.add(match.groups.term.trim());
    scopes.add(match.groups.scope.trim());
  }

  return { terms, scopes };
}

function validateUbiquitousLanguage(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..');
  const errors = [];
  const glossaryPath = path.join(projectRoot, GLOSSARY_PATH);

  if (!fs.existsSync(glossaryPath)) {
    addError(errors, 'UL_FILE_MISSING', `missing required file: ${GLOSSARY_PATH}`, { file: GLOSSARY_PATH });
    return { ok: false, errors: errors.sort() };
  }

  const content = fs.readFileSync(glossaryPath, 'utf8');
  const tableContract = extractTableContract(content);

  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(`## ${section}`)) {
      addError(errors, 'UL_MISSING_SECTION', `missing required glossary section: ${section}`, {
        file: GLOSSARY_PATH,
        field: section,
      });
    }
  }

  for (const term of REQUIRED_TERMS) {
    if (!tableContract.terms.has(term)) {
      const code = ['Config Authority', 'Config Precedence', 'Authority Boundary', 'Ownership Rule'].includes(term)
        ? 'UL_CONFIG_AUTHORITY_WEAKENED'
        : 'UL_MISSING_TERM';
      addError(errors, code, `missing required glossary term: ${term}`, { file: GLOSSARY_PATH, field: term });
    }
  }

  for (const scope of REQUIRED_SCOPES) {
    if (!tableContract.scopes.has(scope)) {
      addError(errors, 'UL_MISSING_TERM', `missing required glossary scope: ${scope}`, {
        file: GLOSSARY_PATH,
        field: scope,
      });
    }
  }

  if (!content.includes(REQUIRED_SESSION_NOT_FOUND_GUIDANCE)) {
    addError(errors, 'UL_MISSING_TERM', 'missing required SESSION_NOT_FOUND guidance', {
      file: GLOSSARY_PATH,
      field: 'SESSION_NOT_FOUND',
    });
  }

  for (const claim of FORBIDDEN_AUTHORITY_CLAIMS) {
    if (includesTerm(content, claim)) {
      addError(errors, 'UL_FORBIDDEN_AUTHORITY_CLAIM', `glossary contains forbidden authority claim: ${claim}`, {
        file: GLOSSARY_PATH,
        field: claim,
      });
    }
  }

  for (const claim of HIDDEN_AUTOMATION_CLAIMS) {
    if (includesTerm(content, claim)) {
      addError(errors, 'UL_HIDDEN_AUTOMATION_CLAIM', `glossary contains hidden automation claim: ${claim}`, {
        file: GLOSSARY_PATH,
        field: claim,
      });
    }
  }

  return { ok: errors.length === 0, errors: errors.sort() };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv);
    const result = validateUbiquitousLanguage(args);
    if (result.ok) {
      console.log('Ubiquitous Language valid.');
    } else {
      for (const error of result.errors) {
        console.error(error);
      }
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`UL_VALIDATOR_ERROR ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  REQUIRED_SECTIONS,
  REQUIRED_TERMS,
  validateUbiquitousLanguage,
};
