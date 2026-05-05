/**
 * Validates shared BMAD planning capabilities.
 *
 * Usage:
 *   node tools/validate-bmad-planning-capabilities.js [--project-root <path>]
 */

const fs = require('node:fs');
const path = require('node:path');

const CANONICAL_PLANNING_CAPABILITY_SENTENCE =
  'Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.';

const BMAD_PLANNING_CAPABILITY_FILES = {
  registry: {
    label: 'BMAD planning capability registry',
    relativePath: path.join('tools', 'bmad-planning-capabilities.json'),
  },
  vendorManifest: {
    label: 'Matt Pocock skill snapshot manifest',
    relativePath: path.join('docs', 'workspace', 'vendor', 'mattpocock-skills', 'MANIFEST.json'),
  },
  workspacePacket: {
    label: 'Workspace packet builder',
    relativePath: path.join('tools', 'workspace', 'packet.js'),
  },
  help: {
    label: 'bmad-help skill',
    relativePath: path.join('src', 'core-skills', 'bmad-help', 'SKILL.md'),
  },
  workspace: {
    label: 'bmad-workspace skill',
    relativePath: path.join('src', 'core-skills', 'bmad-workspace', 'SKILL.md'),
  },
  selfImprove: {
    label: 'bmad-self-improve skill',
    relativePath: path.join('src', 'core-skills', 'bmad-self-improve', 'SKILL.md'),
  },
  partyMode: {
    label: 'bmad-party-mode skill',
    relativePath: path.join('src', 'core-skills', 'bmad-party-mode', 'SKILL.md'),
  },
  guide: {
    label: 'self-improvement runbook',
    relativePath: path.join('docs', 'workspace', 'self-improvement-codex.md'),
  },
  prompt: {
    label: 'self-improvement prompt',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-codex-prompt.md'),
  },
  resume: {
    label: 'self-improvement resume prompt',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-codex-resume-prompt.md'),
  },
  checkpoint: {
    label: 'self-improvement checkpoint template',
    relativePath: path.join('docs', 'workspace', 'templates', 'self-improvement-checkpoint.template.md'),
  },
  moduleHelp: {
    label: 'module-help.csv',
    relativePath: path.join('src', 'core-skills', 'module-help.csv'),
  },
  packageJson: {
    label: 'package.json',
    relativePath: 'package.json',
  },
};

const BMAD_PLANNING_SETUP_REFS = Object.freeze({
  'zoom-out': 'zoomOut',
  tdd: 'tddPlan',
  'ubiquitous-language': 'ubiquitousLanguage',
  'grill-me': 'grillDecisions',
});

const REQUIRED_CAPABILITY_SURFACES = Object.freeze([
  'help',
  'workspace',
  'selfImprove',
  'partyMode',
  'guide',
  'prompt',
  'resume',
  'checkpoint',
  'moduleHelp',
]);

const REQUIRED_MODULE_HELP_SKILLS = Object.freeze(['bmad-help', 'bmad-workspace', 'bmad-self-improve', 'bmad-party-mode']);

const FORBIDDEN_CAPABILITY_AUTOMATION_CLAIMS = Object.freeze([
  'auto-run capability',
  'auto-invoked capability',
  'automatic capability execution',
  'requires .codex/config.toml',
  'requires hooks',
  'requires features.codex_hooks',
  'requires multi-agent',
  'must configure [agents]',
  'must use project .codex/config.toml',
  'Codex config grants authority',
  'Codex config grants workspace authority',
  'Codex config authorizes Workspace writes',
  'Workspace writes authorized by Codex affordance',
  'adds Workspace schema',
  'changes Workspace schema',
]);
const CAPABILITY_ANCHOR_PATTERN = /\bcapability:([a-z0-9][a-z0-9-]*)\b/g;

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

function readRequired(filePath, errors, fileLabel = filePath) {
  if (!fs.existsSync(filePath)) {
    addError(errors, 'BPC_FILE_MISSING', `missing required file: ${fileLabel}`, { file: fileLabel });
    return null;
  }
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    addError(errors, 'BPC_FILE_READ_FAILED', `could not read required file: ${fileLabel}: ${error.message}`, { file: fileLabel });
    return null;
  }
}

function parseJson(content, sourceName, fileLabel, errors, errorCode) {
  try {
    return JSON.parse(content);
  } catch (error) {
    addError(errors, errorCode, `${sourceName} contains invalid JSON: ${error.message}`, { file: fileLabel });
    return null;
  }
}

