import * as SecureStore from 'expo-secure-store';
import type { SessionStorageAdapter } from '@bthwani/core-identity';

// Only import this file from app-field's own tree — expo-secure-store is
// only installed there, not in app-partner/app-client/app-captain.
export function createSecureStoreSessionStorageAdapter(): SessionStorageAdapter {
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
}
