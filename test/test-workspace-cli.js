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

function copyTree(sourceRoot, destinationRoot) {
  fs.mkdirSync(destinationRoot, { recursive: true });
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const destinationPath = path.join(destinationRoot, entry.name);
    if (entry.isDirectory()) {
      copyTree(sourcePath, destinationPath);
      continue;
    }
    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function rewriteArchiveChecksums(archiveRoot) {
  const manifestPath = path.join(archiveRoot, 'manifest.json');
  const manifest = readJson(manifestPath);
  for (const file of manifest.files) {
    const filePath = path.join(archiveRoot, file.path);
    file.sha256 = sha256File(filePath);
    file.bytes = fs.statSync(filePath).size;
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(archiveRoot, 'checksums.sha256'), renderArchiveChecksums(manifest.files));
}

function renderArchiveChecksums(files) {
  return `${files.map((file) => `${file.sha256}  ${file.path}`).join('\n')}\n`;
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
  assert(output.includes('--workflow <skill[:action]>'), 'workspace help lists --workflow', output);
  assert(!output.includes('workspace run'), 'workspace help omits workspace run', output);
  for (const option of ['--zoom-out-ref', '--ubiquitous-language-ref', '--grill-decisions-ref', '--tdd-plan-ref', '--skip-setup']) {
    assert(output.includes(option), `workspace help lists ${option}`, output);
  }
  assert(output.includes('--output <path>'), 'workspace help lists --output', output);
  assert(output.includes('--input <path>'), 'workspace help lists --input', output);
  assert(output.includes('--result-id <id>'), 'workspace help lists --result-id', output);
  for (const subcommand of [
    'launch',
    'intake',
    'packet',
    'list',
    'status',
    'handoff',
    'result',
    'archive',
    'verify-archive',
    'review',
    'destroy',
    'authorize',
  ]) {
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

    section('Workspace List');

    const emptyRuntimeRoot = path.join(tempRoot, 'empty-runtime');
    const emptyList = runCli(['workspace', 'list', '--runtime-root', emptyRuntimeRoot], {
      cwd: baseRepo.path,
    });
    const emptyListText = `${emptyList.stdout}\n${emptyList.stderr}`;
    assert(emptyList.status === 0, 'list empty runtime exits zero', emptyListText);
    assert(emptyList.stderr === '', 'list empty runtime has no stderr noise', emptyListText);
    const emptyListOutput = JSON.parse(emptyList.stdout);
    assert(emptyListOutput.schemaVersion === 1, 'list output records schemaVersion 1', emptyListText);
    assert(
      Array.isArray(emptyListOutput.sessions) && emptyListOutput.sessions.length === 0,
      'list empty runtime has no sessions',
      emptyListText,
    );

    section('Workspace Archive Verification Failures');

    const missingArchive = runCli(['workspace', 'verify-archive', path.join(tempRoot, 'missing-archive')], {
      cwd: baseRepo.path,
    });
    const missingArchiveText = `${missingArchive.stdout}\n${missingArchive.stderr}`;
    assert(missingArchive.status !== 0, 'verify-archive missing dir exits nonzero', missingArchiveText);
    assert(missingArchiveText.includes('ARCHIVE_NOT_FOUND'), 'verify-archive missing dir names ARCHIVE_NOT_FOUND', missingArchiveText);

    const malformedArchiveRoot = path.join(tempRoot, 'malformed-archive');
    fs.mkdirSync(malformedArchiveRoot, { recursive: true });
    const malformedArchive = runCli(['workspace', 'verify-archive', malformedArchiveRoot], {
      cwd: baseRepo.path,
    });
    const malformedArchiveText = `${malformedArchive.stdout}\n${malformedArchive.stderr}`;
    assert(malformedArchive.status !== 0, 'verify-archive without manifest exits nonzero', malformedArchiveText);
    assert(
      malformedArchiveText.includes('ARCHIVE_MANIFEST_MISSING'),
      'verify-archive missing manifest names ARCHIVE_MANIFEST_MISSING',
      malformedArchiveText,
    );

    fs.writeFileSync(path.join(malformedArchiveRoot, 'manifest.json'), '{not-json\n');
    const invalidManifest = runCli(['workspace', 'verify-archive', malformedArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidManifestText = `${invalidManifest.stdout}\n${invalidManifest.stderr}`;
    assert(invalidManifest.status !== 0, 'verify-archive invalid manifest exits nonzero', invalidManifestText);
    assert(
      invalidManifestText.includes('ARCHIVE_MANIFEST_INVALID'),
      'verify-archive invalid manifest names ARCHIVE_MANIFEST_INVALID',
      invalidManifestText,
    );

    section('Workspace Archive Missing Session');

    const missingSessionArchiveRoot = path.join(tempRoot, 'missing-session-archive');
    const missingSessionArchive = runCli(
      ['workspace', 'archive', 'missing-session', '--runtime-root', runtimeRoot, '--output', missingSessionArchiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const missingSessionArchiveText = `${missingSessionArchive.stdout}\n${missingSessionArchive.stderr}`;
    assert(missingSessionArchive.status !== 0, 'archive missing session exits nonzero', missingSessionArchiveText);
    assert(
      missingSessionArchiveText.includes('SESSION_NOT_FOUND'),
      'archive missing session names SESSION_NOT_FOUND',
      missingSessionArchiveText,
    );
    assert(!fs.existsSync(missingSessionArchiveRoot), 'archive missing session writes no output dir', missingSessionArchiveText);

    const brokenSessionRoot = path.join(runtimeRoot, 'sessions', 'broken-session');
    fs.mkdirSync(brokenSessionRoot, { recursive: true });
    const symlinkSessionRoot = path.join(runtimeRoot, 'sessions', 'session-symlink');
    fs.symlinkSync(launchOutput.sessionRoot, symlinkSessionRoot);

    const beforeList = fingerprintTree(runtimeRoot);
    const sessionList = runCli(['workspace', 'list', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const sessionListText = `${sessionList.stdout}\n${sessionList.stderr}`;
    const afterList = fingerprintTree(runtimeRoot);
    assert(sessionList.status === 0, 'list runtime exits zero', sessionListText);
    assert(beforeList === afterList, 'list is read-only', sessionListText);
    const sessionListOutput = JSON.parse(sessionList.stdout);
    assert(sessionListOutput.runtimeRoot === runtimeRoot, 'list records runtime root', sessionListText);
    const listedIds = sessionListOutput.sessions.map((session) => session.sessionId);
    assert(JSON.stringify(listedIds) === JSON.stringify([...listedIds].sort()), 'list sorts sessions by sessionId', sessionListText);
    const listedLaunch = sessionListOutput.sessions.find((session) => session.sessionId === launchOutput.sessionId);
    assert(listedLaunch?.valid === true, 'list reports launched session valid', sessionListText);
    assert(listedLaunch?.sessionType === 'normal', 'list reports launched session type', sessionListText);
    assert(listedLaunch?.artifacts.instance.present === true, 'list reports instance artifact present', sessionListText);
    assert(listedLaunch?.artifacts.packet.present === false, 'list reports missing packet artifact', sessionListText);
    const listedBroken = sessionListOutput.sessions.find((session) => session.sessionId === 'broken-session');
    assert(listedBroken?.valid === false, 'list reports broken session invalid', sessionListText);
    assert(
      listedBroken?.checks.some((item) => item.code === 'SESSION_INVALID'),
      'broken session list row names SESSION_INVALID',
      sessionListText,
    );
    const listedSymlink = sessionListOutput.sessions.find((session) => session.sessionId === 'session-symlink');
    assert(listedSymlink?.valid === false, 'list does not follow symlink session', sessionListText);
    assert(
      listedSymlink?.checks.some((item) => item.code === 'SESSION_INVALID'),
      'symlink session list row names SESSION_INVALID',
      sessionListText,
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

    const invalidHandoff = runCli(['workspace', 'handoff', sessionLaunchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const invalidHandoffText = `${invalidHandoff.stdout}\n${invalidHandoff.stderr}`;
    assert(invalidHandoff.status !== 0, 'handoff for invalid session exits nonzero', invalidHandoffText);
    assert(invalidHandoff.stdout === '', 'invalid handoff emits no partial Markdown', invalidHandoffText);
    assert(invalidHandoffText.includes('SESSION_INVALID'), 'invalid handoff names SESSION_INVALID', invalidHandoffText);

    const invalidArchiveRoot = path.join(tempRoot, 'invalid-session-archive');
    const invalidArchive = runCli(
      ['workspace', 'archive', sessionLaunchOutput.sessionId, '--runtime-root', runtimeRoot, '--output', invalidArchiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidArchiveText = `${invalidArchive.stdout}\n${invalidArchive.stderr}`;
    assert(invalidArchive.status !== 0, 'archive invalid session exits nonzero', invalidArchiveText);
    assert(invalidArchiveText.includes('SESSION_INVALID'), 'archive invalid session names SESSION_INVALID', invalidArchiveText);
    assert(!fs.existsSync(invalidArchiveRoot), 'archive invalid session writes no output dir', invalidArchiveText);

    const missingHandoff = runCli(['workspace', 'handoff', 'missing-session', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const missingHandoffText = `${missingHandoff.stdout}\n${missingHandoff.stderr}`;
    assert(missingHandoff.status !== 0, 'handoff for missing session exits nonzero', missingHandoffText);
    assert(missingHandoff.stdout === '', 'missing handoff emits no partial Markdown', missingHandoffText);
    assert(missingHandoffText.includes('SESSION_NOT_FOUND'), 'missing handoff names SESSION_NOT_FOUND', missingHandoffText);

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

    const readyBaseHandoff = runCli(['workspace', 'handoff', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const readyBaseHandoffText = `${readyBaseHandoff.stdout}\n${readyBaseHandoff.stderr}`;
    assert(readyBaseHandoff.status === 0, 'Base Improvement handoff exits zero', readyBaseHandoffText);
    assert(readyBaseHandoff.stdout.includes('ready-for-human-review'), 'Base Improvement handoff reports readiness', readyBaseHandoffText);
    assert(readyBaseHandoff.stdout.includes('Base Improvement'), 'Base Improvement handoff names session type', readyBaseHandoffText);
    assert(!readyBaseHandoff.stdout.includes('promote'), 'Base Improvement handoff avoids promotion wording', readyBaseHandoffText);

    const baseArchiveRoot = path.join(tempRoot, 'base-improvement-archive');
    const baseArchive = runCli(
      ['workspace', 'archive', baseImprovementOutput.sessionId, '--runtime-root', runtimeRoot, '--output', baseArchiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const baseArchiveText = `${baseArchive.stdout}\n${baseArchive.stderr}`;
    assert(baseArchive.status === 0, 'Base Improvement archive exits zero', baseArchiveText);
    const baseCloseout = fs.readFileSync(path.join(baseArchiveRoot, 'closeout.md'), 'utf8');
    assert(baseCloseout.includes('ready-for-human-review'), 'Base Improvement archive closeout records readiness', baseCloseout);
    assert(!baseCloseout.includes('promote'), 'Base Improvement archive closeout avoids promotion wording', baseCloseout);

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

    const invalidWorkflowPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--workflow',
        'bmad-agent-dev',
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
    const invalidWorkflowPacketText = `${invalidWorkflowPacket.stdout}\n${invalidWorkflowPacket.stderr}`;
    assert(invalidWorkflowPacket.status !== 0, 'packet rejects non-routeable workflow override', invalidWorkflowPacketText);
    assert(
      invalidWorkflowPacketText.includes('ROUTE_WORKFLOW_UNKNOWN'),
      'invalid workflow override names ROUTE_WORKFLOW_UNKNOWN',
      invalidWorkflowPacketText,
    );
    assert(
      !fs.existsSync(path.join(launchOutput.sessionRoot, 'packets', 'bmad-work-packet.json')),
      'packet with invalid workflow override does not write partial packet',
      invalidWorkflowPacketText,
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
    assert(sessionPacket.routing.routingSchemaVersion === 1, 'packet records V8 routing schema', JSON.stringify(sessionPacket, null, 2));
    assert(
      sessionPacket.routing.selectedWorkflow === 'bmad-quick-dev',
      'packet routes quick dev deterministically',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.routing.source === 'deterministic',
      'packet records deterministic route source',
      JSON.stringify(sessionPacket, null, 2),
    );
    assert(
      sessionPacket.bmadWorkflow === sessionPacket.routing.selectedWorkflow,
      'packet workflow alias matches routing selected workflow',
      JSON.stringify(sessionPacket, null, 2),
    );
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
    assert(renderedPrompt.includes('GOAL_QUICK_DEV'), 'rendered prompt includes routing reason code');

    const originalPacketContent = fs.readFileSync(packetOutput.packetPath, 'utf8');
    const legacyPacket = JSON.parse(originalPacketContent);
    delete legacyPacket.routing;
    fs.writeFileSync(packetOutput.packetPath, `${JSON.stringify(legacyPacket, null, 2)}\n`);
    const legacyStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const legacyStatusText = `${legacyStatus.stdout}\n${legacyStatus.stderr}`;
    assert(legacyStatus.status === 0, 'status accepts legacy packet without routing', legacyStatusText);
    const legacyStatusOutput = JSON.parse(legacyStatus.stdout);
    assert(legacyStatusOutput.routing.source === 'legacy-missing', 'status marks legacy missing routing', legacyStatusText);
    const legacyHandoff = runCli(['workspace', 'handoff', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const legacyHandoffText = `${legacyHandoff.stdout}\n${legacyHandoff.stderr}`;
    assert(legacyHandoff.status === 0, 'handoff accepts legacy packet without routing', legacyHandoffText);
    assert(legacyHandoff.stdout.includes('routeSource: `legacy-missing`'), 'handoff marks legacy missing routing', legacyHandoffText);
    fs.writeFileSync(packetOutput.packetPath, originalPacketContent);

    const packetFingerprint = fingerprintTree(path.join(launchOutput.sessionRoot, 'packets'));
    const unknownWorkflowAfterPacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--workflow',
        'bmad-missing-workflow',
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
    const unknownWorkflowAfterPacketText = `${unknownWorkflowAfterPacket.stdout}\n${unknownWorkflowAfterPacket.stderr}`;
    assert(unknownWorkflowAfterPacket.status !== 0, 'packet rejects unknown workflow override', unknownWorkflowAfterPacketText);
    assert(
      unknownWorkflowAfterPacketText.includes('ROUTE_WORKFLOW_UNKNOWN'),
      'unknown workflow override names ROUTE_WORKFLOW_UNKNOWN',
      unknownWorkflowAfterPacketText,
    );
    assert(
      packetFingerprint === fingerprintTree(path.join(launchOutput.sessionRoot, 'packets')),
      'packet route failure preserves existing packet artifacts',
      unknownWorkflowAfterPacketText,
    );

    const overridePacket = runCli(
      [
        'workspace',
        'packet',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--workflow',
        'bmad-create-prd',
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
    const overridePacketText = `${overridePacket.stdout}\n${overridePacket.stderr}`;
    assert(overridePacket.status === 0, 'packet accepts explicit workflow override', overridePacketText);
    const overrideSessionPacket = readJson(JSON.parse(overridePacket.stdout).packetPath);
    assert(
      overrideSessionPacket.routing.selectedWorkflow === 'bmad-create-prd',
      'explicit workflow override records selected workflow',
      JSON.stringify(overrideSessionPacket, null, 2),
    );
    assert(
      overrideSessionPacket.routing.source === 'override',
      'explicit workflow override records source',
      JSON.stringify(overrideSessionPacket, null, 2),
    );

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
    assert(
      externalSessionPacket.routing.selectedWorkflow === 'bmad-quick-dev',
      'external setup packet keeps deterministic route',
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

    section('Workspace Result Ledger');

    const resultInputPath = path.join(tempRoot, 'result-input.json');
    const resultSideEffectPath = path.join(tempRoot, 'result-command-was-run');
    const resultInput = {
      outcome: 'succeeded',
      summary: 'Manual execution completed with focused checks.',
      commands: [
        {
          command: `${process.execPath} -e "require('fs').writeFileSync('${resultSideEffectPath}', 'bad')"`,
          exitCode: 0,
          summary: 'Command text recorded only; Workspace did not execute it.',
        },
      ],
      evidenceRefs: ['review/summary.json'],
    };
    fs.writeFileSync(resultInputPath, `${JSON.stringify(resultInput, null, 2)}\n`);

    const missingSessionResult = runCli(
      [
        'workspace',
        'result',
        'missing-session',
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        'missing-result',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const missingSessionResultText = `${missingSessionResult.stdout}\n${missingSessionResult.stderr}`;
    assert(missingSessionResult.status !== 0, 'result missing session exits nonzero', missingSessionResultText);
    assert(
      missingSessionResultText.includes('SESSION_NOT_FOUND'),
      'result missing session names SESSION_NOT_FOUND',
      missingSessionResultText,
    );

    const missingPacketResult = runCli(
      [
        'workspace',
        'result',
        multiRepoOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        'no-packet',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const missingPacketResultText = `${missingPacketResult.stdout}\n${missingPacketResult.stderr}`;
    assert(missingPacketResult.status !== 0, 'result without packet exits nonzero', missingPacketResultText);
    assert(
      missingPacketResultText.includes('RESULT_PACKET_MISSING'),
      'result without packet names RESULT_PACKET_MISSING',
      missingPacketResultText,
    );

    const invalidJsonInputPath = path.join(tempRoot, 'result-invalid-json.json');
    fs.writeFileSync(invalidJsonInputPath, '{nope\n');
    const invalidJsonResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        invalidJsonInputPath,
        '--result-id',
        'bad-json',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidJsonResultText = `${invalidJsonResult.stdout}\n${invalidJsonResult.stderr}`;
    assert(invalidJsonResult.status !== 0, 'result invalid JSON exits nonzero', invalidJsonResultText);
    assert(invalidJsonResultText.includes('RESULT_INPUT_INVALID_JSON'), 'result invalid JSON names stable error', invalidJsonResultText);

    const invalidOutcomeInputPath = path.join(tempRoot, 'result-invalid-outcome.json');
    fs.writeFileSync(invalidOutcomeInputPath, `${JSON.stringify({ outcome: 'unknown', summary: 'Bad outcome.' }, null, 2)}\n`);
    const invalidOutcomeResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        invalidOutcomeInputPath,
        '--result-id',
        'bad-outcome',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const invalidOutcomeResultText = `${invalidOutcomeResult.stdout}\n${invalidOutcomeResult.stderr}`;
    assert(invalidOutcomeResult.status !== 0, 'result invalid outcome exits nonzero', invalidOutcomeResultText);
    assert(invalidOutcomeResultText.includes('RESULT_INVALID'), 'result invalid outcome names RESULT_INVALID', invalidOutcomeResultText);

    const unsafeResultId = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        '../escape',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const unsafeResultIdText = `${unsafeResultId.stdout}\n${unsafeResultId.stderr}`;
    assert(unsafeResultId.status !== 0, 'result unsafe id exits nonzero', unsafeResultIdText);
    assert(unsafeResultIdText.includes('RESULT_ID_UNSAFE'), 'result unsafe id names RESULT_ID_UNSAFE', unsafeResultIdText);

    const secretToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyzABCDE';
    const secretInputPath = path.join(tempRoot, 'result-secret.json');
    fs.writeFileSync(secretInputPath, `${JSON.stringify({ outcome: 'failed', summary: secretToken }, null, 2)}\n`);
    const secretResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        secretInputPath,
        '--result-id',
        'secret-result',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const secretResultText = `${secretResult.stdout}\n${secretResult.stderr}`;
    assert(secretResult.status !== 0, 'result secret-positive input exits nonzero', secretResultText);
    assert(
      secretResultText.includes('RESULT_SECRET_DETECTED'),
      'result secret-positive input names RESULT_SECRET_DETECTED',
      secretResultText,
    );
    assert(!secretResultText.includes(secretToken), 'result secret-positive stderr is redacted', secretResultText);
    assert(!fs.existsSync(path.join(launchOutput.sessionRoot, 'results')), 'result failures write no partial artifacts');

    const recordResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        'result-001',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const recordResultText = `${recordResult.stdout}\n${recordResult.stderr}`;
    assert(recordResult.status === 0, 'valid result exits zero', recordResultText);
    const recordResultOutput = JSON.parse(recordResult.stdout);
    assertSessionOutput(recordResultOutput, 'result output');
    assert(recordResultOutput.resultId === 'result-001', 'result output records result id', recordResultText);
    assert(fs.existsSync(recordResultOutput.resultPath), 'result writes artifact', recordResultText);
    assert(!fs.existsSync(resultSideEffectPath), 'result command text is not executed', recordResultText);
    const resultArtifact = readJson(recordResultOutput.resultPath);
    assert(resultArtifact.kind === 'bmad-workspace-result', 'result records kind', JSON.stringify(resultArtifact, null, 2));
    assert(resultArtifact.schemaVersion === 1, 'result records schemaVersion 1', JSON.stringify(resultArtifact, null, 2));
    assert(resultArtifact.sessionId === launchOutput.sessionId, 'result records sessionId', JSON.stringify(resultArtifact, null, 2));
    assert(resultArtifact.resultId === 'result-001', 'result records resultId', JSON.stringify(resultArtifact, null, 2));
    assert(resultArtifact.outcome === 'succeeded', 'result records outcome', JSON.stringify(resultArtifact, null, 2));
    assert(
      resultArtifact.packetRef === 'packets/bmad-work-packet.json',
      'result records packet ref',
      JSON.stringify(resultArtifact, null, 2),
    );
    assert(
      resultArtifact.routing.selectedWorkflow === 'bmad-quick-dev',
      'result records packet route',
      JSON.stringify(resultArtifact, null, 2),
    );

    const duplicateResult = runCli(
      [
        'workspace',
        'result',
        launchOutput.sessionId,
        '--runtime-root',
        runtimeRoot,
        '--input',
        resultInputPath,
        '--result-id',
        'result-001',
      ],
      {
        cwd: baseRepo.path,
      },
    );
    const duplicateResultText = `${duplicateResult.stdout}\n${duplicateResult.stderr}`;
    assert(duplicateResult.status !== 0, 'duplicate result exits nonzero', duplicateResultText);
    assert(duplicateResultText.includes('RESULT_EXISTS'), 'duplicate result names RESULT_EXISTS', duplicateResultText);

    const invalidStoredResultPath = path.join(launchOutput.sessionRoot, 'results', 'invalid-result.json');
    fs.writeFileSync(invalidStoredResultPath, `${JSON.stringify({ kind: 'not-a-result' }, null, 2)}\n`);
    const invalidResultStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const invalidResultStatusText = `${invalidResultStatus.stdout}\n${invalidResultStatus.stderr}`;
    assert(invalidResultStatus.status === 0, 'status with invalid result exits zero', invalidResultStatusText);
    const invalidResultStatusOutput = JSON.parse(invalidResultStatus.stdout);
    assert(
      invalidResultStatusOutput.checks.some((item) => item.code === 'RESULT_INVALID'),
      'status with invalid result names RESULT_INVALID',
      invalidResultStatusText,
    );
    fs.rmSync(invalidStoredResultPath);

    const secretStoredResultPath = path.join(launchOutput.sessionRoot, 'results', 'secret-result.json');
    fs.writeFileSync(
      secretStoredResultPath,
      `${JSON.stringify({ ...resultArtifact, resultId: 'secret-result', summary: secretToken }, null, 2)}\n`,
    );
    const secretResultStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const secretResultStatusText = `${secretResultStatus.stdout}\n${secretResultStatus.stderr}`;
    assert(secretResultStatus.status === 0, 'status with secret-positive result exits zero', secretResultStatusText);
    assert(
      JSON.parse(secretResultStatus.stdout).checks.some((item) => item.code === 'RESULT_SECRET_DETECTED'),
      'status with secret-positive result names RESULT_SECRET_DETECTED',
      secretResultStatusText,
    );
    assert(!secretResultStatusText.includes(secretToken), 'status with secret-positive result is redacted', secretResultStatusText);
    fs.rmSync(secretStoredResultPath);

    const resultStatusBefore = fingerprintTree(runtimeRoot);
    const resultStatus = runCli(['workspace', 'status', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const resultStatusAfter = fingerprintTree(runtimeRoot);
    const resultStatusText = `${resultStatus.stdout}\n${resultStatus.stderr}`;
    assert(resultStatus.status === 0, 'status after result exits zero', resultStatusText);
    assert(resultStatusBefore === resultStatusAfter, 'status after result is read-only', resultStatusText);
    const resultStatusOutput = JSON.parse(resultStatus.stdout);
    assert(resultStatusOutput.results.count === 1, 'status reports result count', resultStatusText);
    assert(resultStatusOutput.results.latest.resultId === 'result-001', 'status reports latest result', resultStatusText);
    assert(resultStatusOutput.results.latest.outcome === 'succeeded', 'status reports latest result outcome', resultStatusText);

    const resultListBefore = fingerprintTree(runtimeRoot);
    const resultList = runCli(['workspace', 'list', '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const resultListAfter = fingerprintTree(runtimeRoot);
    const resultListText = `${resultList.stdout}\n${resultList.stderr}`;
    assert(resultList.status === 0, 'list after result exits zero', resultListText);
    assert(resultListBefore === resultListAfter, 'list after result is read-only', resultListText);
    const resultListOutput = JSON.parse(resultList.stdout);
    const listedResultSession = resultListOutput.sessions.find((session) => session.sessionId === launchOutput.sessionId);
    assert(listedResultSession?.results.count === 1, 'list reports result count', resultListText);
    assert(listedResultSession?.results.latest.resultId === 'result-001', 'list reports latest result', resultListText);

    const packetHandoff = runCli(['workspace', 'handoff', launchOutput.sessionId, '--runtime-root', runtimeRoot], {
      cwd: baseRepo.path,
    });
    const packetHandoffText = `${packetHandoff.stdout}\n${packetHandoff.stderr}`;
    assert(packetHandoff.status === 0, 'handoff after packet exits zero', packetHandoffText);
    assert(packetHandoff.stdout.startsWith('# BMAD Workspace Handoff'), 'handoff emits raw Markdown heading', packetHandoffText);
    assert(!packetHandoff.stdout.trim().startsWith('{'), 'handoff is not JSON output', packetHandoffText);
    for (const heading of [
      '## Identity',
      '## Status',
      '## Blockers',
      '## BMAD Work Packet',
      '## Setup Gate',
      '## Result Ledger',
      '## Worktree Review',
      '## Base Improvement Readiness',
      '## Next BMAD Route',
      '## Read-only Boundary',
    ]) {
      assert(packetHandoff.stdout.includes(heading), `handoff includes ${heading}`, packetHandoffText);
    }
    assert(packetHandoff.stdout.includes(launchOutput.sessionId), 'handoff includes sessionId', packetHandoffText);
    assert(packetHandoff.stdout.includes('packets/bmad-work-packet.json'), 'handoff includes Work Packet ref', packetHandoffText);
    assert(packetHandoff.stdout.includes('packets/rendered-prompt.md'), 'handoff includes rendered prompt ref', packetHandoffText);
    assert(packetHandoff.stdout.includes('routeWorkflow: `bmad-quick-dev`'), 'handoff includes routed workflow', packetHandoffText);
    assert(packetHandoff.stdout.includes('routeSource: `deterministic`'), 'handoff includes route source', packetHandoffText);
    assert(packetHandoff.stdout.includes('result-001'), 'handoff includes result id', packetHandoffText);
    assert(packetHandoff.stdout.includes('outcome=succeeded'), 'handoff includes result outcome', packetHandoffText);
    assert(packetHandoff.stdout.includes('external:zoom-out-thread-note'), 'handoff includes external setup ref', packetHandoffText);
    assert(packetHandoff.stdout.includes('external-unverified'), 'handoff includes external setup warning', packetHandoffText);
    assert(packetHandoff.stdout.includes('SETUP_REF_EXTERNAL_UNVERIFIED'), 'handoff includes status checks', packetHandoffText);
    assert(
      packetHandoff.stdout.includes('Worktree Review has not been created.'),
      'handoff includes missing review blocker',
      packetHandoffText,
    );
    assert(packetHandoff.stdout.includes('`bmad workspace review'), 'handoff recommends deterministic review route', packetHandoffText);
    assert(!packetHandoff.stdout.includes('latest session'), 'handoff does not infer latest session', packetHandoffText);
    assert(!packetHandoff.stdout.includes('merge'), 'handoff avoids merge wording', packetHandoffText);

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

    section('Workspace Archive');

    const archiveRoot = path.join(tempRoot, 'session-archive');
    const beforeArchiveRuntime = fingerprintTree(runtimeRoot);
    const beforeArchiveTarget = fingerprintTree(targetRepo.path);
    const archive = runCli(['workspace', 'archive', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--output', archiveRoot], {
      cwd: baseRepo.path,
    });
    const archiveText = `${archive.stdout}\n${archive.stderr}`;
    const afterArchiveRuntime = fingerprintTree(runtimeRoot);
    const afterArchiveTarget = fingerprintTree(targetRepo.path);
    assert(archive.status === 0, 'archive reviewed session exits zero', archiveText);
    assert(beforeArchiveRuntime === afterArchiveRuntime, 'archive does not mutate runtime root', archiveText);
    assert(beforeArchiveTarget === afterArchiveTarget, 'archive does not mutate target repo', archiveText);
    const archiveOutput = JSON.parse(archive.stdout);
    assert(archiveOutput.sessionId === launchOutput.sessionId, 'archive output records sessionId', archiveText);
    assert(archiveOutput.archiveRoot === archiveRoot, 'archive output records exact output root', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'manifest.json')), 'archive writes manifest.json', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'checksums.sha256')), 'archive writes checksums.sha256', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'status.json')), 'archive writes status.json', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'handoff.md')), 'archive writes handoff.md', archiveText);
    assert(fs.existsSync(path.join(archiveRoot, 'closeout.md')), 'archive writes closeout.md', archiveText);
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'packets', 'bmad-work-packet.json')),
      'archive copies Work Packet',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'review', 'summary.json')),
      'archive copies review summary',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'review', 'repo-1', 'diff.patch')),
      'archive copies review patch',
      archiveText,
    );
    assert(
      fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'results', 'result-001.json')),
      'archive copies result artifact',
      archiveText,
    );
    assert(!fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'worktrees')), 'archive does not copy worktrees', archiveText);
    assert(
      !fs.existsSync(path.join(archiveRoot, 'session-artifacts', 'docs', 'workspace', 'v4-zoom-out.md')),
      'archive does not copy setup evidence files',
      archiveText,
    );

    const manifest = readJson(path.join(archiveRoot, 'manifest.json'));
    assert(manifest.schemaVersion === 1, 'archive manifest records schemaVersion 1', JSON.stringify(manifest, null, 2));
    assert(manifest.archiveVersion === 1, 'archive manifest records archiveVersion 1', JSON.stringify(manifest, null, 2));
    assert(manifest.sessionId === launchOutput.sessionId, 'archive manifest records sessionId', JSON.stringify(manifest, null, 2));
    assert(manifest.statusRef === 'status.json', 'archive manifest records status ref', JSON.stringify(manifest, null, 2));
    assert(manifest.handoffRef === 'handoff.md', 'archive manifest records handoff ref', JSON.stringify(manifest, null, 2));
    assert(manifest.closeoutRef === 'closeout.md', 'archive manifest records closeout ref', JSON.stringify(manifest, null, 2));
    const manifestPaths = manifest.files.map((file) => file.path);
    assert(
      JSON.stringify(manifestPaths) === JSON.stringify([...manifestPaths].sort()),
      'archive manifest file list is sorted',
      JSON.stringify(manifest, null, 2),
    );
    assert(
      manifest.files.every((file) => file.sha256?.length === 64 && Number.isInteger(file.bytes)),
      'archive manifest records sha256 and byte sizes',
      JSON.stringify(manifest, null, 2),
    );
    assert(
      manifestPaths.every((filePath) => !path.isAbsolute(filePath) && !filePath.includes('..') && !filePath.includes('\\')),
      'archive manifest uses safe POSIX relative paths',
      JSON.stringify(manifest, null, 2),
    );

    const archivedPacket = readJson(path.join(archiveRoot, 'session-artifacts', 'packets', 'bmad-work-packet.json'));
    assert(
      archivedPacket.sessionSetup.zoomOut.ref === 'external:zoom-out-thread-note',
      'archive preserves setup ref provenance',
      JSON.stringify(archivedPacket, null, 2),
    );
    assert(
      archivedPacket.sessionSetup.ubiquitousLanguage.sha256 === sha256File(path.join(baseRepo.path, 'UBIQUITOUS_LANGUAGE.md')),
      'archive preserves local setup checksum metadata',
      JSON.stringify(archivedPacket, null, 2),
    );
    const archivedStatus = readJson(path.join(archiveRoot, 'status.json'));
    assert(
      archivedStatus.routing.selectedWorkflow === 'bmad-quick-dev',
      'archive status preserves routed workflow',
      JSON.stringify(archivedStatus, null, 2),
    );
    assert(archivedStatus.results.count === 1, 'archive status preserves result count', JSON.stringify(archivedStatus, null, 2));
    const archivedResult = readJson(path.join(archiveRoot, 'session-artifacts', 'results', 'result-001.json'));
    assert(archivedResult.outcome === 'succeeded', 'archive preserves result outcome', JSON.stringify(archivedResult, null, 2));

    const archiveCollision = runCli(
      ['workspace', 'archive', launchOutput.sessionId, '--runtime-root', runtimeRoot, '--output', archiveRoot],
      {
        cwd: baseRepo.path,
      },
    );
    const archiveCollisionText = `${archiveCollision.stdout}\n${archiveCollision.stderr}`;
    assert(archiveCollision.status !== 0, 'archive output collision exits nonzero', archiveCollisionText);
    assert(
      archiveCollisionText.includes('ARCHIVE_OUTPUT_EXISTS'),
      'archive output collision names ARCHIVE_OUTPUT_EXISTS',
      archiveCollisionText,
    );

    const beforeVerifyArchive = fingerprintTree(archiveRoot);
    const verifyArchive = runCli(['workspace', 'verify-archive', archiveRoot], {
      cwd: baseRepo.path,
    });
    const verifyArchiveText = `${verifyArchive.stdout}\n${verifyArchive.stderr}`;
    const afterVerifyArchive = fingerprintTree(archiveRoot);
    assert(verifyArchive.status === 0, 'verify-archive clean archive exits zero', verifyArchiveText);
    assert(beforeVerifyArchive === afterVerifyArchive, 'verify-archive is read-only', verifyArchiveText);
    const verifyOutput = JSON.parse(verifyArchive.stdout);
    assert(verifyOutput.ok === true, 'verify-archive reports ok true', verifyArchiveText);

    const invalidResultArchiveRoot = path.join(tempRoot, 'invalid-result-archive');
    copyTree(archiveRoot, invalidResultArchiveRoot);
    const invalidArchivedResultPath = path.join(invalidResultArchiveRoot, 'session-artifacts', 'results', 'result-001.json');
    fs.writeFileSync(invalidArchivedResultPath, `${JSON.stringify({ kind: 'not-a-result' }, null, 2)}\n`);
    rewriteArchiveChecksums(invalidResultArchiveRoot);
    const invalidResultArchive = runCli(['workspace', 'verify-archive', invalidResultArchiveRoot], {
      cwd: baseRepo.path,
    });
    const invalidResultArchiveText = `${invalidResultArchive.stdout}\n${invalidResultArchive.stderr}`;
    assert(invalidResultArchive.status !== 0, 'verify-archive invalid result shape exits nonzero', invalidResultArchiveText);
    assert(
      invalidResultArchiveText.includes('ARCHIVE_RESULT_INVALID'),
      'verify-archive invalid result shape names ARCHIVE_RESULT_INVALID',
      invalidResultArchiveText,
    );

    const archivedStatusPath = path.join(archiveRoot, 'status.json');
    const originalArchivedStatus = fs.readFileSync(archivedStatusPath, 'utf8');
    fs.appendFileSync(archivedStatusPath, 'tamper\n');
    const tamperedArchive = runCli(['workspace', 'verify-archive', archiveRoot], {
      cwd: baseRepo.path,
    });
    const tamperedArchiveText = `${tamperedArchive.stdout}\n${tamperedArchive.stderr}`;
    assert(tamperedArchive.status !== 0, 'verify-archive tampered file exits nonzero', tamperedArchiveText);
    assert(
      tamperedArchiveText.includes('ARCHIVE_CHECKSUM_MISMATCH'),
      'verify-archive tampered file names ARCHIVE_CHECKSUM_MISMATCH',
      tamperedArchiveText,
    );
    fs.writeFileSync(archivedStatusPath, originalArchivedStatus);

    const unsafeArchiveRoot = path.join(tempRoot, 'unsafe-archive');
    copyTree(archiveRoot, unsafeArchiveRoot);
    const unsafeManifest = readJson(path.join(unsafeArchiveRoot, 'manifest.json'));
    unsafeManifest.files[0].path = '../escape.txt';
    fs.writeFileSync(path.join(unsafeArchiveRoot, 'manifest.json'), `${JSON.stringify(unsafeManifest, null, 2)}\n`);
    const unsafeArchive = runCli(['workspace', 'verify-archive', unsafeArchiveRoot], {
      cwd: baseRepo.path,
    });
    const unsafeArchiveText = `${unsafeArchive.stdout}\n${unsafeArchive.stderr}`;
    assert(unsafeArchive.status !== 0, 'verify-archive unsafe path exits nonzero', unsafeArchiveText);
    assert(unsafeArchiveText.includes('ARCHIVE_UNSAFE_PATH'), 'verify-archive unsafe path names ARCHIVE_UNSAFE_PATH', unsafeArchiveText);

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