function hasTerm(content, term) {
  return content.toLowerCase().includes(term.toLowerCase());
}

function requireTerms(content, terms, sourceName, errors, fileLabel, errorCode = 'BPC_TERM_MISSING') {
  for (const term of terms) {
    if (!hasTerm(content, term)) {
      addError(errors, errorCode, `${sourceName} missing required term: ${term}`, { file: fileLabel, field: term });
    }
  }
}

function requireNoTerms(content, terms, sourceName, errors, fileLabel) {
  for (const term of terms) {
    if (hasTerm(content, term)) {
      addError(errors, 'BPC_FORBIDDEN_AUTOMATION_CLAIM', `${sourceName} contains forbidden planning capability claim: ${term}`, {
        file: fileLabel,
        field: term,
      });
    }
  }
}

function validateBmadPlanningCapabilities(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve(__dirname, '..');
  const errors = [];
  const files = Object.fromEntries(
    Object.entries(BMAD_PLANNING_CAPABILITY_FILES).map(([key, definition]) => [
      key,
      {
        ...definition,
        filePath: path.join(projectRoot, definition.relativePath),
      },
    ]),
  );

  const contents = {};
  for (const [key, definition] of Object.entries(files)) {
    contents[key] = readRequired(definition.filePath, errors, definition.relativePath);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const registry = parseJson(contents.registry, 'BMAD planning capability registry', files.registry.relativePath, errors, 'BPC_REGISTRY');
  const vendorManifest = parseJson(
    contents.vendorManifest,
    'Matt Pocock skill snapshot manifest',
    files.vendorManifest.relativePath,
    errors,
    'BPC_VENDOR',
  );
  let packageJson = {};
  try {
    packageJson = JSON.parse(contents.packageJson);
  } catch (error) {
    addError(errors, 'BPC_PACKAGE_JSON_INVALID', `package.json contains invalid JSON: ${error.message}`, {
      file: files.packageJson.relativePath,
    });
    return { ok: false, errors };
  }

  validateCapabilityRegistry(registry, vendorManifest, contents, files, projectRoot, errors);
  validateKnownCapabilityAnchors(contents, files, Object.keys(BMAD_PLANNING_SETUP_REFS), errors);
  validateModuleHelpRows(contents.moduleHelp, Object.keys(BMAD_PLANNING_SETUP_REFS), files.moduleHelp.relativePath, errors);
  validatePackageScripts(packageJson, files.packageJson.relativePath, errors);

  for (const key of ['help', 'workspace', 'selfImprove', 'partyMode', 'guide', 'prompt', 'resume', 'checkpoint']) {
    requireTerms(contents[key], [CANONICAL_PLANNING_CAPABILITY_SENTENCE], files[key].label, errors, files[key].relativePath);
    requireNoTerms(contents[key], FORBIDDEN_CAPABILITY_AUTOMATION_CLAIMS, files[key].label, errors, files[key].relativePath);
  }

  return { ok: errors.length === 0, errors };
}

function validateCapabilityRegistry(registry, vendorManifest, contents, files, projectRoot, errors) {
  if (!registry || !vendorManifest) {
    return;
  }
  if (registry.schemaVersion !== 1) {
    addError(errors, 'BPC_REGISTRY', 'BMAD planning capability registry schemaVersion must be 1', {
      file: files.registry.relativePath,
      field: 'schemaVersion',
    });
  }
  if (!Array.isArray(registry.capabilities)) {
    addError(errors, 'BPC_REGISTRY', 'BMAD planning capability registry capabilities must be an array', {
      file: files.registry.relativePath,
      field: 'capabilities',
    });
    return;
  }

  const expectedSlugs = Object.keys(BMAD_PLANNING_SETUP_REFS);
  const bySlug = new Map();
  for (const capability of registry.capabilities) {
    if (!capability || typeof capability !== 'object') {
      addError(errors, 'BPC_REGISTRY', 'BMAD planning capability entry must be an object', { file: files.registry.relativePath });
      continue;
    }
    const slug = capability.slug;
    if (typeof slug !== 'string' || slug.trim() === '') {
      addError(errors, 'BPC_REGISTRY', 'BMAD planning capability slug must be a non-empty string', {
        file: files.registry.relativePath,
        field: 'slug',
      });
      continue;
    }
    if (bySlug.has(slug)) {
      addError(errors, 'BPC_REGISTRY', `BMAD planning capability registry contains duplicate slug: ${slug}`, {
        file: files.registry.relativePath,
        field: slug,
      });
    }
    bySlug.set(slug, capability);
  }

  for (const slug of expectedSlugs) {
    const capability = bySlug.get(slug);
    if (!capability) {
      addError(errors, 'BPC_REGISTRY', `BMAD planning capability registry missing slug: ${slug}`, {
        file: files.registry.relativePath,
        field: slug,
      });
      continue;
    }
    validateCapabilityEntry(slug, capability, contents, files, projectRoot, errors);
  }

  for (const slug of bySlug.keys()) {
    if (!expectedSlugs.includes(slug)) {
      addError(errors, 'BPC_REGISTRY', `BMAD planning capability registry contains unknown slug: ${slug}`, {
        file: files.registry.relativePath,
        field: slug,
      });
    }
  }

  validateCapabilityVendorManifest(expectedSlugs, vendorManifest, projectRoot, files.vendorManifest.relativePath, errors);
}

function validateKnownCapabilityAnchors(contents, files, expectedSlugs, errors) {
  const allowedSlugs = new Set(expectedSlugs);
  for (const sourceKey of REQUIRED_CAPABILITY_SURFACES) {
    const content = contents[sourceKey] || '';
    for (const match of content.matchAll(CAPABILITY_ANCHOR_PATTERN)) {
      const slug = match[1];
      if (!allowedSlugs.has(slug)) {
        addError(
          errors,
          'BPC_UNKNOWN_CAPABILITY_ANCHOR',
          `${files[sourceKey].label} references unknown BMAD planning capability anchor capability:${slug}`,
          {
            file: files[sourceKey].relativePath,
            field: `capability:${slug}`,
          },
        );
      }
    }
  }
}

function validateCapabilityEntry(slug, capability, contents, files, projectRoot, errors) {
  for (const field of ['label', 'operatorUse', 'partyModeUse', 'boundary']) {
    if (typeof capability[field] !== 'string' || capability[field].trim() === '') {
      addError(errors, 'BPC_REGISTRY', `BMAD planning capability ${slug} missing non-empty field: ${field}`, {
        file: files.registry.relativePath,
        field,
      });
    }
  }

  const expectedSetupRef = BMAD_PLANNING_SETUP_REFS[slug];
  if (capability.setupGateRef !== expectedSetupRef) {
    addError(
      errors,
      'BPC_SETUP_REF',
      `BMAD planning capability ${slug} setupGateRef ${capability.setupGateRef} must match Workspace Setup Gate ref ${expectedSetupRef}`,
      { file: files.registry.relativePath, field: slug },
    );
  }
  for (const sourceKey of ['workspacePacket', 'workspace']) {
    if (!hasTerm(contents[sourceKey], expectedSetupRef)) {
      addError(errors, 'BPC_SETUP_REF', `${files[sourceKey].label} missing Workspace Setup Gate ref for ${slug}: ${expectedSetupRef}`, {
        file: files[sourceKey].relativePath,
        field: expectedSetupRef,
      });
    }
  }

  if (!Array.isArray(capability.docsSurfaces)) {
    addError(errors, 'BPC_SURFACE', `BMAD planning capability ${slug} docsSurfaces must be an array`, {
      file: files.registry.relativePath,
      field: 'docsSurfaces',
    });
    return;
  }
  for (const surface of REQUIRED_CAPABILITY_SURFACES) {
    if (!capability.docsSurfaces.includes(surface)) {
      addError(errors, 'BPC_SURFACE', `BMAD planning capability ${slug} missing required docs surface: ${surface}`, {
        file: files.registry.relativePath,
        field: surface,
      });
    }
  }
  for (const surface of capability.docsSurfaces) {
    if (!REQUIRED_CAPABILITY_SURFACES.includes(surface)) {
      addError(errors, 'BPC_SURFACE', `BMAD planning capability ${slug} contains unknown docs surface: ${surface}`, {
        file: files.registry.relativePath,
        field: surface,
      });
      continue;
    }
    const anchor = `capability:${slug}`;
    if (!hasTerm(contents[surface], anchor)) {
      addError(errors, 'BPC_SURFACE', `${files[surface].label} missing BMAD planning capability anchor ${anchor}`, {
        file: files[surface].relativePath,
        field: anchor,
      });
    }
  }

  const vendorSkillPath = path.join(projectRoot, 'docs', 'workspace', 'vendor', 'mattpocock-skills', slug, 'SKILL.md');
  if (!fs.existsSync(vendorSkillPath)) {
    addError(errors, 'BPC_VENDOR', `vendored Matt Pocock skill snapshot missing for capability: ${slug}`, {
      file: path.relative(projectRoot, vendorSkillPath),
      field: slug,
    });
  }
}

function validateCapabilityVendorManifest(expectedSlugs, vendorManifest, projectRoot, fileLabel, errors) {
  if (!Array.isArray(vendorManifest.skills)) {
    addError(errors, 'BPC_VENDOR', 'Matt Pocock skill snapshot manifest skills must be an array', {
      file: fileLabel,
      field: 'skills',
    });
    return;
  }
  for (const slug of expectedSlugs) {
    const entry = vendorManifest.skills.find((skill) => skill && skill.name === slug);
    if (!entry) {
      addError(errors, 'BPC_VENDOR', `Matt Pocock skill snapshot manifest missing capability: ${slug}`, {
        file: fileLabel,
        field: slug,
      });
      continue;
    }
    if (typeof entry.path !== 'string' || entry.path.trim() === '') {
      addError(errors, 'BPC_VENDOR', `Matt Pocock skill snapshot manifest entry ${slug} missing path`, {
        file: fileLabel,
        field: slug,
      });
      continue;
    }
    const snapshotPath = path.join(projectRoot, 'docs', 'workspace', 'vendor', 'mattpocock-skills', entry.path);
    if (!fs.existsSync(snapshotPath)) {
      addError(errors, 'BPC_VENDOR', `Matt Pocock skill snapshot path missing for capability ${slug}: ${entry.path}`, {
        file: fileLabel,
        field: slug,
      });
    }
  }
}

function validateModuleHelpRows(moduleHelp, expectedSlugs, fileLabel, errors) {
  const rows = moduleHelp
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith('module,'))
    .map((line) => {
      const match = line.match(/^[^,]*,([^,]*),/);
      return { skill: match ? match[1] : '', text: line };
    });

  for (const skill of REQUIRED_MODULE_HELP_SKILLS) {
    const row = rows.find((item) => item.skill === skill);
    if (!row) {
      addError(errors, 'BPC_MODULE_HELP', `module-help.csv missing planning capability consumer row: ${skill}`, {
        file: fileLabel,
        field: skill,
      });
      continue;
    }
    for (const slug of expectedSlugs) {
      const anchor = `capability:${slug}`;
      if (!hasTerm(row.text, anchor)) {
        addError(errors, 'BPC_MODULE_HELP', `module-help.csv row ${skill} missing BMAD planning capability anchor ${anchor}`, {
          file: fileLabel,
          field: skill,
        });
      }
    }
  }
}

