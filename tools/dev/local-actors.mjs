// Single source of truth accessor for local development identity actors.
// Reads tools/dev/local-actors.json so no script re-declares its own password
// or username fallback.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const registryPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'local-actors.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

export const LOCAL_ACTORS = Object.freeze(registry.actors);
export const LOCAL_PLATFORM_ACTORS = Object.freeze(registry.platformActors);
/**
 * Field/captain provider fixtures. Unlike LOCAL_ACTORS these have no actorId or
 * username: Workforce generates both at provisioning time. See
 * tools/dev/local-workforce-provisioning.mjs.
 */
export const LOCAL_WORKFORCE_PROVIDERS = Object.freeze(registry.workforceProviders);
export const LOCAL_PASSWORD_ENV_VAR = registry.passwordEnvVar;

/** Development seed password: an environment override wins, the registry is the default. */
export function localPassword() {
  const override = process.env[registry.passwordEnvVar];
  return override && override.trim() ? override : registry.password;
}

/** Registry default password, ignoring any environment override. */
export function localPasswordDefault() {
  return registry.password;
}
