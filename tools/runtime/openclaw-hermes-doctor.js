const fsNode = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');
const csv = require('csv-parse/sync');
const { spawnSync } = require('node:child_process');
const fs = require('../installer/fs-native');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BMAD_CONFIG_PATH = path.join(PROJECT_ROOT, 'bmad.config.yaml');
const RUNTIME_CONFIG_PATH = path.join(__dirname, 'openclaw-hermes-runtime.yaml');

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const bmadConfig = await loadYaml(BMAD_CONFIG_PATH);
  const runtimeConfig = await loadYaml(RUNTIME_CONFIG_PATH);
  const catalog = await loadCatalog(runtimeConfig.catalogs || []);
  const report = await buildReport(bmadConfig, runtimeConfig, catalog);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printReport(report);
  if (!report.summary.repoValid || !report.summary.runtimeConfigured || !report.summary.runtimeReady || !report.summary.runtimeLive) {
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
  };
}

async function loadYaml(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return yaml.parse(content);
}

async function loadCatalog(catalogPaths) {
  const catalog = new Map();

  for (const relativePath of catalogPaths) {
    const absolutePath = path.join(PROJECT_ROOT, relativePath);
    const content = await fs.readFile(absolutePath, 'utf8');
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });

    for (const record of records) {
      const skillId = record.skill;
      if (!skillId || skillId === '_meta' || catalog.has(skillId)) continue;
      catalog.set(skillId, record);
    }
  }

  return catalog;
}

async function buildReport(bmadConfig, runtimeConfig, catalog) {
  const repoChecks = await collectRepoChecks();
  const localStateChecks = await collectLocalStateChecks();
  const runtimes = await collectRuntimeChecks(bmadConfig, runtimeConfig, catalog);

  const repoValid = [...repoChecks, ...localStateChecks].every((check) => check.ok);
  const runtimeConfigured = Object.values(runtimes).every((runtime) => runtime.configured);
  const runtimeReady = Object.values(runtimes).every((runtime) => runtime.ready);
  const runtimeLive = Object.values(runtimes).every((runtime) => runtime.live.ok);

  return {
    bundleId: runtimeConfig.bundle_id,
    generatedAt: new Date().toISOString(),
    summary: {
      repoValid,
      runtimeConfigured,
      runtimeReady,
      runtimeLive,
      recommendedNextAction: recommendNextAction(repoValid, runtimeConfigured, runtimeReady, runtimeLive, runtimes),
    },
    repoChecks,
    localStateChecks,
    runtimes,
  };
}

async function collectRepoChecks() {
  const paths = [
    'bmad.config.yaml',
    'BMAD.md',
    '.hermes.md',
    'AGENTS.md',
    '.github/copilot-instructions.md',
    '.github/prompts/bmad-openclaw-hermes-loop.prompt.md',
    'docs/how-to/use-openclaw-hermes-bmad.md',
  ];

  return Promise.all(
    paths.map(async (relativePath) => ({
      label: relativePath,
      path: relativePath,
      ok: await fs.pathExists(path.join(PROJECT_ROOT, relativePath)),
    })),
  );
}

async function collectLocalStateChecks() {
  const paths = ['_bmad-output/project-context.md', '_bmad-output/sprint-status.yaml', '_bmad-output/openclaw-hermes/handoff.md'];

  return Promise.all(
    paths.map(async (relativePath) => ({
      label: relativePath,
      path: relativePath,
      ok: await fs.pathExists(path.join(PROJECT_ROOT, relativePath)),
    })),
  );
}

async function collectRuntimeChecks(bmadConfig, runtimeConfig, catalog) {
  const runtimes = {};
  const envContext = await collectEnvironmentContext(bmadConfig);

  for (const [runtimeName, runtimeDefinition] of Object.entries(runtimeConfig.runtimes || {})) {
    const machine = bmadConfig.machine_config?.[runtimeName] || {};
    const installDir = resolvePathOption(runtimeDefinition.install_dir, runtimeDefinition.install_dir);
    const installStatus = await inspectInstallDir(installDir);
    const expectedSkills = runtimeDefinition.strategy === 'all-catalog-skills' ? catalog.size : (runtimeDefinition.include || []).length;
    const binary = findExecutable(runtimeName === 'hermes' ? 'hermes' : 'openclaw');
    const configFiles = await collectConfigFiles(runtimeName, machine);
    const readiness = await collectReadinessChecks(runtimeName, machine, bmadConfig, envContext);
    const live = runLiveChecks(runtimeName, binary, configFiles);

    runtimes[runtimeName] = {
      installDir,
      expectedSkills,
      installedSkills: installStatus.installedSkills,
      installDirExists: installStatus.exists,
      markerExists: installStatus.markerExists,
      configFiles,
      binary,
      configured: configFiles.every((entry) => entry.ok),
      ready: readiness.ok,
      readinessChecks: readiness.checks,
      advisoryChecks: readiness.advisories,
      live,
    };
  }

  return runtimes;
}

