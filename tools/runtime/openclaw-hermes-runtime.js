const os = require('node:os');
const path = require('node:path');
const yaml = require('yaml');
const csv = require('csv-parse/sync');
const fs = require('../installer/fs-native');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(__dirname, 'openclaw-hermes-runtime.yaml');
const PREAMBLE_PATH = path.join(__dirname, 'templates', 'openclaw-worker-preamble.md');

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const config = await loadYaml(CONFIG_PATH);
  const catalog = await loadCatalog(config.catalogs || []);
  const sourceMap = await discoverSkillSources();
  const runtimePlan = buildRuntimePlan(config, catalog, sourceMap, options);

  if (command === 'plan') {
    printPlan(runtimePlan, options);
    return;
  }

  const exportResult = await exportBundles(runtimePlan, config);

  if (command === 'export') {
    printExportSummary(exportResult, options);
    return;
  }

  if (command === 'install') {
    const installResult = await installBundles(exportResult, runtimePlan, options);
    printInstallSummary(installResult, options);
    return;
  }

  throw new Error(`Unsupported command: ${command}`);
}

function parseArgs(argv) {
  let command = 'plan';
  const options = {
    outputDir: null,
    installRoot: null,
    hermesDir: null,
    openclawDir: null,
    runtime: 'all',
    quiet: false,
  };

  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current.startsWith('--')) {
      const next = argv[index + 1];
      switch (current) {
        case '--output-dir': {
          options.outputDir = next;
          index += 1;
          break;
        }
        case '--install-root': {
          options.installRoot = next;
          index += 1;
          break;
        }
        case '--hermes-dir': {
          options.hermesDir = next;
          index += 1;
          break;
        }
        case '--openclaw-dir': {
          options.openclawDir = next;
          index += 1;
          break;
        }
        case '--runtime': {
          options.runtime = next;
          index += 1;
          break;
        }
        case '--quiet': {
          options.quiet = true;
          break;
        }
        default: {
          throw new Error(`Unknown option: ${current}`);
        }
      }
    } else {
      positionals.push(current);
    }
  }

  if (positionals.length > 0) {
    [command] = positionals;
  }

  if (!['plan', 'export', 'install'].includes(command)) {
    throw new Error(`Unsupported command: ${command}`);
  }

  if (!['all', 'hermes', 'openclaw'].includes(options.runtime)) {
    throw new Error(`Unsupported runtime: ${options.runtime}`);
  }

  return { command, options };
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
      catalog.set(skillId, {
        id: skillId,
        module: record.module,
        displayName: record['display-name'] || skillId,
        description: record.description || '',
        phase: record.phase || 'anytime',
      });
    }
  }

  return catalog;
}

async function discoverSkillSources() {
  const roots = [path.join(PROJECT_ROOT, 'src', 'core-skills'), path.join(PROJECT_ROOT, 'src', 'bmm-skills')];
  const sourceMap = new Map();

  for (const root of roots) {
    await walkSkillTree(root, sourceMap);
  }

  return sourceMap;
}

