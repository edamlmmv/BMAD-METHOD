const { launchSession } = require('../../workspace/launch');
const { runRepoIntake } = require('../../workspace/intake');
const { buildWorkPacket } = require('../../workspace/packet');
const { runWorktreeReview } = require('../../workspace/review');
const { destroySession } = require('../../workspace/destroy');
const { authorizeDurableWrite } = require('../../workspace/grant-guard');
const { readSessionStatus } = require('../../workspace/status');
const { listSessions } = require('../../workspace/list');
const { renderSessionHandoff } = require('../../workspace/handoff');
const { archiveSession, verifyArchive } = require('../../workspace/archive');
const { recordSessionResult } = require('../../workspace/result');
const { recordSessionCloseout } = require('../../workspace/closeout');
const { readEvidenceIndex } = require('../../workspace/evidence');
const { diffWorkspaceArchives } = require('../../workspace/diff');
const { nextManualActionForError } = require('../../workspace/next-action');
const { WORKSPACE_OPTIONS, isWorkspaceCommand, renderWorkspaceHelp } = require('../../workspace/command-registry');

const WORKSPACE_HELP = renderWorkspaceHelp();

function collect(value, previous) {
  return [...(previous || []), value];
}

function printHelp() {
  process.stdout.write(`${WORKSPACE_HELP}\n`);
}

module.exports = {
  command: 'workspace [workspaceCommand] [sessionId]',
  description: WORKSPACE_HELP,
  options: WORKSPACE_OPTIONS.map(toCommanderOption),
  action: (workspaceCommand, sessionId, options) => {
    if (!workspaceCommand) {
      printHelp();
      process.exit(0);
    }

    if (!isWorkspaceCommand(workspaceCommand)) {
      process.stderr.write(`Workspace command not implemented: ${workspaceCommand}\n`);
      process.exit(1);
    }

    try {
      const result = runWorkspaceCommand(workspaceCommand, sessionId, options);
      if (workspaceCommand === 'handoff') {
        process.stdout.write(`${result}\n`);
      } else {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      }
    } catch (error) {
      process.stderr.write(`Workspace ${workspaceCommand} failed: ${error.message}\n`);
      process.stderr.write(
        `Next manual action: ${nextManualActionForError(error.message, { sessionId, runtimeRoot: options.runtimeRoot })}\n`,
      );
      process.exit(1);
    }

    process.exit(0);
  },
};

function toCommanderOption(option) {
  if (option.repeatable) {
    return [option.flags, option.description, collect, option.defaultValue || []];
  }
  return [option.flags, option.description];
}

function runWorkspaceCommand(workspaceCommand, sessionId, options) {
  if (workspaceCommand === 'launch') {
    return launchSession({
      repoPaths: options.repo,
      goalPath: options.goal,
      runtimeRoot: options.runtimeRoot,
      sessionId: options.sessionId,
      workspaceBasePath: process.cwd(),
      baseImprovement: options.baseImprovement,
      grantPath: options.grant,
    });
  }

  if (workspaceCommand === 'intake') {
    return runRepoIntake({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'review') {
    return runWorktreeReview({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'list') {
    return listSessions({
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'status') {
    return readSessionStatus({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'handoff') {
    return renderSessionHandoff({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'evidence') {
    return readEvidenceIndex({
      sessionId,
      runtimeRoot: options.runtimeRoot,
    });
  }

  if (workspaceCommand === 'diff') {
    return diffWorkspaceArchives({
      leftPath: options.left,
      rightPath: options.right,
    });
  }

  if (workspaceCommand === 'result') {
    return recordSessionResult({
      sessionId,
      runtimeRoot: options.runtimeRoot,
      inputPath: options.input,
      resultId: options.resultId,
    });
  }

  if (workspaceCommand === 'closeout') {
    return recordSessionCloseout({
      sessionId,
      runtimeRoot: options.runtimeRoot,
      inputPath: options.input,
      closeoutId: options.closeoutId,
    });
  }

  if (workspaceCommand === 'archive') {
    return archiveSession({
      sessionId,
      runtimeRoot: options.runtimeRoot,
      outputPath: options.output,
    });
  }

  if (workspaceCommand === 'verify-archive') {
    return verifyArchive({
      archivePath: sessionId,
    });
  }

  if (workspaceCommand === 'destroy') {
    return destroySession({
      sessionId,
      runtimeRoot: options.runtimeRoot,
      keepReview: options.keepReview,
    });
  }

  if (workspaceCommand === 'authorize') {
    return authorizeDurableWrite({
      sessionId,
      writePath: options.writePath,
      runtimeRoot: options.runtimeRoot,
    });
  }

  return buildWorkPacket({
    sessionId,
    runtimeRoot: options.runtimeRoot,
    setupRefs: {
      zoomOut: options.zoomOutRef,
      ubiquitousLanguage: options.ubiquitousLanguageRef,
      grillDecisions: options.grillDecisionsRef,
      tddPlan: options.tddPlanRef,
    },
    setupSkips: options.skipSetup,
    workflowOverride: options.workflow,
  });
}
