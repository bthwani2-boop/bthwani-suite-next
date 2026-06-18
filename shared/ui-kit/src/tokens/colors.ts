export const brandRoots = {
  brandAction: "#FF500D",
  surfaceBase: "#FFFFFF",
  brandStructure: "#0A2F5C"
} as const;

export type BrandRoot = keyof typeof brandRoots;

export function alpha(hex: string, opacity: number): string {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : normalized;

  if (expanded.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export const brandScale = {
  action: {
    50: "#FFF3ED",
    100: "#FFE2D4",
    200: "#FFC0A3",
    300: "#FF9A6B",
    400: "#FF7138",
    500: brandRoots.brandAction,
    600: "#E5480C",
    700: "#B73809",
    800: "#8C2B07",
    900: "#641F05"
  },
  structure: {
    50: "#EEF5FC",
    100: "#D8E7F7",
    200: "#B4CFEA",
    300: "#86AED8",
    400: "#4E83BD",
    500: "#275F96",
    600: brandRoots.brandStructure,
    700: "#082744",
    800: "#061D33",
    900: "#041322"
  },
  surface: {
    0: brandRoots.surfaceBase,
    50: "#FFFCF8",
    100: "#F8F5F0",
    200: "#EFE9E0",
    300: "#E3DACE",
    400: "#D2C7B8"
  }
} as const;

export const colorRoles = {
  brandAction: brandRoots.brandAction,
  brandActionHover: brandScale.action[600],
  brandActionPressed: brandScale.action[700],
  brandActionSoft: brandScale.action[50],
  brandActionTint: alpha(brandRoots.brandAction, 0.12),

  surfaceBase: brandRoots.surfaceBase,
  surfaceWarm: brandScale.surface[50],
  surfaceMuted: brandScale.surface[100],
  surfaceInset: brandScale.surface[200],
  surfaceOverlay: alpha(brandRoots.surfaceBase, 0.86),

  brandStructure: brandRoots.brandStructure,
  brandStructureElevated: brandScale.structure[500],
  brandStructureSoft: brandScale.structure[50],
  brandStructureTint: alpha(brandRoots.brandStructure, 0.12),

  textPrimary: brandRoots.brandStructure,
  textSecondary: brandScale.structure[500],
  textMuted: alpha(brandRoots.brandStructure, 0.68),
  textInverse: brandRoots.surfaceBase,

  borderSubtle: alpha(brandRoots.brandStructure, 0.1),
  borderStrong: alpha(brandRoots.brandStructure, 0.18),
  focusRing: alpha(brandRoots.brandAction, 0.34),

  success: "#1F8B4C",
  warning: "#B96A06",
  danger: "#C43B35",
  info: "#295FAA",

  shadowBase: "#000000"
} as const;

export type ColorRole = keyof typeof colorRoles;
