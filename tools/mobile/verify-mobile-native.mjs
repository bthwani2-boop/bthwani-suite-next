import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() : "";
}

const platform = arg("--platform").toLowerCase();
const requestedApp = arg("--app");
const shouldBuild = process.argv.includes("--build");
const shouldLaunchSimulator = process.argv.includes("--simulator");
const apps = requestedApp ? [requestedApp] : Object.keys(manifest.apps ?? {});

if (!['android', 'ios'].includes(platform)) throw new Error("mobile-native-verification: --platform android|ios is required");
if (platform === 'ios' && process.platform !== 'darwin') throw new Error("mobile-native-verification: iOS verification requires macOS/Xcode");
if (shouldLaunchSimulator && platform !== 'ios') throw new Error("mobile-native-verification: --simulator is iOS-only");
if (shouldLaunchSimulator && !shouldBuild) throw new Error("mobile-native-verification: --simulator requires --build");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `bthwani-${platform}-native-`));
const worktree = path.join(tempRoot, 'checkout');

function fail(message) {
  throw new Error(`mobile-native-verification[${platform}]: ${message}`);
}

function executable(command) {
  return process.platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command;
}

function run(command, args, cwd, { capture = false, env = {} } = {}) {
  const result = spawnSync(executable(command), args, {
    cwd,
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    windowsHide: true,
    shell: false,
    env: {
      ...process.env,
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
      COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
      ...env,
    },
  });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = capture ? `\n${String(result.stderr || result.stdout || '').trim()}` : '';
    fail(`${command} ${args.join(' ')} failed with exit code ${result.status}${detail}`);
  }
  return capture ? String(result.stdout ?? '').trim() : '';
}

function findDirectory(root, predicate) {
  if (!fs.existsSync(root)) return null;
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const absolute = path.join(current, entry.name);
      if (predicate(absolute, entry.name)) return absolute;
      queue.push(absolute);
    }
  }
  return null;
}

function verifyAndroidIdentity(app, appDir, config) {
  for (const relative of ['android/gradlew', 'android/app/build.gradle', 'android/app/src/main/AndroidManifest.xml']) {
    if (!fs.existsSync(path.join(appDir, relative))) fail(`${app}: prebuild did not create ${relative}`);
  }
  const gradle = fs.readFileSync(path.join(appDir, 'android/app/build.gradle'), 'utf8');
  if (!gradle.includes(config.androidPackage)) fail(`${app}: generated Android package differs from ${config.androidPackage}`);
}

function buildAndroid(app, appDir) {
  const androidDir = path.join(appDir, 'android');
  const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  run(wrapper, [':app:assembleDebug', '--no-daemon', '--stacktrace'], androidDir, {
    env: { GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || path.join(tempRoot, '.gradle') },
  });
  const apk = findDirectory(
    path.join(androidDir, 'app/build/outputs/apk'),
    (absolute, name) => name.endsWith('.apk') || fs.existsSync(path.join(absolute, 'app-debug.apk')),
  );
  const canonicalApk = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
  if (!fs.existsSync(canonicalApk) && !apk) fail(`${app}: Gradle succeeded but no debug APK was produced`);
}

function verifyIosIdentity(app, appDir, config) {
  const iosDir = path.join(appDir, 'ios');
  const project = fs.readdirSync(iosDir).find((name) => name.endsWith('.xcodeproj'));
  if (!project || !fs.existsSync(path.join(iosDir, 'Podfile'))) fail(`${app}: prebuild did not create Xcode project + Podfile`);
  const pbxproj = fs.readFileSync(path.join(iosDir, project, 'project.pbxproj'), 'utf8');
  if (!pbxproj.includes(config.iosBundleIdentifier)) fail(`${app}: generated iOS bundle differs from ${config.iosBundleIdentifier}`);
}

function iosWorkspace(appDir) {
  const iosDir = path.join(appDir, 'ios');
  run('pod', ['install', '--silent'], iosDir);
  const workspace = fs.readdirSync(iosDir).find((name) => name.endsWith('.xcworkspace') && name !== 'Pods.xcworkspace');
  if (!workspace) fail('CocoaPods did not create an application xcworkspace');
  const workspacePath = path.join(iosDir, workspace);
  const raw = run('xcodebuild', ['-list', '-json', '-workspace', workspacePath], iosDir, { capture: true });
  let parsed;
  try { parsed = JSON.parse(raw); } catch { fail(`xcodebuild -list returned invalid JSON for ${workspace}`); }
  const scheme = (parsed?.workspace?.schemes ?? []).find((value) => value && !/^Pods(?:-|$)/.test(value));
  if (!scheme) fail(`${workspace}: no application scheme found`);
  return { iosDir, workspacePath, scheme };
}

