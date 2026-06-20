import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const root = process.cwd();
const apply = process.argv.includes("--apply");

const global = {
  owner: "bthwani1",
  appLine: "next",
  sourceRepo: "bthwani-suite-next",
  version: "0.1.0",
  node: "24.17.0",
  pnpm: "10.34.2"
};

const apps = [
  {
    key: "app-client",
    name: "app-client-next",
    slug: "app-client-next",
    scheme: "bthwani-client-next",
    androidPackage: "com.bthwani.client.next",
    iosBundleIdentifier: "com.bthwani.client.next",
    projectId: "abec897b-1f5f-409d-8286-607a5a6b69e2"
  },
  {
    key: "app-partner",
    name: "app-partner-next",
    slug: "app-partner-next",
    scheme: "bthwani-partner-next",
    androidPackage: "com.bthwani.partner.next",
    iosBundleIdentifier: "com.bthwani.partner.next",
    projectId: "4cde7be0-7582-4a6b-9ae0-d74f2d149580"
  },
  {
    key: "app-captain",
    name: "app-captain-next",
    slug: "app-captain-next",
    scheme: "bthwani-captain-next",
    androidPackage: "com.bthwani.captain.next",
    iosBundleIdentifier: "com.bthwani.captain.next",
    projectId: "07382a76-4dc5-460f-b4a7-7105d724bae6"
  },
  {
    key: "app-field",
    name: "app-field-next",
    slug: "app-field-next",
    scheme: "bthwani-field-next",
    androidPackage: "com.bthwani.field.next",
    iosBundleIdentifier: "com.bthwani.field.next",
    projectId: ""
  }
];

function abs(file) {
  return path.join(root, file);
}

function appDir(app) {
  return `apps/${app.key}/runtime`;
}

function configPath(app) {
  return `${appDir(app)}/app.config.ts`;
}

function easPath(app) {
  return `${appDir(app)}/eas.json`;
}

function readText(file) {
  return fs.existsSync(abs(file)) ? fs.readFileSync(abs(file), "utf8") : "";
}

function writeText(file, content) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n", "utf8");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function writeJson(file, value) {
  writeText(file, JSON.stringify(value, null, 2));
}

