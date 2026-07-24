import path from "node:path";

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseJsonCandidate(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function extractFirebaseCliJson(output) {
  if (!nonEmptyString(output)) throw new Error("Firebase CLI returned no JSON output");

  const text = output.trim();
  const direct = parseJsonCandidate(text);
  if (direct !== undefined) return direct;

  const starts = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "{" || text[index] === "[") starts.push(index);
  }

  for (const start of starts) {
    const candidate = parseJsonCandidate(text.slice(start));
    if (candidate !== undefined) return candidate;
  }

  throw new Error("Firebase CLI output did not contain a valid JSON payload");
}

function unwrapCliResult(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "result" in payload) {
    return payload.result;
  }
  return payload;
}

function appArrayFromPayload(payload) {
  const result = unwrapCliResult(payload);
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.apps)) return result.apps;
  if (Array.isArray(payload?.apps)) return payload.apps;
  return [];
}

export function normalizeFirebaseAndroidApps(payload) {
  return appArrayFromPayload(payload)
    .map((app) => ({
      appId: app?.appId ?? app?.app_id ?? app?.id,
      displayName: app?.displayName ?? app?.display_name ?? "",
      packageName: app?.packageName ?? app?.package_name ?? app?.platformId ?? "",
      platform: String(app?.platform ?? "ANDROID").toUpperCase(),
    }))
    .filter((app) => nonEmptyString(app.appId) && nonEmptyString(app.packageName))
    .filter((app) => app.platform === "ANDROID");
}

export function buildFirebaseBootstrapPlan(manifestApps, existingApps, secretsRoot) {
  if (!manifestApps || typeof manifestApps !== "object" || Array.isArray(manifestApps)) {
    throw new Error("manifest apps must be an object");
  }
  if (!Array.isArray(existingApps)) throw new Error("existing apps must be an array");
  if (!nonEmptyString(secretsRoot)) throw new Error("secrets root is required");

  return Object.entries(manifestApps).map(([appKey, app]) => {
    const packageName = app?.androidPackage;
    if (!nonEmptyString(packageName)) throw new Error(`${appKey}: androidPackage is required`);

    const matches = existingApps.filter((candidate) => candidate.packageName === packageName);
    if (matches.length > 1) {
      throw new Error(`${appKey}: multiple Firebase Android apps use package '${packageName}'`);
    }

    const existing = matches[0];
    return {
      appKey,
      packageName,
      displayName: `${app?.name || appKey} Android Development`,
      action: existing ? "existing" : "create",
      appId: existing?.appId ?? null,
      destination: path.join(secretsRoot, appKey, "google-services.json"),
    };
  });
}
