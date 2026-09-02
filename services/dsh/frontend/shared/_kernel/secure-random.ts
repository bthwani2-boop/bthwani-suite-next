import { secureRandomId as canonicalSecureRandomId } from "@bthwani/core-identity/secure-random";

type SecureRandomUuidProvider = () => string;

let configuredSecureRandomUuidProvider: SecureRandomUuidProvider | null = null;

export function configureSecureRandomUuidProvider(
  provider: SecureRandomUuidProvider | null,
): void {
  configuredSecureRandomUuidProvider = provider;
}

export function secureRandomId(): string {
  if (configuredSecureRandomUuidProvider) {
    return configuredSecureRandomUuidProvider();
  }
  return canonicalSecureRandomId();
}

export function secureCorrelationId(prefix: string): string {
  return `${prefix}-${secureRandomId()}`;
}
