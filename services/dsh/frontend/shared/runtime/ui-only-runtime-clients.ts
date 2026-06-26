import { resolveDshAuthBaseUrl } from './dsh-auth-client';
import { PlatformVarsRegistry } from '../platform/platform-vars';

export function getPartnerStoreOnboardingRuntimeClient(): any {
  return null;
}

export function getDshProductRuntimeClient(): any {
  return null;
}

export function getDshProductRuntimeBaseUrl() {
  return PlatformVarsRegistry.get('dshApiBaseUrl');
}

export function getDshMediaRuntimeClient(): any {
  return null;
}

export function getDshStoreVisibilityRuntimeClient(): any {
  return null;
}

export function getDshOrderLifecycleRuntimeClient(auth?: any): any {
  return null;
}

export function getDshOrderRuntimeBaseUrl() {
  return PlatformVarsRegistry.get('dshApiBaseUrl');
}

export function getDshCheckoutRuntimeClient(baseUrl: string, auth?: any): any {
  return null;
}

export function getDshDiscoveryStoresRuntimeClient(config: any): any {
  return null;
}

export function getDshFieldReadinessRuntimeClient(): any {
  return null;
}

export function getDshAuthRuntimeBaseUrl() {
  return resolveDshAuthBaseUrl();
}
