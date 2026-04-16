---
title: Ultimate QA BMAD
description: Cross-project QA BMAD for browser, mobile, and desktop targets.
sidebar:
  order: 13
---

The ultimate QA BMAD is a reusable orchestration pattern for products that need
browser, phone, and desktop coverage without forcing the same harness onto
every target.

This repo defines the operating model. Each application repo should provide a
small adapter manifest with launch commands, test commands, selectors, auth
strategy, and artifact paths.

The BMAD should wrap the target repo's existing harness and conventions rather
than replace them. The inspected suites showed two strong patterns already in
the wild:

- a React Native mobile target with Detox, `testID`, selector constants, and
  deterministic artifact summaries
- an Electron desktop target with Playwright Electron, centralized selector
  maps, helper-driven launch/reset flows, and failure-oriented screenshots

## Target Matrix

| Target | Primary harness | Best use |
| --- | --- | --- |
| Browser web app | OpenClaw browser + Playwright Test | exploratory runs, smoke tests, regression coverage |
| Mobile web / PWA | Playwright device emulation | responsive and browser-behavior checks |
| Electron desktop app | Playwright Electron + Playwright Test | app-window workflows and UI regression |
| React Native app | Detox | simulator/device E2E with app-state synchronization |
| Native mobile app | Appium | broader iOS/Android native automation when the target is not React Native |
| Native desktop app | Appium or platform-native automation | non-Electron desktop workflows when a suitable driver exists |

## Harness Rules

### Browser and webview QA

- Use the OpenClaw managed browser surface for isolated exploratory automation.
- Use Playwright Test for durable committed regression suites.
- Keep the `openclaw` browser profile separate from the operator's everyday
  browser session.
- Keep committed regression tests focused on routes, components, and services
  the team controls rather than unstable third-party websites.

### Mobile QA

- Use Playwright only for mobile-web and PWA behavior.
- For native app UI:
  - prefer Detox when the target stack is React Native
  - prefer Appium when you need broader native-platform coverage or the stack
    is not React Native
- Preserve the app's existing `testID` contract so Detox can keep using
  `by.id(...)` selectors instead of fragile text-based matching.
- Keep secrets machine-local and route platform-specific execution through the
  repo's own wrapper commands rather than ad hoc one-off launches.

### Desktop QA

- If the app is Electron, prefer Playwright Electron.
- If the app is native macOS/Windows, prefer Appium or platform-native
  automation based on the drivers that target repo can support.
- Use browser tooling only for embedded web content or browser-based login
  flows.
- Preserve repo-level selector maps instead of scattering raw selectors through
  generated tests.
- Keep helper-driven launch/reset flows when the desktop app already provides
  them.

## Best-Practice Guardrails

- Test user-visible behavior rather than implementation details.
- Keep tests isolated and runnable independently.
- Prefer semantic locators and explicit contracts.
- Capture traces, screenshots, and artifact summaries for failures or retries.
- Keep auth state, secrets, and storage state out of tracked files.
- Avoid direct regression dependence on third-party sites you do not control.

## Adapter Rule

The BMAD should not try to standardize every target onto one runner.

- Wrap the repo's existing harness first.
- Export new tests into the target repo's existing suite layout.
- Reuse the target repo's reset hooks, fixture structure, and artifact
  conventions.
- Introduce Appium only when the target repo's existing harness does not cover
  the surface you need.

## Optional Evidence Tools

Optional evidence-capture tools such as Jam can complement the QA BMAD, but
they are not part of the required harness matrix.

- Treat Jam-style capture as an adjunct for bug reporting and async issue
  sharing.
- Do not make Jam a hard dependency for browser, mobile, or desktop test
  execution.
- If Jam is unavailable or does not install cleanly, the QA BMAD should still
  work through OpenClaw browser, Playwright, Detox, and Appium.

## BMAD Roles

### Hermes

Hermes stays responsible for:

- target classification
- harness selection
- acceptance criteria
- durable planning, memory, and synthesis

### OpenClaw workers

Use bounded workers with clear ownership:

