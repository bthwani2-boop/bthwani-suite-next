// Canonical location: dsh/frontend/shared/platform/local-temp-id.ts
// Authority: dsh/frontend/shared/platform — generates local UI-only temp IDs.
// These IDs are NEVER sent to the backend as entity identifiers.
// Use only for keying local React lists, draft states, or optimistic UI entries.

export function generateLocalTempId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
