/**
 * BMAD upstream-sync tests.
 *
 * Public behavior: a dry run creates only evidence, and apply remains
 * approval/hash/clean-tree guarded.
 */

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { execFileSync, spawnSync } = require('node:child_process');

const { createPlan, applyPlan, verifyPlanHash } = require('../tools/upstream-sync');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

let passed = 0;
let failed = 0;

function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}

function git(repoRoot, args, options = {}) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function writeFile(root, rel, content) {
  const target = path.join(root, rel);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, content, 'utf8');
}

async function setupRepo() {
  const repoRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'bmad-upstream-sync-'));
  git(repoRoot, ['init', '-q']);
  git(repoRoot, ['config', 'user.email', 'tests@example.com']);
  git(repoRoot, ['config', 'user.name', 'BMAD Tests']);

  await writeFile(repoRoot, 'package.json', JSON.stringify({ name: 'bmad-method', version: '6.6.0' }, null, 2) + '\n');
  await writeFile(
    repoRoot,
    'src/core-skills/bmad-alpha/SKILL.md',
    ['---', 'name: bmad-alpha', 'description: Alpha old skill', '---', '', 'Alpha body.'].join('\n'),
  );
  await writeFile(
    repoRoot,
    'src/core-skills/bmad-beta/SKILL.md',
    ['---', 'name: bmad-beta', 'description: Beta old skill', '---', '', 'Beta body.'].join('\n'),
  );
  await writeFile(
    repoRoot,
    'src/core-skills/bmad-rename/SKILL.md',
    ['---', 'name: bmad-rename', 'description: Rename me', '---', '', 'Same body.'].join('\n'),
  );
  await writeFile(
    repoRoot,
    '_bmad/_config/bmad-help.csv',
    'module,skill,display-name,menu-code,description,action,args,phase,preceded-by,followed-by,required,output-location,outputs\nCore,bmad-alpha,Alpha,AL,,,,anytime,,,false,,\n',
  );
  await writeFile(repoRoot, 'tools/installer/commands/install.js', 'module.exports = { command: "install" };\n');
  git(repoRoot, ['add', '.']);
  git(repoRoot, ['commit', '-q', '-m', 'test: seed upstream sync fixture']);
  git(repoRoot, ['tag', 'v6.6.0']);

  await fsp.rm(path.join(repoRoot, 'src/core-skills/bmad-alpha'), { recursive: true, force: true });
  await fsp.rm(path.join(repoRoot, 'src/core-skills/bmad-beta'), { recursive: true, force: true });
  await fsp.rename(path.join(repoRoot, 'src/core-skills/bmad-rename'), path.join(repoRoot, 'src/core-skills/bmad-renamed'));
  await writeFile(
    repoRoot,
    'src/core-skills/bmad-combined/SKILL.md',
    [
      '---',
      'name: bmad-combined',
      'description: Combined replacement for bmad-alpha and bmad-beta',
      '---',
      '',
      'Merged from bmad-alpha and bmad-beta.',
    ].join('\n'),
  );
  await writeFile(
    repoRoot,
    'src/bmm-skills/4-implementation/bmad-new/SKILL.md',
    ['---', 'name: bmad-new', 'description: New BMAD route', '---', '', 'New body.'].join('\n'),
  );
  await writeFile(
    repoRoot,
    '_bmad/_config/bmad-help.csv',
    'module,skill,display-name,menu-code,description,action,args,phase,preceded-by,followed-by,required,output-location,outputs\nCore,bmad-combined,Combined,CB,,,,anytime,,,false,,\n',
  );
  await writeFile(repoRoot, 'tools/installer/commands/install.js', 'module.exports = { command: "install", updated: true };\n');
  await writeFile(repoRoot, 'docs/workspace/templates/upstream-sync.md', '# Template\n');
  await writeFile(repoRoot, 'test/test-new-route.js', 'console.log("ok");\n');
  await writeFile(repoRoot, '_bmad/custom/upstream.toml', 'blocked = true\n');
  git(repoRoot, ['add', '-A']);
  git(repoRoot, ['commit', '-q', '-m', 'test: model upstream bmad update']);
  git(repoRoot, ['tag', 'v6.7.0']);

  return repoRoot;
}