function validatePackageScripts(packageJson, fileLabel, errors) {
  const scripts = packageJson.scripts || {};
  if (scripts['validate:bmad-planning-capabilities'] !== 'node tools/validate-bmad-planning-capabilities.js') {
    addError(errors, 'BPC_PACKAGE_SCRIPT', 'package.json missing validate:bmad-planning-capabilities script', {
      file: fileLabel,
      field: 'validate:bmad-planning-capabilities',
    });
  }
  if (!scripts.quality || !scripts.quality.includes('validate:bmad-planning-capabilities')) {
    addError(errors, 'BPC_PACKAGE_SCRIPT', 'package.json quality script must include validate:bmad-planning-capabilities', {
      file: fileLabel,
      field: 'quality',
    });
  }
}

function main() {
  const args = parseArgs(process.argv);
  const result = validateBmadPlanningCapabilities({ projectRoot: args.projectRoot });
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`BMAD_PLANNING_CAPABILITY: ${error}`);
    }
    process.exit(1);
  }
  console.log('BMAD planning capabilities valid.');
}

if (require.main === module) {
  main();
}

module.exports = {
  BMAD_PLANNING_SETUP_REFS,
  CANONICAL_PLANNING_CAPABILITY_SENTENCE,
  REQUIRED_CAPABILITY_SURFACES,
  validateBmadPlanningCapabilities,
};
