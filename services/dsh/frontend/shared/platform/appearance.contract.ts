export const DSH_DEFAULT_APPEARANCE_MODE = 'system' as const;

export type DshAppearanceMode = string;

export function isDshAppearanceMode(value: unknown): value is DshAppearanceMode {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeDshAppearanceMode(
  value: unknown,
  fallback: DshAppearanceMode = DSH_DEFAULT_APPEARANCE_MODE,
): DshAppearanceMode {
  return isDshAppearanceMode(value) ? value : fallback;
}
