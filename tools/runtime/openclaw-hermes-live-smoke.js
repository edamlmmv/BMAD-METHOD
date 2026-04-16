const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DOCTOR_SCRIPT = path.join(__dirname, 'openclaw-hermes-doctor.js');

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const doctorReport = runDoctorJson();
  const smokeReport = buildSmokeReport(doctorReport, options);

  if (!smokeReport.summary.prerequisitesOk) {
    printReport(smokeReport);
    process.exitCode = 1;
    return;
  }

  smokeReport.runtimes = runSmokeChecks(options);
  smokeReport.summary.ok = doctorReport.summary.runtimeReady && Object.values(smokeReport.runtimes).every((runtime) => runtime.ok);
  smokeReport.summary.recommendedNextAction = recommendNextAction(smokeReport);

  if (options.json) {
    console.log(JSON.stringify(smokeReport, null, 2));
  } else {
    printReport(smokeReport);
  }

  if (!smokeReport.summary.ok) {
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  return {
    deep: argv.includes('--deep'),
    json: argv.includes('--json'),
  };
}

function runDoctorJson() {
  const result = spawnSync(process.execPath, [DOCTOR_SCRIPT, '--json'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.stdout) {
    throw new Error(`runtime:doctor --json produced no output.\n${result.stderr || ''}`.trim());
  }

  return JSON.parse(result.stdout);
}

function buildSmokeReport(doctorReport, options) {
  const prerequisites = [
    {
      label: 'Repo valid',
      ok: doctorReport.summary.repoValid,
      required: true,
    },
    {
      label: 'Runtime configured',
      ok: doctorReport.summary.runtimeConfigured,
      required: true,
    },
    {
      label: 'Runtime ready',
      ok: doctorReport.summary.runtimeReady,
      required: false,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    deep: options.deep,
    doctorSummary: doctorReport.summary,
    prerequisites,
    runtimes: {},
    summary: {
      prerequisitesOk: prerequisites.filter((check) => check.required).every((check) => check.ok),
      ok: false,
      recommendedNextAction: prerequisites.filter((check) => check.required).every((check) => check.ok)
        ? 'Run the staged CLI checks below and investigate any failures.'
        : doctorReport.summary.recommendedNextAction,
    },
  };
}

function runSmokeChecks(options) {
  return {
    hermes: runRuntimeSmoke('hermes', buildHermesCommands(options)),
    openclaw: runRuntimeSmoke('openclaw', buildOpenClawCommands(options)),
  };
}

function runRuntimeSmoke(binaryName, commands) {
  const checks = commands.map((args) => runCommand(binaryName, args));
  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

function buildHermesCommands(options) {
  const commands = [['--version'], ['doctor'], ['config', 'check'], ['memory', 'status'], ['gateway', 'status']];
  if (options.deep) {
    commands.push(['cron', 'status']);
  }
  return commands;
}

function buildOpenClawCommands(options) {
  const commands = [['--version'], ['config', 'validate'], ['gateway', 'status', '--json'], ['status', '--json']];
  if (options.deep) {
    commands.push(['doctor', '--non-interactive'], ['health'], ['channels', 'status', '--probe']);
  }
  return commands;
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    timeout: 12_000,
  });

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();

  return {
    command: [command, ...args].join(' '),
    ok: result.status === 0,
    status: result.status,
    stdout,
    stderr,
  };
}

function recommendNextAction(report) {
  if (!report.doctorSummary.runtimeReady) {
    return `${report.doctorSummary.recommendedNextAction.replace(/\.$/u, '')}, then rerun npm run runtime:live-smoke.`;
  }

  const failingChecks = Object.values(report.runtimes).flatMap((runtime) => runtime.checks.filter((check) => !check.ok));
  if (failingChecks.length === 0) {
    return 'Live smoke checks passed. Continue with bounded runtime work or deeper handoff testing.';
  }

  const hasGatewayFailure = failingChecks.some((check) => check.command.includes('gateway status'));
  const hasConfigFailure = failingChecks.some(
    (check) => check.command.includes('config check') || check.command.includes('config validate'),
  );
  const hasDoctorFailure = failingChecks.some((check) => check.command.includes(' doctor'));

  const steps = [];
  if (hasConfigFailure) {
    steps.push('repair the runtime config and secret values');
  }
  if (hasDoctorFailure) {
    steps.push('follow the CLI doctor output for the failing runtime');
  }
  if (hasGatewayFailure) {
    steps.push('start the gateway/service or complete the daemon install');
  }
  if (steps.length === 0) {
    steps.push('inspect the failing smoke commands');
  }
  steps.push('rerun npm run runtime:live-smoke');

  return `${capitalizeFirst(steps[0])}, then ${steps.slice(1).join(', then ')}.`;
}

function printReport(report) {
  console.log('Live runtime smoke');
  console.log(`- Generated: ${report.generatedAt}`);
  console.log(`- Deep mode: ${report.deep ? 'yes' : 'no'}`);
  console.log('');
  console.log('Prerequisites');
  for (const check of report.prerequisites) {
    console.log(`- ${formatBool(check.ok)} ${check.label}${check.required ? '' : ' (soft gate)'}`);
  }
  console.log(`- Next action: ${report.summary.recommendedNextAction}`);

  if (!report.summary.prerequisitesOk) {
    return;
  }

  for (const [runtimeName, runtime] of Object.entries(report.runtimes)) {
    console.log(`\n[${runtimeName}]`);
    console.log(`- Overall: ${formatBool(runtime.ok)}`);
    for (const check of runtime.checks) {
      console.log(`  - ${formatBool(check.ok)} ${check.command}`);
      if (!check.ok && check.stderr) {
        console.log(`    stderr: ${truncate(check.stderr)}`);
      }
    }
  }
}

function formatBool(value) {
  return value ? 'PASS' : 'FAIL';
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
