import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "mobile-metro-ownership-gate";
const violations = [];
const requestedAppIndex = process.argv.indexOf("--app");
const requestedApp = requestedAppIndex >= 0 ? process.argv[requestedAppIndex + 1] : null;

const manifestPath = path.join(repoRoot, "tools/mobile/mobile-apps.manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const tooling = manifest.global?.toolingArchitecture;

function requireToolingDecision(condition, message) {
  if (!condition) violations.push({ file: "tools/mobile/mobile-apps.manifest.json", message });
}

requireToolingDecision(tooling?.decision === "EXPO_METRO_SINGLE_OWNER", "toolingArchitecture.decision must remain EXPO_METRO_SINGLE_OWNER");
requireToolingDecision(tooling?.remoteBuildNow === false, "Metro tooling governance must not trigger an EAS remote build");
requireToolingDecision(tooling?.metro?.base === "expo/metro-config", "Expo apps must use expo/metro-config as the canonical Metro base");
requireToolingDecision(tooling?.metro?.sentryOwner === "@sentry/react-native/metro#getSentryExpoConfig", "Sentry Metro integration must remain the governed Metro entry point");
requireToolingDecision(tooling?.metro?.directReactNativeMetroConfig?.package === "@react-native/metro-config", "direct React Native Metro package decision is missing");
requireToolingDecision(tooling?.metro?.directReactNativeMetroConfig?.status === "DEPRECATION_CANDIDATE", "@react-native/metro-config must remain a deprecation candidate until explicit removal approval");
requireToolingDecision(tooling?.rules?.expoMetroConfigIsCanonical === true, "expoMetroConfigIsCanonical must remain true");
requireToolingDecision(tooling?.rules?.sentryMetroIntegrationMustRemain === true, "sentryMetroIntegrationMustRemain must remain true");
requireToolingDecision(tooling?.rules?.manualMonorepoOverridesRequireRuntimeProofBeforeRemoval === true, "manual Metro overrides require runtime proof before removal");
requireToolingDecision(tooling?.rules?.reactNativeMetroConfigMustNotBeImportedByExpoApps === true, "Expo apps must not import @react-native/metro-config directly");

const targetApps = requestedApp ? [requestedApp] : Object.keys(manifest.apps ?? {});
for (const appKey of targetApps) {
  if (!manifest.apps?.[appKey]) {
    violations.push({ file: "tools/mobile/mobile-apps.manifest.json", message: `unknown governed app '${appKey}'` });
    continue;
  }

  const packagePath = `apps/${appKey}/runtime/package.json`;
  const metroPath = `apps/${appKey}/runtime/metro.config.cjs`;
  const packageAbsolute = path.join(repoRoot, packagePath);
  const metroAbsolute = path.join(repoRoot, metroPath);

  if (!fs.existsSync(packageAbsolute)) {
    violations.push({ file: packagePath, message: "mobile runtime package.json is required" });
    continue;
  }
  if (!fs.existsSync(metroAbsolute)) {
    violations.push({ file: metroPath, message: "mobile Metro config is required" });
    continue;
  }

  const pkg = JSON.parse(fs.readFileSync(packageAbsolute, "utf8"));
  const metro = fs.readFileSync(metroAbsolute, "utf8");

  if (!metro.includes("getSentryExpoConfig")) {
    violations.push({ file: metroPath, message: "Metro config must retain getSentryExpoConfig as the Sentry/Expo entry point" });
  }
  if (metro.includes("@react-native/metro-config")) {
    violations.push({ file: metroPath, message: "FORBIDDEN: Expo app Metro config must not import @react-native/metro-config directly" });
  }

  const manualResolutionStatus = tooling?.metro?.manualMonorepoResolution?.status;
  if (manualResolutionStatus === "COMPATIBILITY_QUARANTINE_PENDING_RUNTIME_PROOF") {
    for (const marker of ["config.watchFolders", "config.resolver.nodeModulesPaths", "config.resolver.extraNodeModules"]) {
      if (!metro.includes(marker)) {
        violations.push({ file: metroPath, message: `compatibility quarantine drift: expected '${marker}' until runtime proof authorizes removal` });
      }
    }
  }

  const directMetroDependency = pkg.dependencies?.["@react-native/metro-config"];
  if (directMetroDependency && tooling?.metro?.directReactNativeMetroConfig?.status !== "DEPRECATION_CANDIDATE") {
    violations.push({ file: packagePath, message: "@react-native/metro-config is direct but lacks the governed deprecation-candidate decision" });
  }
}

fail(guardId, violations);
