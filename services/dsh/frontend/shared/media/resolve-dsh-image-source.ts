import type { ImageSourcePropType } from 'react-native';

/**
 * DSH Seed Media Source Resolver
 * Owner: dsh/frontend/shared (resolver) — archived preview assets are no longer
 * registered as runtime ImageSource values.
 * Live runtime media must come from DSH API -> PostgreSQL dsh_media_assets
 * metadata + MinIO/S3 public_url values.
 * This resolver now returns runtime URLs as { uri } and leaves archived dsh.*
 * seed keys unresolved so callers use their normal empty/placeholder state.
 * DSH_CATEGORY_ICONS is emoji fallback only — not a primary image source.
 * Callers use emojiFallback from DshCategoryFixture as the active fallback.
 */

const dshStaticMediaSources: Record<string, ImageSourcePropType | undefined> = {};

export const DSH_PRODUCT_MEDIA_KEYS = [
  'dsh.product.apple.v1',
  'dsh.product.bread.v1',
  'dsh.product.chicken.v1',
  'dsh.product.choco.v1',
  'dsh.product.croissant.v1',
  'dsh.product.milk.v1',
  'dsh.product.pasta.v1',
  'dsh.product.roll.v1',
  'dsh.product.lead-5.dates-box.v1',
  'dsh.product.salad.v1',
  'dsh.product.yogurt.v1',
] as const;

export type DshProductMediaKey = (typeof DSH_PRODUCT_MEDIA_KEYS)[number];

/** Category key namespace router — archived keys resolve to undefined. */
function resolveCategoryKey(key: string): ImageSourcePropType | undefined {
  return dshStaticMediaSources[key];
}

export function resolveDshImageSource(source?: string | ImageSourcePropType | null): ImageSourcePropType | undefined {
  if (!source) return undefined;
  if (typeof source !== 'string') return source;
  // Route category namespace — emoji fallback activates when undefined is returned
  if (source.startsWith('dsh.category.main.') || source.startsWith('dsh.category.sub.')) {
    return resolveCategoryKey(source);
  }
  if (source.startsWith('dsh.')) return dshStaticMediaSources[source];
  return { uri: source };
}