async function runTests() {
  console.log(`${colors.cyan}========================================`);
  console.log('BMAD Upstream Sync Tests');
  console.log(`========================================${colors.reset}\n`);

  let repoRoot;
  try {
    repoRoot = await setupRepo();
    const outputPath = path.join(repoRoot, '_bmad-output', 'upstream-sync', 'fixture', 'plan.json');
    const beforeStatus = git(repoRoot, ['status', '--short', '--untracked-files=all']);

    const plan = createPlan({
      repoRoot,
      fromRef: 'v6.6.0',
      toRef: 'v6.7.0',
      outputPath,
      now: '2026-05-10T00:00:00.000Z',
    });

    const afterStatus = git(repoRoot, ['status', '--short', '--untracked-files=all']);
    const dirtyLines = afterStatus.split('\n').filter(Boolean);

    assert(beforeStatus === '', 'fixture starts clean');
    assert(fs.existsSync(outputPath), 'dry-run writes plan.json evidence');
    assert(
      dirtyLines.length === 1 && dirtyLines[0].includes('_bmad-output/upstream-sync/fixture/plan.json'),
      'dry-run writes only approved upstream-sync evidence',
      afterStatus,
    );
    assert(plan.schemaVersion === 'bmad-upstream-sync-plan.v1', 'plan schema is versioned');
    assert(plan.planHash && verifyPlanHash(plan).ok, 'plan hash verifies');
    assert(
      plan.changes.addedBmads.some((entry) => entry.id === 'bmad-new'),
      'dry-run detects added BMAD',
    );
    assert(
      plan.changes.removedBmads.some((entry) => entry.id === 'bmad-alpha'),
      'dry-run detects removed BMAD',
    );
    assert(
      plan.changes.renamedBmads.some((entry) => entry.fromId === 'bmad-rename'),
      'dry-run detects renamed BMAD',
    );
    assert(
      plan.changes.mergedBmads.some((entry) => entry.intoId === 'bmad-combined'),
      'dry-run detects merged BMADs',
    );
    assert(plan.changes.helpCatalogChanges.length > 0, 'dry-run detects help/catalog changes');
    assert(plan.changes.installerManifestChanges.length > 0, 'dry-run detects installer changes');
    assert(plan.changes.docsTemplateTestChanges.length > 0, 'dry-run detects docs/templates/tests changes');
    assert(plan.evidence.npmVersion.source === 'package.json', 'npm version is recorded as sanity evidence');
    assert(plan.authority.npmVersion === 'sanity-evidence-only', 'npm version cannot override git ref authority');
    assert(plan.evidence.livePostgreSQL.status === 'skipped', 'live PostgreSQL gate skipped when env unset');

    const cliPlanPath = '_bmad-output/upstream-sync/fixture/cli-plan.json';
    const cli = spawnSync(
      process.execPath,
      [
        path.join(__dirname, '..', 'tools', 'installer', 'bmad-cli.js'),
        'upstream-sync',
        '--repo',
        repoRoot,
        '--from',
        'v6.6.0',
        '--to',
        'v6.7.0',
        '--output',
        cliPlanPath,
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, BMAD_DISABLE_UPDATE_CHECK: '1' },
      },
    );
    assert(cli.status === 0, 'public CLI dry-run exits 0', cli.stderr);
    const cliPlan = JSON.parse(cli.stdout);
    assert(cliPlan.schemaVersion === 'bmad-upstream-sync-plan.v1', 'public CLI dry-run prints plan JSON');
    assert(fs.existsSync(path.join(repoRoot, cliPlanPath)), 'public CLI dry-run writes requested plan evidence');

    try {
      applyPlan({ repoRoot, planPath: outputPath, approved: false });
      assert(false, 'apply rejects missing --approved');
    } catch (error) {
      assert(error.message.includes('--approved'), 'apply rejects missing --approved');
    }

    const tamperedPath = path.join(repoRoot, '_bmad-output', 'upstream-sync', 'fixture', 'tampered-plan.json');
    const tampered = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    tampered.command.toRef = 'v9.9.9';
    await fsp.writeFile(tamperedPath, JSON.stringify(tampered, null, 2) + '\n', 'utf8');
    try {
      applyPlan({ repoRoot, planPath: tamperedPath, approved: true });
      assert(false, 'apply rejects manifest/hash mismatch');
    } catch (error) {
      assert(error.message.includes('hash mismatch'), 'apply rejects manifest/hash mismatch');
    }

    try {
      applyPlan({ repoRoot, planPath: outputPath, approved: true });
      assert(false, 'apply rejects planned _bmad/custom changes');
    } catch (error) {
      assert(error.message.includes('planned _bmad/custom'), 'apply rejects planned _bmad/custom changes');
    }

    await writeFile(repoRoot, 'src/core-skills/local-dirty/SKILL.md', 'dirty\n');
    try {
      applyPlan({ repoRoot, planPath: outputPath, approved: true });
      assert(false, 'apply rejects dirty source tree');
    } catch (error) {
      assert(error.message.includes('dirty source tree'), 'apply rejects dirty source tree');
    }

    await writeFile(repoRoot, '_bmad/custom/config.toml', 'dirty = true\n');
    try {
      applyPlan({ repoRoot, planPath: outputPath, approved: true });
      assert(false, 'apply rejects _bmad/custom changes');
    } catch (error) {
      assert(error.message.includes('_bmad/custom'), 'apply rejects _bmad/custom changes');
    }
  } catch (error) {
    assert(false, 'upstream-sync test suite completes', error.message);
    console.error(error.stack);
  } finally {
    if (repoRoot) await fsp.rm(repoRoot, { recursive: true, force: true }).catch(() => {});
  }

  console.log('');
  console.log(`${colors.cyan}========================================`);
  console.log('Test Results:');
  console.log(`  Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`========================================${colors.reset}\n`);

  if (failed === 0) {
    console.log(`${colors.green}✨ All upstream-sync tests passed!${colors.reset}\n`);
    process.exit(0);
  }
  console.log(`${colors.red}❌ Some upstream-sync tests failed${colors.reset}\n`);
  process.exit(1);
}

runTests().catch((error) => {
  console.error(`${colors.red}Test runner failed:${colors.reset}`, error.message);
  console.error(error.stack);
  process.exit(1);
});