async function walkSkillTree(directory, sourceMap) {
  let entries = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  const skillFile = path.join(directory, 'SKILL.md');
  if (await fs.pathExists(skillFile)) {
    const parsed = await parseSkillFile(skillFile);
    const expectedName = path.basename(directory);
    if (parsed?.frontmatter?.name === expectedName) {
      sourceMap.set(expectedName, {
        id: expectedName,
        dir: directory,
        skillFile,
        frontmatter: parsed.frontmatter,
      });
      return;
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    await walkSkillTree(path.join(directory, entry.name), sourceMap);
  }
}

async function parseSkillFile(skillFile) {
  const rawContent = await fs.readFile(skillFile, 'utf8');
  const normalized = rawContent.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  return {
    frontmatter: yaml.parse(match[1]) || {},
    body: match[2] || '',
  };
}

function buildRuntimePlan(config, catalog, sourceMap, options) {
  const defaultOutputDir = path.join(PROJECT_ROOT, config.export?.root || 'build/runtime/openclaw-hermes');
  const outputDir = resolvePathOption(options.outputDir, defaultOutputDir);

  const runtimes = {};
  const runtimeNames = options.runtime === 'all' ? Object.keys(config.runtimes || {}) : [options.runtime];

  for (const runtimeName of runtimeNames) {
    const runtimeConfig = config.runtimes?.[runtimeName];
    if (!runtimeConfig) {
      throw new Error(`Runtime config missing: ${runtimeName}`);
    }

    const skills = resolveRuntimeSkills(runtimeName, runtimeConfig, catalog, sourceMap);
    runtimes[runtimeName] = {
      name: runtimeName,
      config: runtimeConfig,
      skills,
      bundleDir: path.join(outputDir, runtimeName),
      skillsDir: path.join(outputDir, runtimeName, 'skills'),
      installDir: resolveInstallDir(runtimeName, runtimeConfig, options),
    };
  }

  return {
    bundleId: config.bundle_id,
    outputDir,
    runtimes,
  };
}

function resolvePathOption(optionValue, fallback) {
  if (!optionValue) return fallback;
  if (optionValue.startsWith('~/')) {
    return path.join(os.homedir(), optionValue.slice(2));
  }
  if (path.isAbsolute(optionValue)) return optionValue;
  return path.join(PROJECT_ROOT, optionValue);
}

function resolveInstallDir(runtimeName, runtimeConfig, options) {
  if (runtimeName === 'hermes' && options.hermesDir) {
    return resolvePathOption(options.hermesDir, options.hermesDir);
  }
  if (runtimeName === 'openclaw' && options.openclawDir) {
    return resolvePathOption(options.openclawDir, options.openclawDir);
  }
  if (options.installRoot) {
    const root = resolvePathOption(options.installRoot, options.installRoot);
    return runtimeName === 'hermes' ? path.join(root, '.hermes', 'skills') : path.join(root, '.openclaw', 'skills');
  }
  return resolvePathOption(runtimeConfig.install_dir, runtimeConfig.install_dir);
}

function resolveRuntimeSkills(runtimeName, runtimeConfig, catalog, sourceMap) {
  const skillIds =
    runtimeConfig.strategy === 'all-catalog-skills' ? [...catalog.keys()].sort() : [...new Set(runtimeConfig.include || [])].sort();

  return skillIds.map((skillId) => {
    const catalogEntry = catalog.get(skillId);
    const sourceEntry = sourceMap.get(skillId);
    if (!catalogEntry) {
      throw new Error(`Runtime ${runtimeName} references unknown catalog skill: ${skillId}`);
    }
    if (!sourceEntry) {
      throw new Error(`Runtime ${runtimeName} references skill without source directory: ${skillId}`);
    }
    return {
      id: skillId,
      displayName: catalogEntry.displayName,
      description: catalogEntry.description || sourceEntry.frontmatter.description || '',
      sourceDir: sourceEntry.dir,
      mode: runtimeName === 'openclaw' ? 'adapted' : 'verbatim',
    };
  });
}

async function exportBundles(runtimePlan, config) {
  await fs.ensureDir(runtimePlan.outputDir);
  const result = {
    outputDir: runtimePlan.outputDir,
    runtimes: {},
  };

  for (const [runtimeName, runtime] of Object.entries(runtimePlan.runtimes)) {
    await fs.remove(runtime.bundleDir);
    await fs.ensureDir(runtime.skillsDir);

    const exportedSkills = [];
    for (const skill of runtime.skills) {
      const targetDir = path.join(runtime.skillsDir, skill.id);
      await copySkillDirectory(skill.sourceDir, targetDir);
      if (skill.mode === 'adapted') {
        await adaptOpenClawSkill(skill, targetDir, config.worker_contract || {});
      }
      exportedSkills.push({
        id: skill.id,
        mode: skill.mode,
        source_dir: path.relative(PROJECT_ROOT, skill.sourceDir),
      });
    }

    const runtimeManifest = {
      runtime: runtimeName,
      strategy: runtime.config.strategy,
      install_dir: runtime.installDir,
      skill_count: exportedSkills.length,
      skills: exportedSkills,
    };

    const manifestPath = path.join(runtime.bundleDir, 'bundle-manifest.yaml');
    await fs.writeFile(manifestPath, yaml.stringify(runtimeManifest), 'utf8');

    result.runtimes[runtimeName] = {
      bundleDir: runtime.bundleDir,
      skillsDir: runtime.skillsDir,
      installDir: runtime.installDir,
      skillCount: exportedSkills.length,
      skills: exportedSkills,
      manifestPath,
    };
  }

  const topLevelManifest = {
    bundle_id: runtimePlan.bundleId,
    generated_at: new Date().toISOString(),
    output_dir: runtimePlan.outputDir,
    runtimes: Object.fromEntries(
      Object.entries(result.runtimes).map(([runtimeName, runtime]) => [
        runtimeName,
        {
          bundle_dir: runtime.bundleDir,
          install_dir: runtime.installDir,
          skill_count: runtime.skillCount,
        },
      ]),
    ),
  };

  const topLevelManifestPath = path.join(runtimePlan.outputDir, 'runtime-manifest.yaml');
  await fs.writeFile(topLevelManifestPath, yaml.stringify(topLevelManifest), 'utf8');
  result.manifestPath = topLevelManifestPath;

  return result;
}

async function copySkillDirectory(sourceDir, targetDir) {
  const skipPatterns = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
  const skipSuffixes = ['~', '.swp', '.swo', '.bak'];
  await fs.copy(sourceDir, targetDir, {
    filter: (sourcePath) => {
      if (sourcePath === sourceDir) return true;
      const name = path.basename(sourcePath);
      if (skipPatterns.has(name)) return false;
      if (name.startsWith('.') && name !== '.gitkeep') return false;
      if (skipSuffixes.some((suffix) => name.endsWith(suffix))) return false;
      return true;
    },
  });
}

async function adaptOpenClawSkill(skill, targetDir, workerContract) {
  const targetSkillFile = path.join(targetDir, 'SKILL.md');
  const parsed = await parseSkillFile(targetSkillFile);
  if (!parsed) {
    throw new Error(`Unable to parse SKILL.md for OpenClaw adaptation: ${skill.id}`);
  }

  const preambleTemplate = await fs.readFile(PREAMBLE_PATH, 'utf8');
  const preamble = preambleTemplate
    .replaceAll('{skill_name}', skill.id)
    .replaceAll('{handoff_file}', workerContract.handoff_file || '_bmad-output/openclaw-hermes/handoff.md')
    .trim();

  const newSkillFile = ['---', yaml.stringify(parsed.frontmatter).trimEnd(), '---', '', preamble, '', parsed.body.trimStart()].join('\n');

  await fs.writeFile(targetSkillFile, newSkillFile + '\n', 'utf8');
}

async function installBundles(exportResult, runtimePlan) {
  const installResult = {
    runtimes: {},
  };

  for (const [runtimeName, runtime] of Object.entries(runtimePlan.runtimes)) {
    const runtimeExport = exportResult.runtimes[runtimeName];
    const installDir = runtime.installDir;
    await fs.ensureDir(installDir);

    const markerPath = path.join(installDir, '.bmad-openclaw-hermes-runtime.json');
    const previousManaged = await loadPreviousManagedSkills(markerPath);
    const currentManaged = new Set(runtime.skills.map((skill) => skill.id));
    for (const skillId of new Set([...previousManaged, ...currentManaged])) {
      await fs.remove(path.join(installDir, skillId));
    }

    for (const skill of runtime.skills) {
      const sourceDir = path.join(runtimeExport.skillsDir, skill.id);
      const targetDir = path.join(installDir, skill.id);
      await copySkillDirectory(sourceDir, targetDir);
    }

    const marker = {
      bundle_id: runtimePlan.bundleId,
      runtime: runtimeName,
      installed_at: new Date().toISOString(),
      managed_skills: runtime.skills.map((skill) => skill.id),
      source_bundle_dir: runtimeExport.bundleDir,
    };
    await fs.writeFile(markerPath, JSON.stringify(marker, null, 2) + '\n', 'utf8');

    installResult.runtimes[runtimeName] = {
      installDir,
      skillCount: runtime.skills.length,
      markerPath,
    };
  }

  return installResult;
}

async function loadPreviousManagedSkills(markerPath) {
  if (!(await fs.pathExists(markerPath))) return new Set();
  try {
    const content = await fs.readFile(markerPath, 'utf8');
    const parsed = JSON.parse(content);
    return new Set(parsed.managed_skills || []);
  } catch {
    return new Set();
  }
}

function printPlan(runtimePlan, options) {
  if (options.quiet) return;
  console.log(`Bundle: ${runtimePlan.bundleId}`);
  console.log(`Output: ${runtimePlan.outputDir}`);
  for (const [runtimeName, runtime] of Object.entries(runtimePlan.runtimes)) {
    console.log(`\n[${runtimeName}]`);
    console.log(`  Install dir: ${runtime.installDir}`);
    console.log(`  Strategy: ${runtime.config.strategy}`);
    console.log(`  Skills: ${runtime.skills.length}`);
    for (const skill of runtime.skills) {
      console.log(`    - ${skill.id} (${skill.mode})`);
    }
  }
}

function printExportSummary(exportResult, options) {
  if (options.quiet) return;
  console.log(`Exported bundles to ${exportResult.outputDir}`);
  for (const [runtimeName, runtime] of Object.entries(exportResult.runtimes)) {
    console.log(`- ${runtimeName}: ${runtime.skillCount} skills -> ${runtime.bundleDir}`);
  }
}

function printInstallSummary(installResult, options) {
  if (options.quiet) return;
  for (const [runtimeName, runtime] of Object.entries(installResult.runtimes)) {
    console.log(`- ${runtimeName}: ${runtime.skillCount} skills installed to ${runtime.installDir}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
