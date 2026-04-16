const crypto = require('node:crypto');
const path = require('node:path');
const yaml = require('yaml');
const fs = require('../installer/fs-native');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BMAD_CONFIG_PATH = path.join(PROJECT_ROOT, 'bmad.config.yaml');
const TEMPLATE_ROOT = path.join(__dirname, 'templates');

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const bmadConfig = await loadYaml(BMAD_CONFIG_PATH);
  const templateContext = buildTemplateContext(bmadConfig);
  const plan = buildPlan(templateContext, options);

  if (!options.apply) {
    printPlan(plan);
    return;
  }

  const result = await applyPlan(plan, options);
  printApplySummary(result);
}

function parseArgs(argv) {
  const options = {
    apply: false,
    force: false,
    runtime: 'all',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--apply') {
      options.apply = true;
      continue;
    }
    if (current === '--force') {
      options.force = true;
      continue;
    }
    if (current === '--runtime') {
      options.runtime = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${current}`);
  }

  if (!['all', 'hermes', 'openclaw'].includes(options.runtime)) {
    throw new Error(`Unsupported runtime: ${options.runtime}`);
  }

  return options;
}

async function loadYaml(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return yaml.parse(content);
}

function buildTemplateContext(bmadConfig) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const hermes = bmadConfig.machine_config?.hermes || {};
  const openclaw = bmadConfig.machine_config?.openclaw || {};
  const gateway = openclaw.gateway || {};
  const providers = openclaw.providers || {};

  return {
    projectRoot: PROJECT_ROOT,
    timezone,
    hermesConfigPath: resolvePathOption(hermes.config_file),
    hermesEnvPath: resolvePathOption(hermes.secrets_file),
    hermesSkillsDir: resolvePathOption(hermes.skills_dir),
    hermesCronDir: resolvePathOption(hermes.cron_dir),
    hermesSessionsDir: resolvePathOption(hermes.sessions_dir),
    openclawConfigPath: resolvePathOption(openclaw.config_file),
    openclawEnvPath: resolvePathOption(openclaw.secrets_file || '~/.openclaw/.env'),
    openclawHome: resolvePathOption(openclaw.home),
    openclawSkillsDir: resolvePathOption(openclaw.skills_dir || '~/.openclaw/skills'),
    openclawWorkspace: path.join(resolvePathOption(openclaw.home), 'workspace'),
    openclawCronStore: path.join(resolvePathOption(openclaw.home), 'cron', 'cron.json'),
    openclawSessionStore: path.join(resolvePathOption(openclaw.home), 'agents', 'default', 'sessions', 'sessions.json'),
    gatewayHost: gateway.bind_host || '127.0.0.1',
    gatewayPort: gateway.port || 18_789,
    gatewayTokenEnv: gateway.token_env || 'OPENCLAW_GATEWAY_TOKEN',
    generatedGatewayToken: crypto.randomBytes(24).toString('hex'),
    defaultModel: providers.default_model || 'openrouter/auto',
  };
}

function buildPlan(context, options) {
  const operations = [];

  if (options.runtime === 'all' || options.runtime === 'hermes') {
    operations.push(
      createOperation('dir', resolvePathOption('~/.hermes')),
      createOperation('dir', path.dirname(context.hermesConfigPath)),
      createOperation('dir', path.dirname(context.hermesEnvPath)),
      createOperation('dir', context.hermesSkillsDir),
      createOperation('dir', context.hermesCronDir),
      createOperation('dir', context.hermesSessionsDir),
      createOperation('file', context.hermesConfigPath, path.join(TEMPLATE_ROOT, 'hermes-config.yaml.template')),
      createOperation('file', context.hermesEnvPath, path.join(TEMPLATE_ROOT, 'hermes.env.template'), 0o600),
    );
  }

  if (options.runtime === 'all' || options.runtime === 'openclaw') {
    operations.push(
      createOperation('dir', context.openclawHome),
      createOperation('dir', context.openclawWorkspace),
      createOperation('dir', path.dirname(context.openclawCronStore)),
      createOperation('dir', path.dirname(context.openclawSessionStore)),
      createOperation('dir', context.openclawSkillsDir),
      createOperation('file', context.openclawEnvPath, path.join(TEMPLATE_ROOT, 'openclaw.env.template'), 0o600),
      createOperation('file', context.openclawConfigPath, path.join(TEMPLATE_ROOT, 'openclaw.json.template')),
    );
  }

  return {
    context,
    operations: dedupeOperations(operations),
  };
}

function createOperation(kind, targetPath, templatePath = null, chmod = null) {
  return {
    kind,
    targetPath,
    templatePath,
    chmod,
  };
}

function dedupeOperations(operations) {
  const seen = new Set();
  return operations.filter((operation) => {
    const key = [operation.kind, operation.targetPath, operation.templatePath || '', operation.chmod || ''].join('::');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function applyPlan(plan, options) {
  const results = [];

  for (const operation of plan.operations) {
    if (operation.kind === 'dir') {
      await fs.ensureDir(operation.targetPath);
      results.push({
        ...operation,
        action: 'ensured',
      });
      continue;
    }

    const exists = await fs.pathExists(operation.targetPath);
    if (exists && !options.force) {
      results.push({
        ...operation,
        action: 'kept',
      });
      continue;
    }

    const content = await renderTemplate(operation.templatePath, plan.context);
    await fs.ensureDir(path.dirname(operation.targetPath));
    await fs.writeFile(operation.targetPath, content, 'utf8');
    if (operation.chmod) {
      await fs.chmod(operation.targetPath, operation.chmod);
    }
    results.push({
      ...operation,
      action: exists ? 'overwrote' : 'created',
    });
  }

  return {
    results,
  };
}

async function renderTemplate(templatePath, context) {
  const raw = await fs.readFile(templatePath, 'utf8');
  return raw
    .replaceAll('{{project_root}}', context.projectRoot)
    .replaceAll('{{timezone}}', context.timezone)
    .replaceAll('{{gateway_host}}', String(context.gatewayHost))
    .replaceAll('{{gateway_port}}', String(context.gatewayPort))
    .replaceAll('{{gateway_token_env}}', context.gatewayTokenEnv)
    .replaceAll('{{generated_gateway_token}}', context.generatedGatewayToken)
    .replaceAll('{{default_model}}', context.defaultModel)
    .replaceAll('{{openclaw_workspace}}', context.openclawWorkspace)
    .replaceAll('{{openclaw_cron_store}}', context.openclawCronStore)
    .replaceAll('{{openclaw_session_store}}', context.openclawSessionStore);
}

function resolvePathOption(value) {
  if (!value) return null;
  if (value.startsWith('~/')) {
    return path.join(process.env.HOME || '', value.slice(2));
  }
  if (path.isAbsolute(value)) return value;
  return path.join(PROJECT_ROOT, value);
}

async function printPlan(plan) {
  console.log('Runtime bootstrap plan');
  console.log(`- Project root: ${plan.context.projectRoot}`);
  console.log(`- Timezone: ${plan.context.timezone}`);
  for (const operation of plan.operations) {
    const exists = await fs.pathExists(operation.targetPath);
    const status = exists ? 'exists' : 'missing';
    console.log(`- ${operation.kind}: ${operation.targetPath} (${status})`);
  }
  console.log('Run with --apply to create missing starter files.');
  console.log(
    'After that, choose a supported provider path, fill in the matching secrets, then run npm run runtime:install and npm run runtime:doctor.',
  );
}

function printApplySummary(result) {
  console.log('Runtime bootstrap results');
  for (const entry of result.results) {
    console.log(`- ${entry.action}: ${entry.targetPath}`);
  }
  console.log(
    'Next steps: choose a supported provider path, fill in the matching secrets/placeholders, run npm run runtime:install, then npm run runtime:doctor.',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