async function collectEnvironmentContext(bmadConfig) {
  const hermesSecretsPath = resolvePathOption(
    bmadConfig.machine_config?.hermes?.secrets_file,
    bmadConfig.machine_config?.hermes?.secrets_file,
  );
  const openclawSecretsPath = resolvePathOption(
    bmadConfig.machine_config?.openclaw?.secrets_file,
    bmadConfig.machine_config?.openclaw?.secrets_file,
  );
  const hermesEnv =
    hermesSecretsPath && (await fs.pathExists(hermesSecretsPath)) ? parseEnv(await fs.readFile(hermesSecretsPath, 'utf8')) : {};
  const openclawEnv =
    openclawSecretsPath && (await fs.pathExists(openclawSecretsPath)) ? parseEnv(await fs.readFile(openclawSecretsPath, 'utf8')) : {};

  return {
    hermesEnv,
    openclawEnv,
    get(name) {
      return process.env[name] || hermesEnv[name] || openclawEnv[name] || '';
    },
  };
}

async function inspectInstallDir(installDir) {
  const exists = await fs.pathExists(installDir);
  if (!exists) {
    return {
      exists: false,
      installedSkills: 0,
      markerExists: false,
    };
  }

  const entries = await fs.readdir(installDir, { withFileTypes: true });
  const installedSkills = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).length;
  const markerExists = await fs.pathExists(path.join(installDir, '.bmad-openclaw-hermes-runtime.json'));

  return {
    exists,
    installedSkills,
    markerExists,
  };
}

async function collectConfigFiles(runtimeName, machineConfig) {
  const files = [];

  if (runtimeName === 'hermes') {
    files.push(machineConfig.config_file, machineConfig.secrets_file);
  } else if (runtimeName === 'openclaw') {
    files.push(machineConfig.config_file, machineConfig.secrets_file);
  }

  const filtered = files.filter(Boolean);
  return Promise.all(
    filtered.map(async (configuredPath) => ({
      path: configuredPath,
      resolvedPath: resolvePathOption(configuredPath, configuredPath),
      ok: await fs.pathExists(resolvePathOption(configuredPath, configuredPath)),
    })),
  );
}

async function collectReadinessChecks(runtimeName, machineConfig, bmadConfig, envContext) {
  if (runtimeName === 'hermes') {
    return collectHermesReadinessChecks(machineConfig, bmadConfig, envContext);
  }
  if (runtimeName === 'openclaw') {
    return collectOpenClawReadinessChecks(machineConfig, bmadConfig, envContext);
  }

  return { ok: true, checks: [], advisories: [] };
}

