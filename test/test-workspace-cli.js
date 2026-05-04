/**
 * BMAD Workspace CLI Tests
 *
 * Public behavior checks for the BMAD Workspace V1 CLI surface.
 * Usage: node test/test-workspace-cli.js
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
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

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function fingerprintTree(root) {
  if (!fs.existsSync(root)) {
    return 'missing';
  }

  const entries = [];
  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath).sort()) {
      const absolutePath = path.join(currentPath, entry);
      const relativePath = path.relative(root, absolutePath);
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        entries.push({ type: 'dir', path: relativePath });
        walk(absolutePath);
        continue;
      }
      if (stat.isFile()) {
        entries.push({
          type: 'file',
          path: relativePath,
          sha256: sha256File(absolutePath),
        });
      }
    }
  }

  walk(root);
  return JSON.stringify(entries);
}

function assertSessionOutput(output, testPrefix) {
  assert(
    typeof output.sessionId === 'string' && output.sessionId.length > 0,
    `${testPrefix} has sessionId`,
    JSON.stringify(output, null, 2),
  );
  assert(!hasLegacyMissionKey(output), `${testPrefix} has no legacy mission keys`, JSON.stringify(output, null, 2));
}

function hasLegacyMissionKey(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasLegacyMissionKey);
  }
  return Object.keys(value).some((key) => key.startsWith('mission')) || Object.values(value).some(hasLegacyMissionKey);
}

function runTests() {
  section('Workspace CLI Help');

  const result = runCli(['workspace', '--help']);
  const output = `${result.stdout}\n${result.stderr}`;

  assert(result.status === 0, 'workspace help exits zero', output);
  assert(output.includes('BMAD Workspace'), 'workspace help names BMAD Workspace', output);
  assert(output.includes('Workspace Session'), 'workspace help uses session language', output);
  assert(output.includes('--session-id <id>'), 'workspace help lists --session-id', output);
  assert(!output.includes('--mission-id'), 'workspace help omits legacy --mission-id', output);
  for (const option of ['--zoom-out-ref', '--ubiquitous-language-ref', '--grill-decisions-ref', '--tdd-plan-ref', '--skip-setup']) {
    assert(output.includes(option), `workspace help lists ${option}`, output);
  }
  for (const subcommand of ['launch', 'intake', 'packet', 'status', 'review', 'destroy', 'authorize']) {
    assert(output.includes(subcommand), `workspace help lists ${subcommand}`, output);
  }

  section('Workspace Launch');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-workspace-cli-'));
  const baseRepo = createGitRepo(tempRoot, 'workspace-base');
  const targetRepo = createGitRepo(tempRoot, 'target-repo');
  const secondTargetRepo = createGitRepo(tempRoot, 'second-target-repo');
  const goalPath = path.join(tempRoot, 'goal.md');
  const runtimeRoot = path.join(tempRoot, 'runtime');
  fs.writeFileSync(goalPath, 'Fix target repo bug.\n');
  const setupDocsDir = path.join(baseRepo.path, 'docs', 'workspace');
  fs.mkdirSync(setupDocsDir, { recursive: true });
  fs.writeFileSync(path.join(setupDocsDir, 'v4-zoom-out.md'), 'Zoom out map.\n');
  fs.writeFileSync(path.join(setupDocsDir, 'v4-grill-decisions.md'), 'Decision log.\n');
  fs.writeFileSync(path.join(setupDocsDir, 'v4-backlog.md'), '# TDD Order\n');
  fs.writeFileSync(path.join(baseRepo.path, 'UBIQUITOUS_LANGUAGE.md'), '# Ubiquitous Language\n');

  let launchOutput;
  let multiRepoOutput;
  let baseImprovementOutput;
  let sessionLaunchOutput;
  try {
    const launch = runCli(['workspace', 'launch', '--repo', targetRepo.path, '--goal', goalPath, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const launchText = `${launch.stdout}\n${launch.stderr}`;

    assert(launch.status === 0, 'launch exits zero', launchText);
    launchOutput = JSON.parse(launch.stdout);
    assertSessionOutput(launchOutput, 'launch output');
    assert(fs.existsSync(launchOutput.sessionRoot), 'launch creates session root', launchText);
    assert(launchOutput.sessionRoot.includes(`${path.sep}sessions${path.sep}`), 'launch uses sessions runtime path', launchText);
    assert(fs.existsSync(path.join(launchOutput.sessionRoot, 'instance.json')), 'launch writes instance.json', launchText);
    assert(fs.existsSync(path.join(launchOutput.sessionRoot, 'repo-pack.json')), 'launch writes repo-pack.json', launchText);
    assert(fs.existsSync(path.join(launchOutput.sessionRoot, 'grants.json')), 'launch writes grants.json', launchText);

    const repoPack = readJson(path.join(launchOutput.sessionRoot, 'repo-pack.json'));
    assert(repoPack.repos.length === 1, 'repo pack records one repo', JSON.stringify(repoPack, null, 2));
    assert(repoPack.repos[0].head === targetRepo.head, 'repo pack records target HEAD', JSON.stringify(repoPack, null, 2));
    assert(fs.existsSync(repoPack.repos[0].worktreePath), 'launch creates repo worktree', JSON.stringify(repoPack, null, 2));

    const grants = readJson(path.join(launchOutput.sessionRoot, 'grants.json'));
    assert(grants.baseMutationGrant === false, 'normal launch has no Base Mutation Grant', JSON.stringify(grants, null, 2));

    const baseStatus = git(['status', '--short'], baseRepo.path);
    assert(baseStatus === '?? UBIQUITOUS_LANGUAGE.md\n?? docs/', 'launch does not add extra Workspace Base changes', baseStatus);

    section('Workspace Status');

    const missingStatus = runCli(['workspace', 'status', 'missing-session', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingStatusText = `${missingStatus.stdout}\n${missingStatus.stderr}`;
    assert(missingStatus.status !== 0, 'status for missing session exits nonzero', missingStatusText);
    assert(missingStatusText.includes('SESSION_NOT_FOUND'), 'missing status names SESSION_NOT_FOUND', missingStatusText);

    const beforeLaunchStatus = fingerprintTree(launchOutput.sessionRoot);
    const launchStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const launchStatusText = `${launchStatus.stdout}\n${launchStatus.stderr}`;
    const afterLaunchStatus = fingerprintTree(launchOutput.sessionRoot);
    assert(launchStatus.status === 0, 'status after launch exits zero', launchStatusText);
    assert(beforeLaunchStatus === afterLaunchStatus, 'status after launch is read-only', launchStatusText);
    const launchStatusOutput = JSON.parse(launchStatus.stdout);
    assert(launchStatusOutput.status === 'blocked', 'status after launch reports blocked', launchStatusText);
    assert(
      launchStatusOutput.checks.some((item) => item.code === 'MISSING_INTAKE'),
      'status after launch reports missing intake',
      launchStatusText,
    );

    section('Workspace Session Id');

    const sessionLaunch = runCli(
      [
        'workspace',
        'launch',
        '--repo',
        targetRepo.path,
        '--goal',
        goalPath,
        '--runtime-root',
        runtimeRoot,
        '--session-id',
        'session-alias-only',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const sessionLaunchText = `${sessionLaunch.stdout}\n${sessionLaunch.stderr}`;
    assert(sessionLaunch.status === 0, 'launch accepts --session-id', sessionLaunchText);
    sessionLaunchOutput = JSON.parse(sessionLaunch.stdout);
    assert(sessionLaunchOutput.sessionId === 'session-alias-only', '--session-id sets sessionId', sessionLaunchText);
    assertSessionOutput(sessionLaunchOutput, '--session-id launch output');

    fs.mkdirSync(path.join(sessionLaunchOutput.sessionRoot, 'packets'), { recursive: true });
    fs.writeFileSync(path.join(sessionLaunchOutput.sessionRoot, 'packets', 'bmad-work-packet.json'), '{not-json\n');
    const malformedPacketStatus = runCli(['workspace', 'status', sessionLaunchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const malformedPacketStatusText = `${malformedPacketStatus.stdout}\n${malformedPacketStatus.stderr}`;
    assert(malformedPacketStatus.status === 0, 'status with malformed packet exits zero', malformedPacketStatusText);
    const malformedPacketStatusOutput = JSON.parse(malformedPacketStatus.stdout);
    assert(malformedPacketStatusOutput.status === 'invalid', 'status with malformed packet reports invalid', malformedPacketStatusText);
    assert(
      malformedPacketStatusOutput.checks.some((item) => item.code === 'WORK_PACKET_INVALID_JSON'),
      'status with malformed packet names WORK_PACKET_INVALID_JSON',
      malformedPacketStatusText,
    );

    const legacyMissionOption = runCli(
      [
        'workspace',
        'launch',
        '--repo',
        targetRepo.path,
        '--goal',
        goalPath,
        '--runtime-root',
        runtimeRoot,
        '--session-id',
        'session-left',
        '--mission-id',
        'session-right',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const legacyMissionOptionText = `${legacyMissionOption.stdout}\n${legacyMissionOption.stderr}`;
    assert(legacyMissionOption.status !== 0, 'legacy --mission-id exits nonzero', legacyMissionOptionText);
    assert(legacyMissionOptionText.includes('unknown option'), 'legacy --mission-id fails loudly', legacyMissionOptionText);

    section('Workspace Multi-Repo Launch');

    const multiLaunch = runCli(
      [
        'workspace',
        'launch',
        '--repo',
        targetRepo.path,
        '--repo',
        secondTargetRepo.path,
        '--goal',
        goalPath,
        '--runtime-root',
        runtimeRoot,
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const multiLaunchText = `${multiLaunch.stdout}\n${multiLaunch.stderr}`;
    assert(multiLaunch.status === 0, 'multi-repo launch exits zero', multiLaunchText);
    multiRepoOutput = JSON.parse(multiLaunch.stdout);
    assertSessionOutput(multiRepoOutput, 'multi-repo launch output');
    const multiRepoPack = readJson(multiRepoOutput.repoPackPath);
    assert(multiRepoPack.repos.length === 2, 'multi-repo launch records two repos', JSON.stringify(multiRepoPack, null, 2));
    assert(
      multiRepoPack.repos[0].head === targetRepo.head,
      'multi-repo launch records first repo HEAD',
      JSON.stringify(multiRepoPack, null, 2),
    );
    assert(
      multiRepoPack.repos[1].head === secondTargetRepo.head,
      'multi-repo launch records second repo HEAD',
      JSON.stringify(multiRepoPack, null, 2),
    );
    assert(
      fs.existsSync(multiRepoPack.repos[0].worktreePath),
      'multi-repo launch creates first worktree',
      JSON.stringify(multiRepoPack, null, 2),
    );
    assert(
      fs.existsSync(multiRepoPack.repos[1].worktreePath),
      'multi-repo launch creates second worktree',
      JSON.stringify(multiRepoPack, null, 2),
    );

    section('Workspace Grant Guard');

    const guardRepoPack = readJson(launchOutput.repoPackPath);
    const targetWritePath = path.join(guardRepoPack.repos[0].worktreePath, 'README.md');
    const allowedWrite = runCli(
      ['workspace', 'authorize', launchOutput.sessionId, '--write-path', targetWritePath, '--runtime-root', runtimeRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const allowedWriteText = `${allowedWrite.stdout}\n${allowedWrite.stderr}`;
    assert(allowedWrite.status === 0, 'Grant Guard allows target worktree write', allowedWriteText);
    const allowedWriteOutput = JSON.parse(allowedWrite.stdout);
    assertSessionOutput(allowedWriteOutput, 'Grant Guard allowed output');
    assert(allowedWriteOutput.allowed === true, 'Grant Guard reports allowed target write', allowedWriteText);

    const baseWritePath = path.join(baseRepo.path, 'BMAD.md');
    const deniedWrite = runCli(
      ['workspace', 'authorize', launchOutput.sessionId, '--write-path', baseWritePath, '--runtime-root', runtimeRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const deniedWriteText = `${deniedWrite.stdout}\n${deniedWrite.stderr}`;
    assert(deniedWrite.status !== 0, 'Grant Guard denies base write without grant', deniedWriteText);
    assert(deniedWriteText.includes('base-write-denied'), 'Grant Guard denial names base-write-denied', deniedWriteText);
    const violationsDir = path.join(launchOutput.sessionRoot, 'violations');
    const violationFiles = fs.existsSync(violationsDir) ? fs.readdirSync(violationsDir).filter((file) => file.endsWith('.json')) : [];
    assert(violationFiles.length === 1, 'Grant Guard records one violation artifact', JSON.stringify(violationFiles, null, 2));
    const violation = readJson(path.join(violationsDir, violationFiles[0]));
    assert(violation.reason === 'base-write-denied', 'Grant Guard violation records denial reason', JSON.stringify(violation, null, 2));

    const baseImprovementLaunch = runCli(
      ['workspace', 'launch', '--repo', baseRepo.path, '--goal', goalPath, '--runtime-root', runtimeRoot, '--base-improvement'],
      {
        cwd: baseRepo.path,
      },
    );
    const baseImprovementText = `${baseImprovementLaunch.stdout}\n${baseImprovementLaunch.stderr}`;
    assert(baseImprovementLaunch.status !== 0, 'Base Improvement launch without grant exits nonzero', baseImprovementText);
    assert(
      baseImprovementText.includes('base-improvement-requires-base-mutation-grant'),
      'Base Improvement launch without grant names missing grant',
      baseImprovementText,
    );

    const baseGrantPath = path.join(tempRoot, 'base-mutation-grant.json');
    fs.writeFileSync(
      baseGrantPath,
      `${JSON.stringify(
        {
          schemaVersion: '0.1',
          baseMutationGrant: true,
          allowedBasePaths: ['docs/workspace'],
          bmadArtifactRef: 'docs/workspace/v1-implementation-backlog.md',
        },
        null,
        2,
      )}\n`,
    );

    const grantedBaseLaunch = runCli(
      ['workspace', 'launch', '--goal', goalPath, '--runtime-root', runtimeRoot, '--base-improvement', '--grant', baseGrantPath],
      {
        cwd: baseRepo.path,
      },
    );
    const grantedBaseText = `${grantedBaseLaunch.stdout}\n${grantedBaseLaunch.stderr}`;
    assert(grantedBaseLaunch.status === 0, 'Base Improvement launch with grant exits zero', grantedBaseText);
    baseImprovementOutput = JSON.parse(grantedBaseLaunch.stdout);
    assertSessionOutput(baseImprovementOutput, 'Base Improvement launch output');
    const baseInstance = readJson(path.join(baseImprovementOutput.sessionRoot, 'instance.json'));
    assert(
      baseInstance.sessionType === 'base-improvement',
      'Base Improvement instance records session type',
      JSON.stringify(baseInstance, null, 2),
    );
    assert(
      fs.existsSync(path.join(baseImprovementOutput.sessionRoot, 'promotion-policy.json')),
      'Base Improvement writes promotion policy',
    );
    const promotionPolicy = readJson(path.join(baseImprovementOutput.sessionRoot, 'promotion-policy.json'));
    assert(promotionPolicy.explicitOnly === true, 'Promotion policy is explicit-only', JSON.stringify(promotionPolicy, null, 2));

    const baseRepoPack = readJson(baseImprovementOutput.repoPackPath);
    const baseWorktreePath = baseRepoPack.repos[0].worktreePath;
    assert(fs.existsSync(baseWorktreePath), 'Base Improvement creates BMAD Workspace worktree', JSON.stringify(baseRepoPack, null, 2));
    assert(
      git(['branch', '--show-current'], baseWorktreePath).startsWith('codex/workspace/'),
      'Base Improvement uses dedicated codex branch',
      JSON.stringify(baseRepoPack, null, 2),
    );

    const grantedBaseWrite = runCli(
      [
        'workspace',
        'authorize',
        baseImprovementOutput.sessionId,
        '--write-path',
        path.join(baseWorktreePath, 'docs', 'workspace', 's11.md'),
        '--runtime-root',
        runtimeRoot,
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const grantedBaseWriteText = `${grantedBaseWrite.stdout}\n${grantedBaseWrite.stderr}`;
    assert(grantedBaseWrite.status === 0, 'Grant Guard allows granted base path write', grantedBaseWriteText);
    const grantedBaseWriteOutput = JSON.parse(grantedBaseWrite.stdout);
    assertSessionOutput(grantedBaseWriteOutput, 'Grant Guard base output');
    assert(grantedBaseWriteOutput.scope === 'workspace-base', 'Grant Guard reports workspace-base scope', grantedBaseWriteText);

    const blockedBaseStatus = runCli(['workspace', 'status', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const blockedBaseStatusText = `${blockedBaseStatus.stdout}\n${blockedBaseStatus.stderr}`;
    assert(blockedBaseStatus.status === 0, 'Base Improvement status exits zero while blocked', blockedBaseStatusText);
    const blockedBaseStatusOutput = JSON.parse(blockedBaseStatus.stdout);
    assert(
      blockedBaseStatusOutput.baseImprovementReadiness.state === 'blocked',
      'Base Improvement status reports blocked readiness',
      blockedBaseStatusText,
    );

    const baseIntake = runCli(['workspace', 'intake', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const baseIntakeText = `${baseIntake.stdout}\n${baseIntake.stderr}`;
    assert(baseIntake.status === 0, 'Base Improvement intake exits zero', baseIntakeText);

    const basePacket = runCli(
      [
        'workspace',
        'packet',
        baseImprovementOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'docs/workspace/v4-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/v4-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/v4-backlog.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const basePacketText = `${basePacket.stdout}\n${basePacket.stderr}`;
    assert(basePacket.status === 0, 'Base Improvement packet exits zero', basePacketText);

    const baseReview = runCli(['workspace', 'review', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const baseReviewText = `${baseReview.stdout}\n${baseReview.stderr}`;
    assert(baseReview.status === 0, 'Base Improvement review exits zero', baseReviewText);

    const readyBaseStatus = runCli(['workspace', 'status', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const readyBaseStatusText = `${readyBaseStatus.stdout}\n${readyBaseStatus.stderr}`;
    assert(readyBaseStatus.status === 0, 'Base Improvement ready status exits zero', readyBaseStatusText);
    const readyBaseStatusOutput = JSON.parse(readyBaseStatus.stdout);
    assert(
      readyBaseStatusOutput.baseImprovementReadiness.state === 'ready-for-human-review',
      'Base Improvement status reports ready for human review',
      readyBaseStatusText,
    );

    const deniedBaseWrite = runCli(
      [
        'workspace',
        'authorize',
        baseImprovementOutput.sessionId,
        '--write-path',
        path.join(baseWorktreePath, 'README.md'),
        '--runtime-root',
        runtimeRoot,
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const deniedBaseWriteText = `${deniedBaseWrite.stdout}\n${deniedBaseWrite.stderr}`;
    assert(deniedBaseWrite.status !== 0, 'Grant Guard denies out-of-grant base path write', deniedBaseWriteText);
    assert(deniedBaseWriteText.includes('base-path-not-granted'), 'Out-of-grant denial names base-path-not-granted', deniedBaseWriteText);

    section('Workspace Packet Freshness');

    const missingPacket = runCli(['workspace', 'packet', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingPacketText = `${missingPacket.stdout}\n${missingPacket.stderr}`;
    assert(missingPacket.status !== 0, 'packet without intake exits nonzero', missingPacketText);
    assert(missingPacketText.includes('missing-intake'), 'packet without intake names missing-intake', missingPacketText);

    section('Workspace Intake');

    const intake = runCli(['workspace', 'intake', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const intakeText = `${intake.stdout}\n${intake.stderr}`;

    assert(intake.status === 0, 'intake exits zero', intakeText);
    const intakeOutput = JSON.parse(intake.stdout);
    assertSessionOutput(intakeOutput, 'intake output');
    assert(fs.existsSync(intakeOutput.repoIntakePath), 'intake writes repo-intake.json', intakeText);
    assert(fs.existsSync(intakeOutput.provenancePath), 'intake writes provenance.json', intakeText);

    const repoIntake = readJson(intakeOutput.repoIntakePath);
    assert(repoIntake.sessionId === launchOutput.sessionId, 'repo intake records session id', JSON.stringify(repoIntake, null, 2));
    assert(repoIntake.repos[0].head === targetRepo.head, 'repo intake records target repo HEAD', JSON.stringify(repoIntake, null, 2));
    assert(repoIntake.scanner.mode === 'code-only', 'repo intake records code-only scanner mode', JSON.stringify(repoIntake, null, 2));

    const provenance = readJson(intakeOutput.provenancePath);
    assert(provenance.sessionId === launchOutput.sessionId, 'provenance records session id', JSON.stringify(provenance, null, 2));
    assert(provenance.scanner.id === 'workspace.git-intake', 'provenance records scanner id', JSON.stringify(provenance, null, 2));

    fs.appendFileSync(path.join(targetRepo.path, 'README.md'), 'More detail.\n');
    git(['add', 'README.md'], targetRepo.path);
    git(['commit', '-m', 'update target repo'], targetRepo.path);
    const newTargetHead = git(['rev-parse', 'HEAD'], targetRepo.path);

    const stalePacket = runCli(['workspace', 'packet', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const stalePacketText = `${stalePacket.stdout}\n${stalePacket.stderr}`;
    assert(stalePacket.status !== 0, 'packet with stale intake exits nonzero', stalePacketText);
    assert(stalePacketText.includes('stale-intake'), 'packet with stale intake names stale-intake', stalePacketText);

    const staleStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const staleStatusText = `${staleStatus.stdout}\n${staleStatus.stderr}`;
    assert(staleStatus.status === 0, 'status with stale intake exits zero', staleStatusText);
    const staleStatusOutput = JSON.parse(staleStatus.stdout);
    assert(staleStatusOutput.status === 'stale', 'status with stale intake reports stale', staleStatusText);
    assert(
      staleStatusOutput.checks.some((item) => item.code === 'STALE_INTAKE'),
      'status with stale intake names STALE_INTAKE',
      staleStatusText,
    );

    const reIntake = runCli(['workspace', 'intake', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const reIntakeText = `${reIntake.stdout}\n${reIntake.stderr}`;
    assert(reIntake.status === 0, 're-intake exits zero', reIntakeText);
    const reIntakeOutput = JSON.parse(reIntake.stdout);
    assertSessionOutput(reIntakeOutput, 're-intake output');
    const updatedRepoIntake = readJson(reIntakeOutput.repoIntakePath);
    assert(
      updatedRepoIntake.repos[0].head === newTargetHead,
      're-intake records new target HEAD',
      JSON.stringify(updatedRepoIntake, null, 2),
    );

    const missingSetupPacket = runCli(['workspace', 'packet', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingSetupPacketText = `${missingSetupPacket.stdout}\n${missingSetupPacket.stderr}`;
    assert(missingSetupPacket.status !== 0, 'packet without setup exits nonzero', missingSetupPacketText);
    assert(
      missingSetupPacketText.includes('missing-session-setup'),
      'packet without setup names missing-session-setup',
      missingSetupPacketText,
    );
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet without setup does not write partial packet',
      missingSetupPacketText,
    );

    const missingSetupRefPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'docs/workspace/missing-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/v4-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/v4-backlog.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const missingSetupRefText = `${missingSetupRefPacket.stdout}\n${missingSetupRefPacket.stderr}`;
    assert(missingSetupRefPacket.status !== 0, 'packet rejects missing local setup ref', missingSetupRefText);
    assert(missingSetupRefText.includes('SETUP_REF_MISSING'), 'missing setup ref names SETUP_REF_MISSING', missingSetupRefText);
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with missing setup ref does not write partial packet',
      missingSetupRefText,
    );

    const packet = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'docs/workspace/v4-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/v4-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/v4-backlog.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const packetText = `${packet.stdout}\n${packet.stderr}`;
    assert(packet.status === 0, 'packet with fresh intake exits zero', packetText);
    const packetOutput = JSON.parse(packet.stdout);
    assertSessionOutput(packetOutput, 'packet output');
    assert(fs.existsSync(packetOutput.packetPath), 'packet writes bmad-work-packet.json', packetText);
    assert(fs.existsSync(packetOutput.renderedPromptPath), 'packet writes rendered-prompt.md', packetText);
    assert(fs.existsSync(packetOutput.capabilityContractPath), 'packet writes capabilities.json', packetText);

    const sessionPacket = readJson(packetOutput.packetPath);
    assert(sessionPacket.kind === 'bmad-work-packet', 'packet records V4 kind', JSON.stringify(sessionPacket, null, 2));
    assert(sessionPacket.packetVersion === 4, 'packet records packetVersion 4', JSON.stringify(sessionPacket, null, 2));
    assert(sessionPacket.sessionId === launchOutput.sessionId, 'packet records sessionId', JSON.stringify(sessionPacket, null, 2));
    assertSessionOutput(sessionPacket, 'BMAD Work Packet');
    assert(sessionPacket.goal === 'Fix target repo bug.', 'packet records goal from goal file', JSON.stringify(sessionPacket, null, 2));
    assert(
      sessionPacket.sessionSetup.zoomOut.ref === 'docs/workspace/v4-zoom-out.md',
      'packet records zoom-out setup ref',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.sessionSetup.zoomOut.sha256 === sha256File(path.join(baseRepo.path, 'docs', 'workspace', 'v4-zoom-out.md')),
      'packet records zoom-out setup checksum',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.repoIntakeRefs.includes('intake/repo-intake.json'),
      'packet references repo intake',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.constraints.includes('Do not mutate Workspace Base'),
      'packet records base isolation constraint',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(sessionPacket.grants.includes('grants.json'), 'packet references grants', JSON.stringify(sessionPacket, null, 2));
    assert(sessionPacket.acceptanceCriteria.length > 0, 'packet includes acceptance criteria', JSON.stringify(sessionPacket, null, 2));
    assert(
      sessionPacket.capabilityContractRef === 'capabilities.json',
      'packet references Capability Contract',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.renderedPromptRef === 'packets/rendered-prompt.md',
      'packet references rendered prompt',
      JSON.stringify(sessionPacket, null, 2),
    );

    const renderedPrompt = fs.readFileSync(packetOutput.renderedPromptPath, 'utf8');
    assert(renderedPrompt.includes('Source of truth: `packets/bmad-work-packet.json`'), 'rendered prompt names packet source');
    assert(renderedPrompt.includes('Fix target repo bug.'), 'rendered prompt includes packet goal');
    assert(renderedPrompt.includes('Do not mutate Workspace Base'), 'rendered prompt includes packet constraints');

    fs.appendFileSync(path.join(baseRepo.path, 'docs', 'workspace', 'v4-zoom-out.md'), 'Checksum drift.\n');
    const checksumStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const checksumStatusText = `${checksumStatus.stdout}\n${checksumStatus.stderr}`;
    assert(checksumStatus.status === 0, 'status with checksum drift exits zero', checksumStatusText);
    const checksumStatusOutput = JSON.parse(checksumStatus.stdout);
    assert(checksumStatusOutput.status === 'stale', 'status with checksum drift reports stale', checksumStatusText);
    assert(
      checksumStatusOutput.checks.some((item) => item.code === 'SETUP_REF_CHECKSUM_MISMATCH'),
      'status names setup checksum mismatch',
      checksumStatusText,
    );
    fs.writeFileSync(path.join(baseRepo.path, 'docs', 'workspace', 'v4-zoom-out.md'), 'Zoom out map.\n');

    const skippedPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'docs/workspace/v4-zoom-out.md',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--tdd-plan-ref',
        'docs/workspace/v4-backlog.md#tdd-order',
        '--skip-setup',
        'grillDecisions=Already decided by V4 party mode.',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const skippedPacketText = `${skippedPacket.stdout}\n${skippedPacket.stderr}`;
    assert(skippedPacket.status === 0, 'packet accepts explicit setup skip', skippedPacketText);
    const skippedPacketOutput = JSON.parse(skippedPacket.stdout);
    const skippedSessionPacket = readJson(skippedPacketOutput.packetPath);
    assert(
      skippedSessionPacket.sessionSetup.grillDecisions.status === 'skipped',
      'packet records skipped setup status',
      JSON.stringify(skippedSessionPacket, null, 2),
    );

    const externalPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--zoom-out-ref',
        'external:zoom-out-thread-note',
        '--ubiquitous-language-ref',
        'UBIQUITOUS_LANGUAGE.md',
        '--grill-decisions-ref',
        'docs/workspace/v4-grill-decisions.md',
        '--tdd-plan-ref',
        'docs/workspace/v4-backlog.md#tdd-order',
      ],
      {
        cwd: baseRepo.path,
        env: { NO_PROXY: '*', HTTPS_PROXY: 'http://127.0.0.1:1', HTTP_PROXY: 'http://127.0.0.1:1' },
      },
    );
    const externalPacketText = `${externalPacket.stdout}\n${externalPacket.stderr}`;
    assert(externalPacket.status === 0, 'packet accepts external setup ref without network', externalPacketText);
    const externalPacketOutput = JSON.parse(externalPacket.stdout);
    const externalSessionPacket = readJson(externalPacketOutput.packetPath);
    assert(
      externalSessionPacket.sessionSetup.zoomOut.verification === 'external-unverified',
      'external setup ref records unverified provenance',
      JSON.stringify(externalSessionPacket, null, 2),
    );
    const externalStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
      env: { NO_PROXY: '*', HTTPS_PROXY: 'http://127.0.0.1:1', HTTP_PROXY: 'http://127.0.0.1:1' },
    });
    const externalStatusText = `${externalStatus.stdout}\n${externalStatus.stderr}`;
    assert(externalStatus.status === 0, 'status accepts external setup ref without network', externalStatusText);
    const externalStatusOutput = JSON.parse(externalStatus.stdout);
    assert(
      externalStatusOutput.checks.some((item) => item.code === 'SETUP_REF_EXTERNAL_UNVERIFIED' && item.severity === 'warning'),
      'status reports external setup warning',
      externalStatusText,
    );

    const invalidSkipPacket = runCli(
      ['workspace', 'packet', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--skip-setup', 'badStep=nope'],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidSkipPacketText = `${invalidSkipPacket.stdout}\n${invalidSkipPacket.stderr}`;
    assert(invalidSkipPacket.status !== 0, 'packet rejects invalid setup skip step', invalidSkipPacketText);
    assert(invalidSkipPacketText.includes('invalid-session-setup-skip'), 'invalid setup skip names stable error', invalidSkipPacketText);

    section('Workspace Review');

    const cleanReview = runCli(['workspace', 'review', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const cleanReviewText = `${cleanReview.stdout}\n${cleanReview.stderr}`;
    assert(cleanReview.status === 0, 'clean review exits zero', cleanReviewText);
    const cleanReviewOutput = JSON.parse(cleanReview.stdout);
    assertSessionOutput(cleanReviewOutput, 'clean review output');
    assert(fs.existsSync(cleanReviewOutput.summaryPath), 'clean review writes summary.json', cleanReviewText);
    const cleanSummary = readJson(cleanReviewOutput.summaryPath);
    assert(cleanSummary.clean === true, 'clean review reports clean worktree', JSON.stringify(cleanSummary, null, 2));
    assert(cleanSummary.repos[0].patchPath === null, 'clean review has no patch path', JSON.stringify(cleanSummary, null, 2));

    const reviewedStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const reviewedStatusText = `${reviewedStatus.stdout}\n${reviewedStatus.stderr}`;
    assert(reviewedStatus.status === 0, 'status after review exits zero', reviewedStatusText);
    const reviewedStatusOutput = JSON.parse(reviewedStatus.stdout);
    assert(reviewedStatusOutput.review.state === 'present', 'status after review reports review present', reviewedStatusText);
    assert(reviewedStatusOutput.status === 'ready', 'status after review reports ready', reviewedStatusText);

    const reviewRepoPack = readJson(launchOutput.repoPackPath);
    const worktreeReadme = path.join(reviewRepoPack.repos[0].worktreePath, 'README.md');
    fs.appendFileSync(worktreeReadme, 'Worktree review change.\n');

    const changedReview = runCli(['workspace', 'review', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const changedReviewText = `${changedReview.stdout}\n${changedReview.stderr}`;
    assert(changedReview.status === 0, 'changed review exits zero', changedReviewText);
    const changedReviewOutput = JSON.parse(changedReview.stdout);
    assertSessionOutput(changedReviewOutput, 'changed review output');
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
    const cleanDestroySession = JSON.parse(cleanDestroyLaunch.stdout);
    assertSessionOutput(cleanDestroySession, 'destroy fixture launch output');
    const destroy = runCli(['workspace', 'destroy', cleanDestroySession.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const destroyText = `${destroy.stdout}\n${destroy.stderr}`;
    assert(destroy.status === 0, 'destroy exits zero', destroyText);
    const destroyOutput = JSON.parse(destroy.stdout);
    assertSessionOutput(destroyOutput, 'destroy output');
    assert(destroyOutput.removed === true, 'destroy reports removal', destroyText);
    assert(!fs.existsSync(cleanDestroySession.sessionRoot), 'destroy removes session root', destroyText);
    assert(git(['rev-parse', 'HEAD'], targetRepo.path) === newTargetHead, 'destroy preserves source repo HEAD');

    const keepReviewDestroy = runCli(['workspace', 'destroy', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--keep-review'], {
      cwd: baseRepo.path,
    });
    const keepReviewDestroyText = `${keepReviewDestroy.stdout}\n${keepReviewDestroy.stderr}`;
    assert(keepReviewDestroy.status === 0, 'destroy --keep-review exits zero', keepReviewDestroyText);
    const keepReviewOutput = JSON.parse(keepReviewDestroy.stdout);
    assertSessionOutput(keepReviewOutput, 'destroy --keep-review output');
    assert(!fs.existsSync(launchOutput.sessionRoot), 'destroy --keep-review removes session root', keepReviewDestroyText);
    assert(fs.existsSync(keepReviewOutput.retainedReviewPath), 'destroy --keep-review retains review artifacts', keepReviewDestroyText);
    assert(
      fs.existsSync(path.join(keepReviewOutput.retainedReviewPath, 'repo-1', 'diff.patch')),
      'destroy --keep-review retains per-repo patch',
      keepReviewDestroyText,
    );
  } catch (error) {
    assert(false, 'workspace command emits parseable session JSON', error.message);
  } finally {
    removeSessionWorktrees(launchOutput);
    removeSessionWorktrees(multiRepoOutput);
    removeSessionWorktrees(baseImprovementOutput);
    removeSessionWorktrees(sessionLaunchOutput);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(`\n${colors.cyan}Results: ${passed} passed, ${failed} failed${colors.reset}`);
  if (failed > 0) {
    process.exit(1);
  }
}

function removeSessionWorktrees(sessionOutput) {
  if (!sessionOutput?.repoPackPath || !fs.existsSync(sessionOutput.repoPackPath)) {
    return;
  }

  const repoPack = readJson(sessionOutput.repoPackPath);
  for (const repo of repoPack.repos || []) {
    if (fs.existsSync(repo.worktreePath)) {
      git(['worktree', 'remove', '--force', repo.worktreePath], repo.sourcePath);
    }
  }
}

runTests();
