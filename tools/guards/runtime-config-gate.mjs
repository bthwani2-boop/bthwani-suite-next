import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, listCodeFiles, listFiles, read, repoRoot, toPosix } from "./_guard-utils.mjs";

const guardId = "runtime-config-gate";
const violations = [];

// 1. Forbidden localhost/port usage
const allowedInLocalhostCheck = (file) => {
  return (
    file.includes("/test/") ||
    file.includes("/tests/") ||
    file.includes(".test.") ||
    file.includes(".spec.") ||
    file.startsWith("tools/") ||
    file.includes("/config/") ||
    file.includes("config")
  );
};

const oldLocalhostRegex = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(8080|8081|8082|8083|8084|3000)\b/g;

for (const file of listCodeFiles()) {
  if (allowedInLocalhostCheck(file)) continue;

  const content = read(file);
  let match;
  while ((match = oldLocalhostRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `forbidden old localhost URL: ${match[0]} (port usage must be through config layers)`
    });
  }
}

// 2. Hardcoded repository local paths
const hardcodedPathRegex = /(?:[c-z]:[\\/]|(?:\r?\n|^|\s)[\\/](?:home|Users)[\\/])[^\r\n]*bthwani-suite-next/i;

for (const file of listCodeFiles()) {
  if (file.startsWith("tools/") || file.includes("/test/") || file.includes("/tests/")) continue;
  
  const content = read(file);
  let match;
  if ((match = hardcodedPathRegex.exec(content))) {
    violations.push({
      file,
      line: lineNumber(content, match.index),
      message: `forbidden hardcoded local repository path: "${match[0].trim()}"`
    });
  }
}

// 3. Env access outside config/kernel layers
const allowedEnvAccess = (file) => {
  return (
    file.startsWith("tools/") ||
    file.startsWith("shared/config/") ||
    file.includes("/shared/") ||
    file.startsWith("shared/") ||
    file.includes("config") ||
    file.includes("/test/") ||
    file.includes("/tests/") ||
    file.includes(".test.") ||
    file.includes(".spec.") ||
    file.startsWith(".github/")
  );
};

for (const file of listCodeFiles()) {
  if (allowedEnvAccess(file)) continue;

  const content = read(file);
  if (/process\.env\.[A-Za-z0-9_]+/.test(content)) {
    violations.push({
      file,
      message: "process.env access is forbidden outside of config/kernel layers"
    });
  }
}

// 4. Docker/runtime config naming checks
const composePath = "infra/docker/compose.runtime.yml";
if (fs.existsSync(path.join(repoRoot, composePath))) {
  const compose = read(composePath);
  
  if (compose.includes("container_name:")) {
    const containerNames = compose.match(/container_name:\s*([^\r\n#]+)/g) ?? [];
    for (const line of containerNames) {
      const name = line.replace("container_name:", "").trim();
      if (!name.startsWith("bthwani-") && !name.startsWith("$") && !name.includes("redis") && !name.includes("postgres") && !name.includes("minio")) {
        violations.push({
          file: composePath,
          message: `container_name '${name}' violates naming conventions (must start with bthwani- or use variable interpolation)`
        });
      }
    }
  }
}

const profilesDir = "infra/docker/runtime-profiles";
const profilesPath = path.join(repoRoot, profilesDir);
if (fs.existsSync(profilesPath)) {
  const files = fs.readdirSync(profilesPath).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const rel = toPosix(path.join(profilesDir, file));
    const full = path.join(profilesPath, file);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      violations.push({ file: rel, message: `invalid json: ${e.message}` });
      continue;
    }
    
    const expectedProfile = path.basename(file, ".runtime-profile.json");
    if (file.endsWith(".runtime-profile.json")) {
      if (json.profile && json.profile !== expectedProfile && !expectedProfile.includes("-")) {
        violations.push({
          file: rel,
          message: `expected profile name to match file name: ${expectedProfile}`
        });
      }
    }
  }
}

fail(guardId, violations);
