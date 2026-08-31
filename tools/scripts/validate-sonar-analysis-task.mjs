import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const SONAR_ANALYSIS_TASK_SCHEMA = "bthwani-sonar-analysis-task/1";

const SONARCLOUD_ORIGIN = "https://sonarcloud.io";
const requiredKeys = ["ceTaskId", "projectKey", "serverUrl", "dashboardUrl", "ceTaskUrl"];

const normalize = (value) => String(value ?? "").trim();

function parseProperties(text) {
  const properties = {};
  const errors = [];
  for (const [index, rawLine] of String(text ?? "").split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) {
      errors.push(`line ${index + 1}: expected key=value`);
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!/^[A-Za-z][A-Za-z0-9_.-]*$/u.test(key) || !value) {
      errors.push(`line ${index + 1}: invalid key or empty value`);
      continue;
    }
    if (Object.hasOwn(properties, key)) errors.push(`line ${index + 1}: duplicate property ${key}`);
    else properties[key] = value;
  }
  return {properties, errors};
}

function parseSonarUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.origin !== SONARCLOUD_ORIGIN) return `${label}: origin must be ${SONARCLOUD_ORIGIN}`;
    if (url.username || url.password || url.hash) return `${label}: credentials and fragments are forbidden`;
    return url;
  } catch {
    return `${label}: invalid URL`;
  }
}

export function validateSonarAnalysisTask(text, expected = {}) {
  const {properties, errors} = parseProperties(text);
  for (const key of requiredKeys) if (!properties[key]) errors.push(`missing ${key}`);

  const projectKey = normalize(expected.projectKey);
  if (projectKey && properties.projectKey !== projectKey) {
    errors.push(`projectKey ${properties.projectKey || "<empty>"} does not match ${projectKey}`);
  }

  const serverUrl = properties.serverUrl ? parseSonarUrl(properties.serverUrl, "serverUrl") : null;
  if (typeof serverUrl === "string") errors.push(serverUrl);
  else if (serverUrl?.pathname !== "/" && serverUrl?.pathname !== "") errors.push("serverUrl: path must be root");

  const dashboardUrl = properties.dashboardUrl ? parseSonarUrl(properties.dashboardUrl, "dashboardUrl") : null;
  if (typeof dashboardUrl === "string") errors.push(dashboardUrl);
  else if (dashboardUrl && dashboardUrl.pathname !== "/dashboard") errors.push("dashboardUrl: path must be /dashboard");
  else if (dashboardUrl && dashboardUrl.searchParams.get("id") !== properties.projectKey) {
    errors.push("dashboardUrl: project id does not match projectKey");
  }

  const ceTaskUrl = properties.ceTaskUrl ? parseSonarUrl(properties.ceTaskUrl, "ceTaskUrl") : null;
  if (typeof ceTaskUrl === "string") errors.push(ceTaskUrl);
  else if (ceTaskUrl && ceTaskUrl.pathname !== "/api/ce/task") errors.push("ceTaskUrl: path must be /api/ce/task");
  else if (ceTaskUrl && ceTaskUrl.searchParams.get("id") !== properties.ceTaskId) {
    errors.push("ceTaskUrl: task id does not match ceTaskId");
  }

  if (expected.prNumber && dashboardUrl && dashboardUrl.searchParams.get("pullRequest") !== String(expected.prNumber)) {
    errors.push(`dashboardUrl: pull request does not match ${expected.prNumber}`);
  }

  return {
    schema: SONAR_ANALYSIS_TASK_SCHEMA,
    valid: errors.length === 0,
    errors,
    properties,
  };
}

function argumentValue(args, name, required = true) {
  const index = args.indexOf(name);
  if (index === -1) {
    if (required) throw new Error(`missing ${name}`);
    return "";
  }
  if (index + 1 >= args.length) throw new Error(`missing value for ${name}`);
  return args[index + 1];
}

function main() {
  const args = process.argv.slice(2);
  const input = argumentValue(args, "--input");
  const output = argumentValue(args, "--output", false);
  const result = validateSonarAnalysisTask(fs.readFileSync(input, "utf8"), {
    projectKey: argumentValue(args, "--project-key"),
    prNumber: argumentValue(args, "--pr-number", false),
  });
  if (output) {
    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify(result));
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
