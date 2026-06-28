// DSH Web/Public Media Resolver
// SCAFFOLD: not runtime truth, not backend/API/binding source.
// Owner: dsh/frontend/shared.
// Live runtime media must come from DSH API -> PostgreSQL dsh_media_assets +
// MinIO/S3 public_url values.

export const explicitPublicMediaPathByKey: Record<string, string> = {};

export function getActualPublicMediaPath(key?: string | null): string {
  if (!key) return '';
  if (key.startsWith('http') || key.startsWith('//') || key.startsWith('/')) return key;
  return '';
}

export function hasDshPublicMediaPath(key?: string | null): boolean {
  return getActualPublicMediaPath(key).length > 0;
}

export function getMediaKeyFromPublicPath(path: string): string | null {
  return null;
}