function buildIos(app, appDir, config) {
  const { iosDir, workspacePath, scheme } = iosWorkspace(appDir);
  const derivedData = path.join(tempRoot, 'derived-data', app);
  run('xcodebuild', [
    '-workspace', workspacePath,
    '-scheme', scheme,
    '-configuration', 'Debug',
    '-sdk', 'iphonesimulator',
    '-destination', 'generic/platform=iOS Simulator',
    '-derivedDataPath', derivedData,
    'CODE_SIGNING_ALLOWED=NO',
    'CODE_SIGNING_REQUIRED=NO',
    'build',
  ], iosDir);
  const builtApp = findDirectory(
    path.join(derivedData, 'Build/Products'),
    (_absolute, name) => name.endsWith('.app') && !name.endsWith('Tests.app'),
  );
  if (!builtApp) fail(`${app}: Xcode succeeded but no Simulator .app was produced`);
  const bundle = run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', path.join(builtApp, 'Info.plist')], iosDir, { capture: true });
  if (bundle !== config.iosBundleIdentifier) fail(`${app}: built iOS bundle mismatch expected=${config.iosBundleIdentifier} actual=${bundle}`);
  return builtApp;
}

function availableIphoneSimulator() {
  const parsed = JSON.parse(run('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], worktree, { capture: true }));
  for (const [runtime, devices] of Object.entries(parsed.devices ?? {})) {
    if (!runtime.includes('SimRuntime.iOS-')) continue;
    const device = (devices ?? []).find((candidate) => candidate?.isAvailable && /^iPhone\b/.test(candidate.name ?? ''));
    if (device) return device;
  }
  fail('no available iPhone Simulator is installed');
}

function launchIos(app, builtApp, config) {
  const device = availableIphoneSimulator();
  if (device.state !== 'Booted') run('xcrun', ['simctl', 'boot', device.udid], worktree);
  run('xcrun', ['simctl', 'bootstatus', device.udid, '-b'], worktree);
  run('xcrun', ['simctl', 'install', device.udid, builtApp], worktree);
  const output = run('xcrun', ['simctl', 'launch', '--terminate-running-process', device.udid, config.iosBundleIdentifier], worktree, { capture: true });
  if (!/:\s*\d+\s*$/.test(output)) fail(`${app}: simctl launch returned no process evidence: ${output}`);
  console.log(`ios simulator launch PASS app=${app} simulator=${device.name}`);
}

try {
  if (!fs.existsSync(manifestPath)) fail('canonical mobile manifest is missing');
  for (const app of apps) {
    const config = manifest.apps?.[app];
    if (!config) fail(`unknown app '${app}'`);
    if (!config.androidPackage || !config.iosBundleIdentifier) fail(`${app}: both canonical native identifiers are required`);
  }

  run('git', ['worktree', 'add', '--detach', worktree, 'HEAD'], repoRoot);

  // A Git worktree contains source but not PNPM's per-workspace node_modules links.
  // Re-materialize the exact frozen workspace inside the disposable worktree so
  // Expo/config plugins resolve through the same dependency topology as CI.
  run('pnpm', ['install', '--frozen-lockfile', '--prefer-offline', '--reporter=append-only'], worktree);

  for (const app of apps) {
    const config = manifest.apps[app];
    const appDir = path.join(worktree, 'apps', app, 'runtime');
    run('pnpm', ['--dir', appDir, 'exec', 'expo', 'prebuild', '--platform', platform, '--no-install', '--clean'], worktree);

    if (platform === 'android') {
      verifyAndroidIdentity(app, appDir, config);
      console.log(`mobile:android:prebuild PASS app=${app} package=${config.androidPackage}`);
      if (shouldBuild) {
        buildAndroid(app, appDir);
        console.log(`mobile:android:native-build PASS app=${app} package=${config.androidPackage}`);
      }
    } else {
      verifyIosIdentity(app, appDir, config);
      console.log(`mobile:ios:prebuild PASS app=${app} bundle=${config.iosBundleIdentifier}`);
      if (shouldBuild) {
        const builtApp = buildIos(app, appDir, config);
        console.log(`mobile:ios:native-build PASS app=${app} bundle=${config.iosBundleIdentifier}`);
        if (shouldLaunchSimulator) launchIos(app, builtApp, config);
      }
    }
  }
} finally {
  spawnSync('git', ['worktree', 'remove', '--force', worktree], { cwd: repoRoot, stdio: 'ignore' });
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