- `qa-discovery` for target-stack inspection
- `qa-browser-runner` for exploratory browser runs
- `qa-playwright-export` for Playwright scaffold generation
- `qa-mobile-runner` for Detox or Appium slices
- `qa-desktop-runner` for Electron or native desktop slices
- `qa-evidence-synthesizer` for traces, screenshots, and next actions

## Artifact Contract

Suggested target adapter manifest:

```yaml
target:
  name: product-target
  surface: native-mobile
  stack: react-native
  primary_harness: detox
  secondary_harness: appium
environment:
  launch_command: npm run ios
  test_command: npm run e2e
  auth_strategy: seeded-test-user
  reset_strategy: api-reset-script
selectors:
  convention: testid-and-accessibility-label
artifacts:
  output_root: .qa-artifacts
  trace_support: true
  screenshot_support: true
```

### Validated React Native Mobile Example

```yaml
target:
  name: react-native-mobile-target
  repo_path: /abs/path/to/mobile-app
  surface: native-mobile
  stack: react-native
  primary_harness: detox
  secondary_harness: appium
commands:
  ios_release_build: <repo wrapper command>
  ios_release_run: <repo wrapper command>
  android_release_build: <repo wrapper command>
  android_release_run: <repo wrapper command>
selectors:
  source_file: e2e/constants.ts
  convention:
    - testID
    - TEST_IDS
    - by.id(TEST_IDS.*)
artifacts:
  output_root: artifacts
  latest_summary_patterns:
    - artifacts/ios.sim.<config>.latest/latest-artifact-summary.txt
    - artifacts/android.emu.<config>.latest/latest-artifact-summary.txt
```

### Validated Electron Desktop Example

```yaml
target:
  name: electron-desktop-target
  repo_path: /abs/path/to/desktop-app
  surface: electron-desktop
  stack: electron-react
  primary_harness: playwright-electron
  exploratory_harness: openclaw-browser
commands:
  app_start: <repo app start command>
  web_start: <repo web start command>
  test_e2e: <repo e2e command>
selectors:
  source_file: playwright/data/selectors.json
  convention:
    - data-test-id
    - data-test-button
    - central SELECTORS map
artifacts:
  screenshot_mode: only-on-failure
  test_dir: playwright/test-suites
```

Suggested run outputs:

- `qa-runs/<timestamp>/plan.md`
- `qa-runs/<timestamp>/steps.log`
- `qa-runs/<timestamp>/screenshots/`
- `qa-runs/<timestamp>/trace/`
- `qa-runs/<timestamp>/result.md`
- `qa-runs/<timestamp>/generated-tests/`

## Execution Ladder

1. Detect the target type and existing framework.
2. Run a bounded smoke scenario.
3. Capture evidence and summarize risk.
4. Export or update the committed regression scaffold.
5. Run the target repo's own test command.
6. Promote only the stable subset into CI and release gates.

## Validated Structural Patterns

The following patterns are based on direct inspection of existing suites and
should guide the QA BMAD structure.

### React Native mobile target

- Use Detox as the primary harness.
- Keep generated tests inside the existing `e2e/` layout.
- Reuse the repo's platform-specific wrapper commands instead of calling Detox
  ad hoc.
- Preserve the repo's `TEST_IDS` map and `testID` selector contract.
- Keep credentials in machine-local env files or CI secrets rather than in
  committed fixtures.
- Treat Appium as a fallback only for surfaces Detox cannot cover cleanly.

### Electron desktop target

- Use Playwright Electron as the primary harness.
- Keep generated tests inside `playwright/test-suites`.
- Reuse the repo's selector contract from `playwright/data/selectors.json` or
  its equivalent instead of duplicating raw locators.
- Preserve `data-test-id` and `data-test-button` attributes as the stable UI
  contract for QA.
- Reuse existing launch/reset helpers when the suite already exposes them.
- Keep OpenClaw browser for exploratory browser-only or hosted-web smoke flows,
  not as a replacement for Electron automation.

## First Smokes

### React Native mobile target

- Sign-in form renders on cold launch.
- Seeded test user can sign in successfully.
- Deep-link flow reaches the expected authenticated or fallback state.

### Electron desktop target

- App launches and main window is reachable.
- Seeded user can sign in and create or join a room.
- Share-screen modal opens and the expected media-source tab becomes visible.