async function collectHermesReadinessChecks(machineConfig, bmadConfig, envContext) {
  const configPath = resolvePathOption(machineConfig.config_file, machineConfig.config_file);
  const { parsed: parsedConfig, parseOk: configParseOk } = await parseStructuredFile(configPath, 'yaml');
  const provider = inferProviderFromModel(parsedConfig.model);
  const providerEnvNames =
    provider === 'unknown' ? ['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] : getProviderEnvNames(provider);
  const gatewayTokenEnv = bmadConfig.machine_config?.openclaw?.gateway?.token_env || 'OPENCLAW_GATEWAY_TOKEN';

  const checks = [
    {
      label: 'Hermes config parses',
      ok: configParseOk,
    },
    {
      label: 'Hermes model configured',
      ok: typeof parsedConfig.model === 'string' && parsedConfig.model.length > 0,
    },
    {
      label: `Hermes provider credential present (${providerEnvNames.join(' or ')})`,
      ok: providerEnvNames.some((name) => hasConfiguredValue(envContext.get(name))),
    },
    {
      label: 'Hermes terminal backend configured',
      ok: typeof parsedConfig.terminal?.backend === 'string' && parsedConfig.terminal.backend.length > 0,
    },
    {
      label: `OpenClaw gateway token available via ${gatewayTokenEnv}`,
      ok: hasConfiguredValue(envContext.get(gatewayTokenEnv)),
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
    advisories: [],
  };
}

async function collectOpenClawReadinessChecks(machineConfig, bmadConfig, envContext) {
  const configPath = resolvePathOption(machineConfig.config_file, machineConfig.config_file);
  const { parsed: parsedConfig, parseOk: configParseOk } = await parseStructuredFile(configPath, 'json');
  const tokenEnv =
    extractGatewayTokenEnv(parsedConfig) || bmadConfig.machine_config?.openclaw?.gateway?.token_env || 'OPENCLAW_GATEWAY_TOKEN';
  const provider = inferProviderFromModel(parsedConfig.agents?.defaults?.model?.primary);
  const providerEnvNames =
    provider === 'unknown' ? ['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] : getProviderEnvNames(provider);

  const checks = [
    {
      label: 'OpenClaw config parses',
      ok: configParseOk,
    },
    {
      label: 'OpenClaw gateway auth mode is token',
      ok: parsedConfig.gateway?.auth?.mode === 'token',
    },
    {
      label: `OpenClaw gateway token available via ${tokenEnv}`,
      ok: hasConfiguredValue(envContext.get(tokenEnv)),
    },
    {
      label: `OpenClaw provider credential present (${providerEnvNames.join(' or ')})`,
      ok: providerEnvNames.some((name) => hasConfiguredValue(envContext.get(name))),
    },
    {
      label: 'OpenClaw default model configured',
      ok: typeof parsedConfig.agents?.defaults?.model?.primary === 'string' && parsedConfig.agents.defaults.model.primary.length > 0,
    },
    {
      label: 'OpenClaw workspace configured',
      ok: typeof parsedConfig.agents?.defaults?.workspace === 'string' && parsedConfig.agents.defaults.workspace.length > 0,
    },
  ];

  const advisories = [
    {
      label: 'OpenClaw gateway binds locally (loopback)',
      ok: parsedConfig.gateway?.bind === 'loopback',
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
    advisories,
  };
}

function resolvePathOption(optionValue, fallback) {
  const value = optionValue || fallback;
  if (!value) return null;
  if (value.startsWith('~/')) {
    return path.join(process.env.HOME || '', value.slice(2));
  }
  if (path.isAbsolute(value)) return value;
  return path.join(PROJECT_ROOT, value);
}

function parseEnv(rawContent) {
  const entries = {};
  for (const line of rawContent.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7) : trimmed;
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = normalized.slice(0, separatorIndex).trim();
    let value = normalized.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

function hasConfiguredValue(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return normalized.length > 0 && !['changeme', 'replace-me', 'todo'].includes(normalized.toLowerCase());
}

function inferProviderFromModel(model) {
  if (typeof model !== 'string' || model.length === 0) return 'unknown';
  const [provider] = model.split('/');
  if (['openrouter', 'openai', 'anthropic'].includes(provider)) {
    return provider;
  }
  return 'unknown';
}

function getProviderEnvNames(provider) {
  switch (provider) {
    case 'openrouter': {
      return ['OPENROUTER_API_KEY'];
    }
    case 'openai': {
      return ['OPENAI_API_KEY'];
    }
    case 'anthropic': {
      return ['ANTHROPIC_API_KEY'];
    }
    default: {
      return ['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
    }
  }
}

function extractGatewayTokenEnv(parsedConfig) {
  const tokenValue = parsedConfig.gateway?.auth?.token;
  if (typeof tokenValue !== 'string') return null;
  const match = tokenValue.match(/^\$(?:\{)?([A-Z0-9_]+)(?:\})?$/u);
  return match ? match[1] : null;
}

async function parseStructuredFile(filePath, format) {
  if (!filePath || !(await fs.pathExists(filePath))) {
    return { parsed: {}, parseOk: false };
  }

  try {
    const rawContent = await fs.readFile(filePath, 'utf8');
    const parsed = format === 'json' ? JSON.parse(rawContent) : yaml.parse(rawContent);
    return {
      parsed: parsed || {},
      parseOk: true,
    };
  } catch {
    return {
      parsed: {},
      parseOk: false,
    };
  }
}

function findExecutable(name) {
  const envPath = process.env.PATH || '';
  for (const directory of envPath.split(path.delimiter)) {
    if (!directory) continue;
    const candidate = path.join(directory, name);
    try {
      fsNode.accessSync(candidate, fsNode.constants.X_OK);
      return { found: true, path: candidate };
    } catch {
      // continue
    }
  }

  return { found: false, path: null };
}

function runLiveChecks(runtimeName, binary, configFiles) {
  if (!binary.found) {
    return {
      ok: false,
      checks: [],
      advisoryChecks: [],
      reason: 'binary-missing',
    };
  }

  if (configFiles.some((entry) => !entry.ok)) {
    return {
      ok: false,
      checks: [],
      advisoryChecks: [],
      reason: 'config-missing',
    };
  }

  const commandMatrix = getLiveCommandMatrix(runtimeName);
  const checks = commandMatrix.required.map((args) => runCommand(binary.path, args));
  const advisoryChecks = commandMatrix.advisory.map((args) => runCommand(binary.path, args));
  const ok = checks.every((check) => check.ok);

  return {
    ok,
    checks,
    advisoryChecks,
    reason: ok ? 'required-checks-passed' : 'required-checks-failed',
  };
}

function getLiveCommandMatrix(runtimeName) {
  if (runtimeName === 'hermes') {
    return {
      required: [['doctor'], ['config', 'check'], ['memory', 'status'], ['gateway', 'status']],
      advisory: [['cron', 'status']],
    };
  }

  return {
    required: [
      ['config', 'validate'],
      ['gateway', 'status', '--json'],
      ['status', '--json'],
    ],
    advisory: [['doctor'], ['health'], ['channels', 'status', '--probe']],
  };
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 8000,
  });

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  const ok = result.status === 0;

  return {
    command: [command, ...args].join(' '),
    ok,
    status: result.status,
    stdout,
    stderr,
  };
}

function recommendNextAction(repoValid, runtimeConfigured, runtimeReady, runtimeLive, runtimes) {
  if (!repoValid) {
    return 'Repair repo-side BMAD surfaces before attempting live runtime checks.';
  }
  if (!runtimeConfigured) {
    const missingBinaries = Object.entries(runtimes)
      .filter(([, runtime]) => !runtime.binary?.found)
      .map(([name]) => name);
    const installRefreshNeeded = Object.entries(runtimes).some(
      ([, runtime]) => runtime.installDirExists && runtime.installedSkills < runtime.expectedSkills,
    );

    const steps = [];
    if (missingBinaries.length > 0) {
      steps.push(`install missing runtime binaries (${missingBinaries.join(', ')}) or add them to PATH`);
    }
    steps.push('run npm run runtime:bootstrap -- --apply to scaffold missing ~/.hermes and ~/.openclaw config files');
    if (installRefreshNeeded) {
      steps.push('rerun npm run runtime:install');
    }
    steps.push('rerun npm run runtime:doctor');

    return `${capitalizeFirst(steps[0])}, then ${steps.slice(1).join(', then ')}.`;
  }
  if (!runtimeReady) {
    const missingReadiness = Object.entries(runtimes).flatMap(([runtimeName, runtime]) =>
      runtime.readinessChecks.filter((check) => !check.ok).map((check) => `${runtimeName}: ${check.label}`),
    );
    const steps = [];
    if (missingReadiness.some((label) => label.includes('provider credential'))) {
      steps.push('choose a supported provider path and fill the matching credential in ~/.hermes/.env and ~/.openclaw/.env');
    }
    if (missingReadiness.some((label) => label.includes('gateway token'))) {
      steps.push('set OPENCLAW_GATEWAY_TOKEN in the environment or ~/.hermes/.env');
    }
    if (missingReadiness.some((label) => label.includes('config parses'))) {
      steps.push('repair the generated runtime config files');
    }
    if (steps.length === 0) {
      steps.push(`address readiness failures (${missingReadiness.join('; ')})`);
    }
    steps.push('rerun npm run runtime:doctor');
    return `${capitalizeFirst(steps[0])}, then ${steps.slice(1).join(', then ')}.`;
  }
  if (!runtimeLive) {
    const failingRuntimes = Object.entries(runtimes).filter(([, runtime]) => !runtime.live.ok);
    const binaryMissing = failingRuntimes.filter(([, runtime]) => runtime.live.reason === 'binary-missing').map(([name]) => name);
    const configMissing = failingRuntimes.filter(([, runtime]) => runtime.live.reason === 'config-missing').map(([name]) => name);
    const commandFailures = failingRuntimes
      .filter(([, runtime]) => runtime.live.reason === 'one-or-more-checks-failed')
      .map(([name]) => name);

    const steps = [];
    if (binaryMissing.length > 0) {
      steps.push(`install missing runtime binaries (${binaryMissing.join(', ')}) or add them to PATH`);
    }
    if (configMissing.length > 0) {
      steps.push(`rerun npm run runtime:bootstrap -- --apply for ${configMissing.join(', ')}`);
    }
    if (commandFailures.length > 0) {
      steps.push(`investigate failing live checks for ${commandFailures.join(', ')}`);
    }

    if (steps.length === 0) {
      const names = failingRuntimes.map(([name]) => name).join(', ');
      return `Investigate live runtime checks for: ${names}.`;
    }

    steps.push('rerun npm run runtime:doctor');
    return `${capitalizeFirst(steps[0])}, then ${steps.slice(1).join(', then ')}.`;
  }
  return 'Runtime looks healthy. Continue with bounded task execution or scheduled automation.';
}

function printReport(report) {
  console.log(`Bundle: ${report.bundleId}`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log('');
  console.log('Summary');
  console.log(`- Repo valid: ${formatBool(report.summary.repoValid)}`);
  console.log(`- Runtime configured: ${formatBool(report.summary.runtimeConfigured)}`);
  console.log(`- Runtime ready: ${formatBool(report.summary.runtimeReady)}`);
  console.log(`- Runtime live: ${formatBool(report.summary.runtimeLive)}`);
  console.log(`- Next action: ${report.summary.recommendedNextAction}`);
  console.log('');

  console.log('Repo surfaces');
  for (const check of report.repoChecks) {
    console.log(`- ${formatBool(check.ok)} ${check.label}`);
  }
  console.log('');

  console.log('Local state');
  for (const check of report.localStateChecks) {
    console.log(`- ${formatBool(check.ok)} ${check.label}`);
  }

  for (const [runtimeName, runtime] of Object.entries(report.runtimes)) {
    console.log(`\n[${runtimeName}]`);
    console.log(`- Install dir: ${runtime.installDir}`);
    console.log(`- Install dir exists: ${formatBool(runtime.installDirExists)}`);
    console.log(`- Installed skills: ${formatInstalledSkills(runtime.installedSkills, runtime.expectedSkills)}`);
    console.log(`- Marker exists: ${formatBool(runtime.markerExists)}`);
    console.log(`- Binary found: ${formatBool(runtime.binary.found)}${runtime.binary.path ? ` (${runtime.binary.path})` : ''}`);
    console.log(`- Configured: ${formatBool(runtime.configured)}`);
    for (const configEntry of runtime.configFiles) {
      console.log(`  - ${formatBool(configEntry.ok)} ${configEntry.path}`);
    }
    console.log(`- Ready: ${formatBool(runtime.ready)}`);
    for (const check of runtime.readinessChecks || []) {
      console.log(`  - ${formatBool(check.ok)} ${check.label}`);
    }
    if ((runtime.advisoryChecks || []).length > 0) {
      console.log('- Advisories:');
      for (const check of runtime.advisoryChecks) {
        console.log(`  - ${formatBool(check.ok)} ${check.label}`);
      }
    }
    console.log(`- Live: ${formatBool(runtime.live.ok)} (${runtime.live.reason})`);
    for (const check of runtime.live.checks || []) {
      console.log(`  - ${formatBool(check.ok)} ${check.command}`);
      if (!check.ok && check.stderr) {
        console.log(`    stderr: ${truncate(check.stderr)}`);
      }
    }
    if ((runtime.live.advisoryChecks || []).length > 0) {
      console.log('  Advisory live checks:');
      for (const check of runtime.live.advisoryChecks) {
        console.log(`    - ${formatBool(check.ok)} ${check.command}`);
        if (!check.ok && check.stderr) {
          console.log(`      stderr: ${truncate(check.stderr)}`);
        }
      }
    }
  }
}

function formatBool(value) {
  return value ? 'PASS' : 'FAIL';
}

function formatInstalledSkills(installedSkills, expectedSkills) {
  if (installedSkills >= expectedSkills) {
    return `${installedSkills} (expected at least ${expectedSkills} BMAD skills)`;
  }
  return `${installedSkills}/${expectedSkills}`;
}

function capitalizeFirst(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncate(value) {
  if (value.length <= 160) return value;
  return `${value.slice(0, 157)}...`;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
