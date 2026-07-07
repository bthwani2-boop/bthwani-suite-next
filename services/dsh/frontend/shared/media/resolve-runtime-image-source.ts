import type { ImageSourcePropType } from 'react-native';

/**
 * Runtime-safe image resolver for active app-client commerce flows.
 * DEV keys stay behind preview/category-specific surfaces and should not
 * leak into cart, store, or checkout rendering.
 */
function resolveDshRuntimeImageSource(
  source?: string | ImageSourcePropType | null,
): ImageSourcePropType | undefined {
  if (!source) return undefined;
  if (typeof source !== 'string') return source;
  if (source.startsWith('dsh.')) return undefined;
  return { uri: source };
}
