const { loadForgeConfig } = require('./config');
const { createDraft } = require('./draft');
const { exportBmadArtifacts } = require('./export-bmad');
const { ingestEvidence } = require('./ingest');
const { promoteDraft } = require('./promote');
const { createPostgresStore } = require('./store-postgres');
const { validateDraft } = require('./validate');
const { forgeError } = require('./errors');

const V2_COMMANDS = Object.freeze(['migrate', 'ingest', 'search', 'draft', 'validate', 'export-bmad', 'promote', 'reset-dev']);
const V2_HELP = `
Capability Forge v2 compiler path

Lifecycle:
  migrate -> ingest -> search -> draft -> validate -> export-bmad -> promote

Usage:
  node tools/capability-pack-forge.js migrate --config .capability-forge/forge.toml
  node tools/capability-pack-forge.js ingest --config .capability-forge/forge.toml
  node tools/capability-pack-forge.js search --config .capability-forge/forge.toml --query "offline sync"
  node tools/capability-pack-forge.js draft --config .capability-forge/forge.toml --slug offline-sync --title "Offline Sync"
  node tools/capability-pack-forge.js validate --config .capability-forge/forge.toml --slug offline-sync
  node tools/capability-pack-forge.js export-bmad --config .capability-forge/forge.toml --slug offline-sync
  node tools/capability-pack-forge.js promote --config .capability-forge/forge.toml --slug offline-sync --target .agents/skills/offline-sync --approved
  node tools/capability-pack-forge.js reset-dev --config .capability-forge/forge.toml --yes

Runtime model:
  - v1 JSON --input/--output remains the source authority.
  - v2 PostgreSQL state is opt-in compiler state only.
  - Set CAPABILITY_FORGE_DATABASE_URL for live PostgreSQL commands and optional live migration tests.
  - Forge uses the direct pg adapter, not PostgreSQL MCP, as runtime infrastructure.
  - PostgreSQL MCP remains advisory/operator evidence only.
  - Promotion is the only authority-changing step.
  - Stale referenced evidence blocks validate/export-bmad/promote; re-run ingest and draft before review.
  - Promotion prepares a database row before file copy, stages artifacts outside every configured runtime root, finalizes after atomic no-replace publish, marks failed copy as status=failed, and reports stable concurrency/recovery errors.

Authority matrix:
  - v1 JSON: canonical input/output authority; v2 state is not required.
  - pack-draft.toml: byte-stable review contract only.
  - direct pg PostgreSQL: compiler state for evidence, provenance, review, artifact, migration, and promotion records.
  - PostgreSQL MCP: advisory/operator evidence only; no runtime, verifier, compiler, or promotion authority.
  - Workspace verify-capability remains declared-contract only.
  - promotion output: approved-only artifact promotion; no partial target may become authority.

Command contracts:
  - migrate: apply checked migrations and checksum records.
  - ingest: refresh local evidence, marking previous rows stale before current files are seen.
  - search: query non-authoritative compiler evidence state.
  - draft: generate deterministic pack-draft.toml from non-stale evidence.
  - validate: parse pack-draft.toml and match it against database-backed compiler state before report write.
  - export-bmad: validate, then emit BMAD handoff artifacts only.
  - promote: approved-only artifact promotion with advisory lock, prepared row, temp copy, atomic publish, and retry/recovery handling.
`.trim();

function isCapabilityForgeV2Command(value) {
  return V2_COMMANDS.includes(value);
}

async function runCapabilityForgeV2Cli(argv, cwd = process.cwd(), env = process.env) {
  const command = argv[0];
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    return result('help', { help: getCapabilityForgeV2Help() });
  }
  if (!isCapabilityForgeV2Command(command)) {
    throw forgeError('FORGE_V2_USAGE', `Unknown Forge v2 command: ${command}`);
  }
  const args = parseFlags(argv.slice(1));
  if (args.help) {
    return result('help', { help: getCapabilityForgeV2Help() });
  }
  const config = loadForgeConfig(args.config || '.capability-forge/forge.toml', cwd);
  const store = createPostgresStore(config, env);
  try {
    if (command === 'migrate') {
      return result(command, { migrations: await store.migrate() });
    }
    if (command === 'reset-dev') {
      if (args.yes !== true) {
        throw forgeError('FORGE_RESET_REQUIRES_YES', 'reset-dev requires --yes');
      }
      return result(command, await store.resetDev());
    }

    await store.migrate();

    if (command === 'ingest') {
      return result(command, await ingestEvidence({ config, store }));
    }
    if (command === 'search') {
      requireFlag(args.query, '--query');
      return result(command, { matches: await store.searchEvidence(args.query, Number(args.limit || 25)) });
    }
    if (command === 'draft') {
      requireFlag(args.slug, '--slug');
      return result(
        command,
        await createDraft({
          config,
          options: {
            bodyMd: args.bodyMd,
            capabilityId: args.capabilityId,
            capabilityTitle: args.capabilityTitle,
            description: args.description,
            intent: args.intent,
            menuCode: args.menuCode,
            moduleCode: args.moduleCode,
            slug: args.slug,
            title: args.title,
          },
          store,
        }),
      );
    }
    if (command === 'validate') {
      requireFlag(args.slug, '--slug');
      return result(command, await validateDraft({ config, slug: args.slug, store }));
    }
    if (command === 'export-bmad') {
      requireFlag(args.slug, '--slug');
      return result(command, await exportBmadArtifacts({ config, slug: args.slug, store }));
    }
    if (command === 'promote') {
      requireFlag(args.slug, '--slug');
      requireFlag(args.target, '--target');
      if (args.approved !== true) {
        throw forgeError('FORGE_PROMOTE_REQUIRES_APPROVED', 'promote requires --approved');
      }
      return result(
        command,
        await promoteDraft({
          allowDirty: args.allowDirty === true,
          approved: args.approved === true,
          approvedBy: args.approvedBy || 'operator',
          config,
          slug: args.slug,
          store,
          target: args.target,
        }),
      );
    }
    throw forgeError('FORGE_V2_USAGE', `Unhandled Forge v2 command: ${command}`);
  } finally {
    await store.close();
  }
}

function parseFlags(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      throw forgeError('FORGE_V2_USAGE', `unexpected argument: ${arg}`);
    }
    const key = toCamel(arg.slice(2));
    if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = argv[++index];
    }
  }
  return args;
}

function toCamel(value) {
  return value.replaceAll(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function requireFlag(value, flag) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw forgeError('FORGE_V2_USAGE', `${flag} is required`);
  }
}

function result(command, payload) {
  return {
    command,
    kind: 'capability-forge-v2-result',
    schemaVersion: 1,
    ...payload,
  };
}

function getCapabilityForgeV2Help() {
  return V2_HELP;
}

module.exports = {
  getCapabilityForgeV2Help,
  isCapabilityForgeV2Command,
  parseFlags,
  runCapabilityForgeV2Cli,
};
