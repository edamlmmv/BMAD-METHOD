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

    section('Workspace Packet Freshness');

    const missingPacket = runCli(['workspace', 'packet', launchOutput.missionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingPacketText = `${missingPacket.stdout}\n${missingPacket.stderr}`;
    assert(missingPacket.status !== 0, 'packet without intake exits nonzero', missingPacketText);
    assert(missingPacketText.includes('missing-intake'), 'packet without intake names missing-intake', missingPacketText);

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

    const stalePacket = runCli(['workspace', 'packet', launchOutput.missionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const stalePacketText = `${stalePacket.stdout}\n${stalePacket.stderr}`;
    assert(stalePacket.status !== 0, 'packet with stale intake exits nonzero', stalePacketText);
    assert(stalePacketText.includes('stale-intake'), 'packet with stale intake names stale-intake', stalePacketText);

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

    const packet = runCli(['workspace', 'packet', launchOutput.missionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const packetText = `${packet.stdout}\n${packet.stderr}`;
    assert(packet.status === 0, 'packet with fresh intake exits zero', packetText);
    const packetOutput = JSON.parse(packet.stdout);
    assert(fs.existsSync(packetOutput.packetPath), 'packet writes bmad-mission-packet.json', packetText);
    assert(fs.existsSync(packetOutput.renderedPromptPath), 'packet writes rendered-prompt.md', packetText);
    assert(fs.existsSync(packetOutput.capabilityContractPath), 'packet writes capabilities.json', packetText);

    const missionPacket = readJson(packetOutput.packetPath);
    assert(missionPacket.goal === 'Fix target repo bug.', 'packet records goal from goal file', JSON.stringify(missionPacket, null, 2));
    assert(
      missionPacket.repoIntakeRefs.includes('intake/repo-intake.json'),
      'packet references repo intake',
      JSON.stringify(missionPacket, null, 2),
    );
    assert(
      missionPacket.constraints.includes('Do not mutate Workspace Distro'),
      'packet records base isolation constraint',
      JSON.stringify(missionPacket, null, 2),
    );
    assert(missionPacket.grants.includes('grants.json'), 'packet references grants', JSON.stringify(missionPacket, null, 2));
    assert(missionPacket.acceptanceCriteria.length > 0, 'packet includes acceptance criteria', JSON.stringify(missionPacket, null, 2));
    assert(
      missionPacket.capabilityContractRef === 'capabilities.json',
      'packet references Capability Contract',
      JSON.stringify(missionPacket, null, 2),
    );
    assert(
      missionPacket.renderedPromptRef === 'packets/rendered-prompt.md',
      'packet references rendered prompt',
      JSON.stringify(missionPacket, null, 2),
    );

    const renderedPrompt = fs.readFileSync(packetOutput.renderedPromptPath, 'utf8');
    assert(renderedPrompt.includes('Source of truth: `packets/bmad-mission-packet.json`'), 'rendered prompt names packet source');
    assert(renderedPrompt.includes('Fix target repo bug.'), 'rendered prompt includes packet goal');
    assert(renderedPrompt.includes('Do not mutate Workspace Distro'), 'rendered prompt includes packet constraints');

    section('Workspace Review');

    const cleanReview = runCli(['workspace', 'review', launchOutput.missionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const cleanReviewText = `${cleanReview.stdout}\n${cleanReview.stderr}`;
    assert(cleanReview.status === 0, 'clean review exits zero', cleanReviewText);
    const cleanReviewOutput = JSON.parse(cleanReview.stdout);
    assert(fs.existsSync(cleanReviewOutput.summaryPath), 'clean review writes summary.json', cleanReviewText);
    const cleanSummary = readJson(cleanReviewOutput.summaryPath);
    assert(cleanSummary.clean === true, 'clean review reports clean worktree', JSON.stringify(cleanSummary, null, 2));
    assert(cleanSummary.repos[0].patchPath === null, 'clean review has no patch path', JSON.stringify(cleanSummary, null, 2));

    const reviewRepoPack = readJson(launchOutput.repoPackPath);
    const worktreeReadme = path.join(reviewRepoPack.repos[0].worktreePath, 'README.md');
    fs.appendFileSync(worktreeReadme, 'Worktree review change.\n');

    const changedReview = runCli(['workspace', 'review', launchOutput.missionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const changedReviewText = `${changedReview.stdout}\n${changedReview.stderr}`;
    assert(changedReview.status === 0, 'changed review exits zero', changedReviewText);
    const changedReviewOutput = JSON.parse(changedReview.stdout);
    const changedSummary = readJson(changedReviewOutput.summaryPath);
    assert(changedSummary.clean === false, 'changed review reports dirty worktree', JSON.stringify(changedSummary, null, 2));
    assert(
      changedSummary.repos[0].changedFiles.includes('README.md'),
      'changed review records changed file',
      JSON.stringify(changedSummary, null, 2),
    );
    assert(
      fs.existsSync(changedSummary.repos[0].statusPath),
      'changed review writes per-repo status.json',
      JSON.stringify(changedSummary, null, 2),
    );
    assert(fs.existsSync(changedSummary.repos[0].patchPath), 'changed review writes diff.patch', JSON.stringify(changedSummary, null, 2));
    const reviewPatch = fs.readFileSync(changedSummary.repos[0].patchPath, 'utf8');
    assert(reviewPatch.includes('Worktree review change.'), 'changed review patch includes worktree diff');

    section('Workspace Destroy');

    const cleanDestroyLaunch = runCli(
      ['workspace', 'launch', '--repo', targetRepo.path, '--goal', goalPath, '--runtime-root', runtimeRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const cleanDestroyLaunchText = `${cleanDestroyLaunch.stdout}\n${cleanDestroyLaunch.stderr}`;
    assert(cleanDestroyLaunch.status === 0, 'destroy fixture launch exits zero', cleanDestroyLaunchText);
    const cleanDestroyMission = JSON.parse(cleanDestroyLaunch.stdout);
    const destroy = runCli(['workspace', 'destroy', cleanDestroyMission.missionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const destroyText = `${destroy.stdout}\n${destroy.stderr}`;
    assert(destroy.status === 0, 'destroy exits zero', destroyText);
    const destroyOutput = JSON.parse(destroy.stdout);
    assert(destroyOutput.removed === true, 'destroy reports removal', destroyText);
    assert(!fs.existsSync(cleanDestroyMission.missionRoot), 'destroy removes mission root', destroyText);
    assert(git(['rev-parse', 'HEAD'], targetRepo.path) === newTargetHead, 'destroy preserves source repo HEAD');

    const keepReviewDestroy = runCli(['workspace', 'destroy', launchOutput.missionId, '--runtime-root', runtimeRoot, '--keep-review'], {
      cwd: baseRepo.path,
    });
    const keepReviewDestroyText = `${keepReviewDestroy.stdout}\n${keepReviewDestroy.stderr}`;
    assert(keepReviewDestroy.status === 0, 'destroy --keep-review exits zero', keepReviewDestroyText);
    const keepReviewOutput = JSON.parse(keepReviewDestroy.stdout);
    assert(!fs.existsSync(launchOutput.missionRoot), 'destroy --keep-review removes mission root', keepReviewDestroyText);
    assert(fs.existsSync(keepReviewOutput.retainedReviewPath), 'destroy --keep-review retains review artifacts', keepReviewDestroyText);
    assert(
      fs.existsSync(path.join(keepReviewOutput.retainedReviewPath, 'repo-1', 'diff.patch')),
      'destroy --keep-review retains per-repo patch',
      keepReviewDestroyText,
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
