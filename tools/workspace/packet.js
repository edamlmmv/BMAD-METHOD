const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { DEFAULT_RUNTIME_ROOT } = require('./launch');
const { validateCapabilityContract, validateMissionPacket } = require('./contracts');

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

function assertMissionId(missionId) {
  if (!missionId || !/^[a-zA-Z0-9._-]+$/.test(missionId)) {
    throw new Error('packet requires a valid mission id');
  }
}

function missingIntake(missionId) {
  throw new Error(`missing-intake: run workspace intake ${missionId} before packet`);
}

function validatePacketReadiness({ missionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  assertMissionId(missionId);

  const mission = loadMission(missionId, runtimeRoot);
  const { instance, missionRoot } = mission;
  if (!instance.repoIntakeRef) {
    missingIntake(missionId);
  }

  const repoIntakePath = path.join(missionRoot, instance.repoIntakeRef);
  if (!fs.existsSync(repoIntakePath)) {
    missingIntake(missionId);
  }

  const repoIntake = readJson(repoIntakePath);
  for (const repo of repoIntake.repos || []) {
    const currentHead = git(['rev-parse', 'HEAD'], repo.sourcePath);
    if (currentHead !== repo.head) {
      throw new Error(
        `stale-intake: ${repo.id} is at ${currentHead} but intake recorded ${repo.head}; rerun workspace intake ${missionId}`,
      );
    }
  }

  return {
    missionId,
    missionRoot,
    repoIntakePath,
    status: 'fresh-intake',
  };
}

function buildMissionPacket({ missionId, runtimeRoot = DEFAULT_RUNTIME_ROOT }) {
  const readiness = validatePacketReadiness({ missionId, runtimeRoot });
  const mission = loadMission(missionId, runtimeRoot);
  const { instance, instancePath, missionRoot } = mission;
  const packetsRoot = path.join(missionRoot, 'packets');

  fs.mkdirSync(packetsRoot, { recursive: true });

  const packetRef = 'packets/bmad-mission-packet.json';
  const renderedPromptRef = 'packets/rendered-prompt.md';
  const capabilityContractRef = 'capabilities.json';
  const packetPath = path.join(missionRoot, packetRef);
  const renderedPromptPath = path.join(missionRoot, renderedPromptRef);
  const capabilityContractPath = path.join(missionRoot, capabilityContractRef);

  const capabilityContract = createCapabilityContract(instance.workspaceBasePath);
  assertValid('Capability Contract', validateCapabilityContract(capabilityContract));
  writeJson(capabilityContractPath, capabilityContract);

  const packet = {
    schemaVersion: '0.1',
    id: missionId,
    bmadWorkflow: 'bmad-quick-dev',
    goal: readGoal(instance.goalPath),
    repoIntakeRefs: [instance.repoIntakeRef],
    constraints: ['BMAD is kernel/truth', 'Do not mutate Workspace Base', 'Use Repo Intake evidence before executor prompt'],
    grants: [instance.grantsRef],
    acceptanceCriteria: [
      'BMAD Mission Packet remains source of truth',
      'Rendered prompt derives from packet content',
      'Worktree Review ready before promotion',
    ],
    capabilityContractRef,
    renderedPromptRef,
    reviewPlan: 'Run BMAD Code Review after execution',
  };

  assertValid('BMAD Mission Packet', validateMissionPacket(packet));
  writeJson(packetPath, packet);
  fs.writeFileSync(renderedPromptPath, renderPrompt(packet));

  const updatedInstance = {
    ...instance,
    lifecycle: [...new Set([...(instance.lifecycle || []), 'packet'])],
    packetRef,
    capabilityContractRef,
    renderedPromptRef,
  };
  writeJson(instancePath, updatedInstance);

  return {
    missionId,
    missionRoot,
    packetPath,
    renderedPromptPath,
    capabilityContractPath,
    repoIntakePath: readiness.repoIntakePath,
  };
}

function loadMission(missionId, runtimeRoot) {
  const resolvedRuntimeRoot = path.resolve(runtimeRoot);
  const missionRoot = path.join(resolvedRuntimeRoot, 'missions', missionId);
  const instancePath = path.join(missionRoot, 'instance.json');

  if (!fs.existsSync(instancePath)) {
    throw new Error(`mission artifacts not found for ${missionId}`);
  }

  return {
    instance: readJson(instancePath),
    instancePath,
    missionRoot,
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
        allowedInNormalMission: true,
        allowedInBaseImprovement: true,
        requiresGrant: false,
        writes: ['mission-workspace/intake'],
        forbiddenWrites: ['workspace-base'],
        outputs: ['repo-intake.json', 'graph.json', 'provenance.json'],
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
  return `# BMAD Mission Packet Execution Prompt

Source of truth: \`packets/bmad-mission-packet.json\`

## Goal
${packet.goal}

## BMAD Workflow
${packet.bmadWorkflow}

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

## Review Plan
${packet.reviewPlan}
`;
}

module.exports = {
  buildMissionPacket,
  validatePacketReadiness,
};
