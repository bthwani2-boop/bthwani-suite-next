import { resolveDshAuthBaseUrl } from './dsh-auth-client';
import { PlatformVarsRegistry } from '../platform/platform-vars';
import { createDshProductApiHttpClient } from '../catalog/dsh-product-api.transport';

function getPartnerStoreOnboardingRuntimeClient(): any {
  return null;
}

export function getDshProductRuntimeClient(): any {
  const baseUrl = getDshProductRuntimeBaseUrl();
  return baseUrl ? createDshProductApiHttpClient(baseUrl) : null;
}

export function getDshProductRuntimeBaseUrl() {
  return PlatformVarsRegistry.get('dshApiBaseUrl');
}

export function getDshMediaRuntimeClient(): any {
  return null;
}

function getDshStoreVisibilityRuntimeClient(): any {
  return null;
}

export function getDshOrderLifecycleRuntimeClient(auth?: any): any {
  return null;
}

function getDshOrderRuntimeBaseUrl() {
  return PlatformVarsRegistry.get('dshApiBaseUrl');
}

function getDshCheckoutRuntimeClient(baseUrl: string, auth?: any): any {
  return null;
}

function getDshDiscoveryStoresRuntimeClient(config: any): any {
  return null;
}

function getDshFieldReadinessRuntimeClient(): any {
  return null;
}

function getDshAuthRuntimeBaseUrl() {
  return resolveDshAuthBaseUrl();
}
