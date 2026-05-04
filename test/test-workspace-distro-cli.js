/**
 * Workspace Distro CLI Tests
 *
 * Public behavior checks for the BMAD Workspace Distro V1 CLI surface.
 * Usage: node test/test-workspace-distro-cli.js
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
  dim: '\u001B[2m',
};

const repoRoot = path.join(__dirname, '..');
const cliPath = path.join(repoRoot, 'tools', 'installer', 'bmad-cli.js');

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

function section(title) {
  console.log(`\n${colors.cyan}── ${title} ──${colors.reset}`);
}

function cleanGitEnv(extra = {}) {
  const env = {
    ...process.env,
    ...extra,
  };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX']) {
    delete env[key];
  }
  return env;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: cleanGitEnv({
      BMAD_DISABLE_UPDATE_CHECK: '1',
      NO_COLOR: '1',
      ...options.env,
    }),
  });
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: cleanGitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function createGitRepo(parentDir, name) {
  const repoDir = path.join(parentDir, name);
  fs.mkdirSync(repoDir, { recursive: true });
  git(['init'], repoDir);
  git(['config', 'user.email', 'workspace-test@example.com'], repoDir);
  git(['config', 'user.name', 'Workspace Test'], repoDir);
  fs.writeFileSync(path.join(repoDir, 'README.md'), `# ${name}\n`);
  git(['add', 'README.md'], repoDir);
  git(['commit', '-m', 'initial commit'], repoDir);
  return {
    path: repoDir,
    head: git(['rev-parse', 'HEAD'], repoDir),
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runTests() {
  section('Workspace CLI Help');

  const result = runCli(['workspace', '--help']);
  const output = `${result.stdout}\n${result.stderr}`;

  assert(result.status === 0, 'workspace help exits zero', output);
  assert(output.includes('BMAD Workspace Distro'), 'workspace help names BMAD Workspace Distro', output);
  for (const subcommand of ['launch', 'intake', 'packet', 'review', 'destroy']) {
    assert(output.includes(subcommand), `workspace help lists ${subcommand}`, output);
  }

  section('Workspace Launch');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-workspace-cli-'));
  const baseRepo = createGitRepo(tempRoot, 'workspace-distro-base');
  const targetRepo = createGitRepo(tempRoot, 'target-repo');
  const goalPath = path.join(tempRoot, 'goal.md');
  const runtimeRoot = path.join(tempRoot, 'runtime');
  fs.writeFileSync(goalPath, 'Fix target repo bug.\n');

  let launchOutput;
  try {
    const launch = runCli(['workspace', 'launch', '--repo', targetRepo.path, '--goal', goalPath, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const launchText = `${launch.stdout}\n${launch.stderr}`;

    assert(launch.status === 0, 'launch exits zero', launchText);
    launchOutput = JSON.parse(launch.stdout);
    assert(fs.existsSync(launchOutput.missionRoot), 'launch creates mission root', launchText);
    assert(fs.existsSync(path.join(launchOutput.missionRoot, 'instance.json')), 'launch writes instance.json', launchText);
    assert(fs.existsSync(path.join(launchOutput.missionRoot, 'repo-pack.json')), 'launch writes repo-pack.json', launchText);
    assert(fs.existsSync(path.join(launchOutput.missionRoot, 'grants.json')), 'launch writes grants.json', launchText);

    const repoPack = readJson(path.join(launchOutput.missionRoot, 'repo-pack.json'));
    assert(repoPack.repos.length === 1, 'repo pack records one repo', JSON.stringify(repoPack, null, 2));
    assert(repoPack.repos[0].head === targetRepo.head, 'repo pack records target HEAD', JSON.stringify(repoPack, null, 2));
    assert(fs.existsSync(repoPack.repos[0].worktreePath), 'launch creates repo worktree', JSON.stringify(repoPack, null, 2));

    const grants = readJson(path.join(launchOutput.missionRoot, 'grants.json'));
    assert(grants.baseMutationGrant === false, 'normal launch has no Base Mutation Grant', JSON.stringify(grants, null, 2));

    const baseStatus = git(['status', '--short'], baseRepo.path);
    assert(baseStatus === '', 'launch does not dirty Workspace Distro base repo', baseStatus);

    section('Workspace Intake');

    const intake = runCli(['workspace', 'intake', launchOutput.missionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const intakeText = `${intake.stdout}\n${intake.stderr}`;

    assert(intake.status === 0, 'intake exits zero', intakeText);
    const intakeOutput = JSON.parse(intake.stdout);
    assert(fs.existsSync(intakeOutput.repoIntakePath), 'intake writes repo-intake.json', intakeText);
    assert(fs.existsSync(intakeOutput.provenancePath), 'intake writes provenance.json', intakeText);

    const repoIntake = readJson(intakeOutput.repoIntakePath);
    assert(repoIntake.missionId === launchOutput.missionId, 'repo intake records mission id', JSON.stringify(repoIntake, null, 2));
    assert(repoIntake.repos[0].head === targetRepo.head, 'repo intake records target repo HEAD', JSON.stringify(repoIntake, null, 2));
    assert(repoIntake.scanner.mode === 'code-only', 'repo intake records code-only scanner mode', JSON.stringify(repoIntake, null, 2));

    const provenance = readJson(intakeOutput.provenancePath);
    assert(provenance.missionId === launchOutput.missionId, 'provenance records mission id', JSON.stringify(provenance, null, 2));
    assert(provenance.scanner.id === 'workspace-distro.git-intake', 'provenance records scanner id', JSON.stringify(provenance, null, 2));

    fs.appendFileSync(path.join(targetRepo.path, 'README.md'), 'More detail.\n');
    git(['add', 'README.md'], targetRepo.path);
    git(['commit', '-m', 'update target repo'], targetRepo.path);
    const newTargetHead = git(['rev-parse', 'HEAD'], targetRepo.path);

    const reIntake = runCli(['workspace', 'intake', launchOutput.missionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const reIntakeText = `${reIntake.stdout}\n${reIntake.stderr}`;
    assert(reIntake.status === 0, 're-intake exits zero', reIntakeText);
    const reIntakeOutput = JSON.parse(reIntake.stdout);
    const updatedRepoIntake = readJson(reIntakeOutput.repoIntakePath);
    assert(
      updatedRepoIntake.repos[0].head === newTargetHead,
      're-intake records new target HEAD',
      JSON.stringify(updatedRepoIntake, null, 2),
    );
  } catch (error) {
    assert(false, 'workspace command emits parseable mission JSON', error.message);
  } finally {
    if (launchOutput?.repoPackPath && fs.existsSync(launchOutput.repoPackPath)) {
      const repoPack = readJson(launchOutput.repoPackPath);
      for (const repo of repoPack.repos || []) {
        if (fs.existsSync(repo.worktreePath)) {
          git(['-C', repo.sourcePath, 'worktree', 'remove', '--force', repo.worktreePath], tempRoot);
        }
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(`\n${colors.cyan}Results: ${passed} passed, ${failed} failed${colors.reset}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
