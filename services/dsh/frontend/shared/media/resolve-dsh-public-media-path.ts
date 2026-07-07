// DSH Web/Public Media Resolver
// SCAFFOLD: not runtime truth, not backend/API/binding source.
// Owner: dsh/frontend/shared.
// Live runtime media must come from DSH API -> PostgreSQL dsh_media_assets +
// MinIO/S3 public_url values.

const explicitPublicMediaPathByKey: Record<string, string> = {};

export function getActualPublicMediaPath(key?: string | null): string {
  if (!key) return '';
  if (key.startsWith('http') || key.startsWith('//') || key.startsWith('/')) return key;
  return '';
}

function hasDshPublicMediaPath(key?: string | null): boolean {
  return getActualPublicMediaPath(key).length > 0;
}

function getMediaKeyFromPublicPath(path: string): string | null {
  return null;
}
