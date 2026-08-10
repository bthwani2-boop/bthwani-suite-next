const validStates = new Set(["HISTORICAL_IMMUTABLE", "ACTIVE"]);

export function loadExistingMigrationStates(manifest, service) {
  if (manifest === null) return new Map();
  if (manifest?.service !== service || !Array.isArray(manifest?.migrations)) {
    throw new Error(`Existing migration manifest is invalid for '${service}'.`);
  }

  const states = new Map();
  for (const migration of manifest.migrations) {
    if (typeof migration?.file !== "string" || !validStates.has(migration?.state)) {
      throw new Error(`Existing migration state is invalid for '${service}/${migration?.file ?? "<unknown>"}'.`);
    }
    if (states.has(migration.file)) {
      throw new Error(`Existing migration manifest contains duplicate file '${service}/${migration.file}'.`);
    }
    states.set(migration.file, migration.state);
  }
  return states;
}

export function resolveMigrationState(file, existingStates, hasExistingManifest) {
  const existing = existingStates.get(file);
  if (existing) return existing;
  return hasExistingManifest ? "ACTIVE" : "HISTORICAL_IMMUTABLE";
}
