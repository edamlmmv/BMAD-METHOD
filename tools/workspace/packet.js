const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parse } = require('csv-parse/sync');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { validateCapabilityContract, validateWorkPacket } = require('./contracts');
const { EXECUTOR_CONTRACT_REF, buildExecutorContract, validateExecutorContract } = require('./executor-contract');
const { routeWorkspace } = require('./routing');

function cleanGitEnv() {
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX']) {
    delete env[key];
  }
  return env;
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: cleanGitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonAtomic(filePath, value) {
  writeFileAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFileAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tempPath, value);
  fs.renameSync(tempPath, filePath);
}

function assertSessionId(sessionId) {
  if (!sessionId || !/^[a-zA-Z0-9._-]+$/.test(sessionId)) {
    throw new Error('packet requires a valid session id');
  }
}

function missingIntake(sessionId) {
  throw new Error(`missing-intake: run workspace intake ${sessionId} before packet`);
}

function validatePacketReadiness({ sessionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertSessionId(sessionId);

  const session = loadSession(sessionId, runtimeRoot);
  const { instance, sessionRoot } = session;
  if (!instance.repoIntakeRef) {
    missingIntake(sessionId);
  }

  const repoIntakePath = path.join(sessionRoot, instance.repoIntakeRef);
  if (!fs.existsSync(repoIntakePath)) {
    missingIntake(sessionId);
  }

  const repoIntake = readJson(repoIntakePath);
  for (const repo of repoIntake.repos || []) {
    const currentHead = git(['rev-parse', 'HEAD'], repo.sourcePath);
    if (currentHead !== repo.head) {
      throw new Error(
        `stale-intake: ${repo.id} is at ${currentHead} but intake recorded ${repo.head}; rerun workspace intake ${sessionId}`,
      );
    }
  }

  return {
    sessionId,
    sessionRoot,
    repoIntakePath,
    status: 'fresh-intake',
  };
}

function buildWorkPacket({
  sessionId,
  runtimeRoot = DEFAULT_RUNTIME_ROOT,
  setupRefs = {},
  setupSkips = [],
  setupBasePath = process.cwd(),
  workflowOverride,
}) {
  const readiness = validatePacketReadiness({ sessionId, runtimeRoot });
  const session = loadSession(sessionId, runtimeRoot);
  const { instance, instancePath, sessionRoot } = session;
  const goal = readGoal(instance.goalPath);
  const sessionSetup = buildSessionSetup({ setupRefs, setupSkips, setupBasePath });
  const repoIntakeRefs = [instance.repoIntakeRef];
  const routing = routeWorkspace({
    goal,
    sessionSetup,
    repoIntakeRefs,
    artifactRefs: collectArtifactRefs(instance, sessionSetup),
    catalogEntries: loadRouteableCatalogRows(),
    workflowOverride,
  });

  const packetRef = 'packets/bmad-work-packet.json';
  const renderedPromptRef = 'packets/rendered-prompt.md';
  const capabilityContractRef = 'capabilities.json';
  const executorContractRef = EXECUTOR_CONTRACT_REF;
  const packetPath = path.join(sessionRoot, packetRef);
  const renderedPromptPath = path.join(sessionRoot, renderedPromptRef);
  const capabilityContractPath = path.join(sessionRoot, capabilityContractRef);
  const executorContractPath = path.join(sessionRoot, executorContractRef);

  const repoPack = readJson(path.join(sessionRoot, instance.repoPackRef));
  const grants = readJson(path.join(sessionRoot, instance.grantsRef));
  const capabilityContract = createCapabilityContract(instance.workspaceBasePath);
  assertValid('Capability Contract', validateCapabilityContract(capabilityContract));

  const packet = {
    kind: 'bmad-work-packet',
    packetVersion: 4,
    sessionId,
    bmadWorkflow: routing.selectedWorkflow,
    goal,
    repoIntakeRefs,
    constraints: ['BMAD is kernel/truth', 'Do not mutate Workspace Base', 'Use Repo Intake evidence before executor prompt'],
    grants: [instance.grantsRef],
    acceptanceCriteria: [
      'BMAD Work Packet remains source of truth',
      'Rendered prompt derives from packet content',
      'Worktree Review ready before promotion',
    ],
    capabilityContractRef,
    renderedPromptRef,
    executorContractRef,
    routing,
    sessionSetup,
    reviewPlan: 'Run BMAD Code Review after execution',
  };

  assertValid('BMAD Work Packet', validateWorkPacket(packet));
  const renderedPrompt = renderPrompt(packet);
  const executorContract = buildExecutorContract({
    sessionId,
    sessionType: instance.sessionType || 'normal',
    packetRef,
    renderedPromptRef,
    routing,
    grants,
    repoPack,
    workspaceBasePath: instance.workspaceBasePath,
  });
  assertValid(
    'Executor Contract',
    validateExecutorContract(executorContract, {
      expectedSessionId: sessionId,
      expectedPacketRef: packetRef,
      expectedRenderedPromptRef: renderedPromptRef,
    }),
  );

  writeJsonAtomic(capabilityContractPath, capabilityContract);
  writeJsonAtomic(packetPath, packet);
  writeFileAtomic(renderedPromptPath, renderedPrompt);
  writeJsonAtomic(executorContractPath, executorContract);

  const updatedInstance = {
    ...instance,
    lifecycle: [...new Set([...(instance.lifecycle || []), 'packet'])],
    packetRef,
    capabilityContractRef,
    renderedPromptRef,
    executorContractRef,
  };
  writeJsonAtomic(instancePath, updatedInstance);

  return {
    sessionId,
    sessionRoot,
    packetPath,
    renderedPromptPath,
    capabilityContractPath,
    executorContractPath,
    repoIntakePath: readiness.repoIntakePath,
  };
}

function collectArtifactRefs(instance, sessionSetup) {
  return {
    goalPath: instance.goalPath,
    repoPackRef: instance.repoPackRef,
    grantsRef: instance.grantsRef,
    setup: Object.values(sessionSetup)
      .map((entry) => entry.ref || entry.resolvedRef || entry.skipReason || '')
      .filter(Boolean)
      .join(' '),
  };
}

function loadRouteableCatalogRows() {
  const catalogPath = path.join(__dirname, '..', '..', 'src', 'bmm-skills', 'module-help.csv');
  const content = fs.readFileSync(catalogPath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
}

function buildSessionSetup({ setupRefs, setupSkips, setupBasePath = process.cwd() }) {
  const steps = {
    zoomOut: setupRefs.zoomOut,
    ubiquitousLanguage: setupRefs.ubiquitousLanguage,
    grillDecisions: setupRefs.grillDecisions,
    tddPlan: setupRefs.tddPlan,
  };
  const skipped = parseSetupSkips(setupSkips);
  const sessionSetup = {};

  for (const [step, ref] of Object.entries(steps)) {
    if (step in skipped) {
      if (typeof ref === 'string' && ref.trim() !== '') {
        throw new Error(`duplicate-session-setup: ${step} cannot be both complete and skipped`);
      }
      sessionSetup[step] = { status: 'skipped', skipReason: skipped[step] };
      continue;
    }

    if (typeof ref === 'string' && ref.trim() !== '') {
      sessionSetup[step] = {
        status: 'complete',
        ...resolveSetupRef(ref, setupBasePath),
      };
    }
  }

  const missing = Object.keys(steps).filter((step) => !(step in sessionSetup));
  if (missing.length > 0) {
    throw new Error(`missing-session-setup: ${missing.join(', ')}`);
  }

  return sessionSetup;
}

function resolveSetupRef(ref, setupBasePath) {
  const trimmedRef = ref.trim();
  if (trimmedRef.startsWith('external:')) {
    if (trimmedRef === 'external:') {
      throw new Error('SETUP_REF_MISSING: external setup ref requires a value');
    }
    return {
      ref: trimmedRef,
      refType: 'external',
      verification: 'external-unverified',
    };
  }

  const fileRef = trimmedRef.startsWith('file:') ? trimmedRef.slice('file:'.length) : trimmedRef;
  const { filePath, fragment } = splitRefFragment(fileRef);
  if (!filePath || filePath.trim() === '') {
    throw new Error(`SETUP_REF_MISSING: ${trimmedRef}`);
  }

  const resolvedPath = path.resolve(setupBasePath, filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`SETUP_REF_MISSING: ${trimmedRef}`);
  }
  if (!fs.statSync(resolvedPath).isFile()) {
    throw new Error(`SETUP_REF_MISSING: ${trimmedRef} is not a file`);
  }

  return {
    ref: trimmedRef,
    refType: 'file',
    resolvedRef: `${resolvedPath}${fragment}`,
    sha256: sha256File(resolvedPath),
    verification: 'local-verified',
  };
}

function splitRefFragment(ref) {
  const hashIndex = ref.indexOf('#');
  if (hashIndex === -1) {
    return { filePath: ref, fragment: '' };
  }
  return {
    filePath: ref.slice(0, hashIndex),
    fragment: ref.slice(hashIndex),
  };
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function parseSetupSkips(setupSkips = []) {
  const skipped = {};
  for (const skip of setupSkips) {
    if (typeof skip !== 'string' || !skip.includes('=')) {
      throw new Error('invalid-session-setup-skip: expected <step=reason>');
    }
    const [step, ...reasonParts] = skip.split('=');
    const reason = reasonParts.join('=').trim();
    if (!['zoomOut', 'ubiquitousLanguage', 'grillDecisions', 'tddPlan'].includes(step)) {
      throw new Error(`invalid-session-setup-skip: ${step}`);
    }
    if (reason === '') {
      throw new Error(`invalid-session-setup-skip: ${step} requires a reason`);
    }
    if (step in skipped) {
      throw new Error(`duplicate-session-setup: ${step}`);
    }
    skipped[step] = reason;
  }
  return skipped;
}

function loadSession(sessionId, runtimeRoot) {
  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const sessionRoot = path.join(resolvedRuntimeRoot, 'sessions', sessionId);
  const instancePath = path.join(sessionRoot, 'instance.json');

  if (!fs.existsSync(instancePath)) {
    throw new Error(`session artifacts not found for ${sessionId}`);
  }

  return {
    instance: readJson(instancePath),
    instancePath,
    sessionRoot,
  };
}

function readGoal(goalPath) {
  return fs.readFileSync(goalPath, 'utf8').trim();
}

function createCapabilityContract(workspaceBasePath) {
  return {
    schemaVersion: '0.1',
    workspaceVersion: resolveWorkspaceVersion(workspaceBasePath),
    capabilities: [
      {
        id: 'evidence.graph.repo-intake',
        group: 'evidence.graph',
        provider: 'workspace.git-intake',
        interface: 'repo-intake',
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: false,
        writes: ['workspace-session/intake'],
        forbiddenWrites: ['workspace-base'],
        outputs: ['repo-intake.json', 'graph.json', 'provenance.json'],
        upstreamGapProofRequired: false,
      },
      {
        id: 'executor.codex.manual',
        group: 'executor.codex',
        provider: 'codex',
        interface: 'manual-executor-contract',
        allowedInNormalSession: true,
        allowedInBaseImprovement: true,
        requiresGrant: true,
        writes: ['workspace-session/packets'],
        forbiddenWrites: ['workspace-base', 'target-repo', 'scheduler', 'daemon', 'live-adapter'],
        outputs: ['executor-contract.json'],
        upstreamGapProofRequired: false,
      },
    ],
  };
}

function resolveWorkspaceVersion(workspaceBasePath) {
  try {
    return git(['rev-parse', 'HEAD'], workspaceBasePath);
  } catch {
    return 'unknown';
  }
}

function assertValid(label, result) {
  if (!result.ok) {
    throw new Error(`${label} invalid: ${result.errors.join('; ')}`);
  }
}

function renderPrompt(packet) {
  return `# BMAD Work Packet Execution Prompt

Source of truth: \`packets/bmad-work-packet.json\`

## Goal
${packet.goal}

## BMAD Workflow
${packet.bmadWorkflow}

## Routing
- source: ${packet.routing?.source || 'legacy-missing'}
- confidence: ${packet.routing?.confidence || 'weak'}
- reasonCodes: ${(packet.routing?.reasonCodes || []).join(', ') || 'ROUTING_LEGACY_MISSING'}
- nextManualStep: ${packet.routing?.nextManualStep || 'Inspect legacy packet workflow.'}

## Evidence
${packet.repoIntakeRefs.map((reference) => `- ${reference}`).join('\n')}

## Constraints
${packet.constraints.map((constraint) => `- ${constraint}`).join('\n')}

## Grants
${packet.grants.map((grant) => `- ${grant}`).join('\n')}

## Acceptance Criteria
${packet.acceptanceCriteria.map((criterion) => `- ${criterion}`).join('\n')}

## Capability Contract
${packet.capabilityContractRef}

## Executor Contract
${packet.executorContractRef}

## Review Plan
${packet.reviewPlan}
`;
}

module.exports = {
  buildWorkPacket,
  validatePacketReadiness,
  buildSessionSetup,
  resolveSetupRef,
};
