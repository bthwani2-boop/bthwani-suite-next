import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GOOGLE_API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/;

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validationError(errors) {
  const error = new Error(errors.join("; "));
  error.name = "GoogleServicesConfigValidationError";
  error.details = errors;
  return error;
}

function normalizedApiKeys(client) {
  return Array.isArray(client?.api_key)
    ? client.api_key
      .map((entry) => entry?.current_key)
      .filter(nonEmptyString)
      .map((value) => value.trim())
    : [];
}

export function validateGoogleServicesConfigObject(config, expectedPackage) {
  const errors = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw validationError(["root must be a JSON object"]);
  }

  const projectInfo = config.project_info;
  if (!projectInfo || typeof projectInfo !== "object" || Array.isArray(projectInfo)) {
    errors.push("project_info is required");
  } else {
    if (!nonEmptyString(projectInfo.project_number)) errors.push("project_info.project_number is required");
    if (!nonEmptyString(projectInfo.project_id)) errors.push("project_info.project_id is required");
  }

  if (!nonEmptyString(config.configuration_version)) {
    errors.push("configuration_version is required");
  }

  if (!Array.isArray(config.client) || config.client.length === 0) {
    errors.push("client must be a non-empty array");
  }

  const packageNames = Array.isArray(config.client)
    ? config.client
      .map((client) => client?.client_info?.android_client_info?.package_name)
      .filter(nonEmptyString)
    : [];

  const matchingClient = Array.isArray(config.client)
    ? config.client.find(
      (client) => client?.client_info?.android_client_info?.package_name === expectedPackage,
    )
    : undefined;

  let apiKeys = [];
  if (!matchingClient) {
    const actual = packageNames.length > 0 ? packageNames.join(", ") : "none";
    errors.push(`Android package '${expectedPackage}' is required (found: ${actual})`);
  } else {
    if (!nonEmptyString(matchingClient?.client_info?.mobilesdk_app_id)) {
      errors.push(`client '${expectedPackage}' is missing client_info.mobilesdk_app_id`);
    }

    apiKeys = normalizedApiKeys(matchingClient);
    if (apiKeys.length === 0) {
      errors.push(`client '${expectedPackage}' is missing api_key.current_key`);
    } else {
      const invalidKeys = apiKeys.filter((key) => !GOOGLE_API_KEY_PATTERN.test(key));
      if (invalidKeys.length > 0) {
        errors.push(`client '${expectedPackage}' contains an invalid Google API key`);
      }
      if (new Set(apiKeys).size !== 1) {
        errors.push(`client '${expectedPackage}' must contain exactly one unique Firebase API key`);
      }
    }
  }

  if (errors.length > 0) throw validationError(errors);

  return {
    projectId: projectInfo.project_id.trim(),
    projectNumber: projectInfo.project_number.trim(),
    packageName: expectedPackage,
    mobileSdkAppId: matchingClient.client_info.mobilesdk_app_id.trim(),
    apiKeyCount: apiKeys.length,
    configurationVersion: config.configuration_version.trim(),
  };
}

export function validateGoogleServicesConfigFile(file, expectedPackage) {
  if (!nonEmptyString(file)) throw validationError(["file path is required"]);
  if (!nonEmptyString(expectedPackage)) throw validationError(["expected Android package is required"]);

  const absolutePath = path.resolve(file);
  if (!fs.existsSync(absolutePath)) {
    throw validationError([`file does not exist: ${absolutePath}`]);
  }
  if (!fs.statSync(absolutePath).isFile()) {
    throw validationError([`path is not a file: ${absolutePath}`]);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw validationError([`file is not valid JSON: ${error.message}`]);
  }

  return {
    file: absolutePath,
    ...validateGoogleServicesConfigObject(parsed, expectedPackage),
  };
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function runCli() {
  const args = process.argv.slice(2);
  const file = valueAfter(args, "--file");
  const expectedPackage = valueAfter(args, "--package");
  const json = args.includes("--json");

  try {
    const result = validateGoogleServicesConfigFile(file, expectedPackage);
    if (json) console.log(JSON.stringify({ ok: true, ...result }));
    else console.log(`PASS: ${result.packageName} -> ${result.projectId} (${result.mobileSdkAppId})`);
  } catch (error) {
    const details = Array.isArray(error?.details) ? error.details : [error.message];
    if (json) console.log(JSON.stringify({ ok: false, error: error.message, details }));
    else console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) runCli();