function isUuid(value) {
  return typeof value === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

function existingProjectId(app) {
  const raw = readText(configPath(app));
  return raw.match(/projectId\s*:\s*["']([0-9a-fA-F-]{36})["']/)?.[1] ?? "";
}

async function ensureProjectId(app) {
  const current = existingProjectId(app);
  if (isUuid(current)) return current;
  if (isUuid(app.projectId)) return app.projectId;

  if (!apply) {
    throw new Error(`${app.key}: missing EAS projectId`);
  }

  console.log("");
  console.log(`${app.key}: EAS projectId missing.`);
  console.log("Running eas init now. Choose YES.");

  const result = spawnSync(
    "pnpm",
    ["dlx", "eas-cli@latest", "init"],
    {
      cwd: abs(appDir(app)),
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        EAS_SKIP_AUTO_FINGERPRINT: "1",
        COREPACK_ENABLE_DOWNLOAD_PROMPT: "0"
      }
    }
  );

  if (result.status !== 0) {
    console.log(`${app.key}: eas init exited with code ${result.status}; this is expected for dynamic app.config.ts if it printed a projectId.`);
  }

  const rl = readline.createInterface({ input, output });
  const pasted = (await rl.question(`Paste projectId for ${app.key}: `)).trim();
  rl.close();

  if (!isUuid(pasted)) {
    throw new Error(`${app.key}: invalid projectId: ${pasted}`);
  }

  return pasted;
}

function renderAppConfig(app) {
  return `import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "${app.name}",
  slug: "${app.slug}",
  owner: "${global.owner}",

  platforms: ["ios", "android"],

  scheme: "${app.scheme}",
  version: "${global.version}",

  orientation: "portrait",
  userInterfaceStyle: "light",

  android: {
    package: "${app.androidPackage}"
  },

  ios: {
    bundleIdentifier: "${app.iosBundleIdentifier}"
  },

  extra: {
    appKey: "${app.key}",
    appLine: "${global.appLine}",
    sourceRepo: "${global.sourceRepo}",
    eas: {
      projectId: "${app.projectId}"
    }
  }
};

export default config;
`;
}

function renderEasJson() {
  return {
    cli: {
      appVersionSource: "local"
    },
    build: {
      base: {
        node: global.node,
        pnpm: global.pnpm,
        env: {
          COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
          EAS_SKIP_AUTO_FINGERPRINT: "1"
        }
      },
      development: {
        extends: "base",
        developmentClient: true,
        distribution: "internal",
        android: {
          buildType: "apk"
        }
      },
      internal: {
        extends: "base",
        distribution: "internal",
        android: {
          buildType: "apk"
        }
      },
      production: {
        extends: "base",
        android: {
          buildType: "app-bundle"
        }
      }
    }
  };
}

function renderManifest(apps) {
  return {
    global,
    apps: Object.fromEntries(apps.map((app) => [
      app.key,
      {
        name: app.name,
        slug: app.slug,
        owner: global.owner,
        scheme: app.scheme,
        androidPackage: app.androidPackage,
        iosBundleIdentifier: app.iosBundleIdentifier,
        projectId: app.projectId
      }
    ]))
  };
}

function sameText(a, b) {
  return a.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n" ===
    b.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n";
}

function assertText(file, expected) {
  if (!sameText(readText(file), expected)) {
    throw new Error(`${file}: not synchronized`);
  }
}

function assertJson(file, expected) {
  const actual = JSON.stringify(readJson(file), null, 2).trimEnd() + "\n";
  const wanted = JSON.stringify(expected, null, 2).trimEnd() + "\n";
  if (actual !== wanted) {
    throw new Error(`${file}: JSON not synchronized`);
  }
}

function assertDeps(apps) {
  const baseline = readJson(`${appDir(apps[0])}/package.json`);

  const deps = [
    "expo",
    "expo-dev-client",
    "react",
    "react-native",
    "react-native-gesture-handler",
    "react-native-reanimated",
    "react-native-safe-area-context",
    "react-native-screens",
    "react-native-svg",
    "react-native-worklets"
  ];

  for (const app of apps) {
    const pkg = readJson(`${appDir(app)}/package.json`);

    for (const dep of deps) {
      if (pkg.dependencies?.[dep] !== baseline.dependencies?.[dep]) {
        throw new Error(`${app.key}: dependency mismatch ${dep}`);
      }
    }

    if (pkg.devDependencies?.typescript !== baseline.devDependencies?.typescript) {
      throw new Error(`${app.key}: TypeScript mismatch`);
    }
  }
}

function updateRootScripts() {
  const pkg = readJson("package.json");
  pkg.scripts = pkg.scripts ?? {};
  pkg.scripts["mobile:apps:sync"] = "node tools/scripts/sync-mobile-apps-unified.mjs --apply";
  pkg.scripts["mobile:expo:verify"] = "node tools/scripts/sync-mobile-apps-unified.mjs --check";
  pkg.scripts["mobile:eas:preflight"] = "node tools/scripts/sync-mobile-apps-unified.mjs --check && pnpm -r --if-present typecheck";
  writeJson("package.json", pkg);
}

function writeGuardWrapper() {
  writeText("tools/scripts/guard-mobile-expo-unified.mjs", `import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["tools/scripts/sync-mobile-apps-unified.mjs", "--check"],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
`);
}

async function main() {
  const resolved = [];

  for (const app of apps) {
    const projectId = await ensureProjectId(app);
    resolved.push({ ...app, projectId });
  }

  const manifest = renderManifest(resolved);
  const eas = renderEasJson();

  if (apply) {
    writeJson("tools/mobile/mobile-apps.manifest.json", manifest);

    for (const app of resolved) {
      writeText(configPath(app), renderAppConfig(app));
      writeJson(easPath(app), eas);
    }

    updateRootScripts();
    writeGuardWrapper();

    console.log("PASS: applied mobile app unification");
    return;
  }

  assertJson("tools/mobile/mobile-apps.manifest.json", manifest);

  for (const app of resolved) {
    assertText(configPath(app), renderAppConfig(app));
    assertJson(easPath(app), eas);

    const config = readText(configPath(app));
    if (config.includes('"web"') || config.includes("'web'")) {
      throw new Error(`${app.key}: web is forbidden`);
    }

    const easConfig = readJson(easPath(app));
    if (Object.prototype.hasOwnProperty.call(easConfig.build?.base ?? {}, "corepack")) {
      throw new Error(`${app.key}: corepack is forbidden`);
    }

    if (easConfig.build?.base?.pnpm !== global.pnpm) {
      throw new Error(`${app.key}: EAS pnpm mismatch`);
    }
  }

  assertDeps(resolved);

  console.log("PASS: mobile apps are unified from tools/mobile/mobile-apps.manifest.json");
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
