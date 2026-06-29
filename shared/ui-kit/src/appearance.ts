import {
	appearanceModeRawPalettes,
	darkTheme,
	lightTheme,
	rawColorPalettes,
	withAlpha,
	type ThemeMode,
} from './foundation';

// lightPremium = base light + selective glass.
// darkGlass = full dark premium with role-based glass.
export type BThwaniAppearanceMode = 'lightPremium' | 'darkGlass';

export type BThwaniGlassRole = 'surface' | 'surfaceStrong' | 'heroOverlay';

export type BThwaniAppearancePalette = {
  deepBlue: string;
  deepBlueElevated: string;
  orange: string;
  orangeSoft: string;
  orangePeach: string;
  white: string;
  offWhite: string;
  warmWhite: string;
  warmSurface: string;
  warmSurfaceElevated: string;
  navyNight: string;
  navyNightElevated: string;
  navySurface: string;
  navySurfaceRaised: string;
  inkMuted: string;
  inkSoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
};

export type BThwaniAppearanceShadow = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: {
    width: number;
    height: number;
  };
  elevation: number;
};

type BThwaniInteractiveColors = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  shadow?: BThwaniAppearanceShadow | undefined;
};

type BThwaniInteractiveStates = {
  default: BThwaniInteractiveColors;
  pressed: BThwaniInteractiveColors;
  disabled: BThwaniInteractiveColors;
  focusRing: string;
};

export type BThwaniAppearanceThemeColors = {
  pageBackground: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceRaised: string;
  surfaceInset: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  borderStrong: string;
  accentBlue: string;
  accentOrange: string;
  ctaPrimary: string;
  ctaSecondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  overlay: string;
  overlaySoft: string;
  focusRing: string;
  disabledSurface: string;
  disabledInk: string;
  glassSurface: string;
  glassSurfaceStrong: string;
  glassBorder: string;
  rimLightSubtle: string;
  rimLightStrong: string;
  shadowSoftColor: string;
  shadowPremiumColor: string;
};

export type BThwaniAppearanceComponentTokens = {
  buttons: {
    primary: BThwaniInteractiveStates;
    brand: BThwaniInteractiveStates;
    secondary: BThwaniInteractiveStates;
    ghost: BThwaniInteractiveStates;
    danger: BThwaniInteractiveStates;
    success: BThwaniInteractiveStates;
    warning: BThwaniInteractiveStates;
    info: BThwaniInteractiveStates;
    default: BThwaniInteractiveStates;
    glass: BThwaniInteractiveStates;
    glassStrong: BThwaniInteractiveStates;
    loadingIndicator: string;
  };
  badges: {
    neutral: BThwaniInteractiveColors;
    brand: BThwaniInteractiveColors;
    promo: BThwaniInteractiveColors;
    premium: BThwaniInteractiveColors;
    success: BThwaniInteractiveColors;
    warning: BThwaniInteractiveColors;
    danger: BThwaniInteractiveColors;
    info: BThwaniInteractiveColors;
  };
  chips: {
    default: BThwaniInteractiveColors;
    selected: BThwaniInteractiveColors;
    glass: BThwaniInteractiveColors;
    glassSelected: BThwaniInteractiveColors;
  };
  inputs: {
    background: string;
    border: string;
    focusBorder: string;
    errorBorder: string;
    placeholder: string;
    label: string;
    helper: string;
    disabledSurface: string;
    disabledText: string;
    sectionSurface: string;
  };
  navigation: {
    headerSurface: string;
    headerBorder: string;
    navSurface: string;
    navBorder: string;
    navActiveBackground: string;
    navActiveText: string;
    navInactiveText: string;
    badgeSurface: string;
    badgeText: string;
  };
  alerts: {
    info: BThwaniInteractiveColors;
    success: BThwaniInteractiveColors;
    warning: BThwaniInteractiveColors;
    danger: BThwaniInteractiveColors;
    promotion: BThwaniInteractiveColors;
    offline: BThwaniInteractiveColors;
  };
  lists: {
    rowBackground: string;
    rowPressedBackground: string;
    rowSelectedBackground: string;
    rowDisabledBackground: string;
    rowDivider: string;
    trailingAction: string;
    title: string;
    subtitle: string;
    meta: string;
  };
  overlays: {
    modalBackdrop: string;
    modalSurface: string;
    modalBorder: string;
    sheetSurface: string;
    popoverSurface: string;
    tooltipSurface: string;
    tooltipText: string;
    skeletonBase: string;
    skeletonHighlight: string;
    heroOverlay: string;
  };
  commerce: {
    price: string;
    oldPrice: string;
    discountSurface: string;
    discountText: string;
    rating: string;
    favoriteActive: string;
    favoriteInactive: string;
    favoriteSurface: string;
    favoriteBorder: string;
    cartIndicatorSurface: string;
    cartIndicatorText: string;
    availabilityOpen: string;
    availabilityClosed: string;
    promoSurface: string;
    promoBorder: string;
    imageFrame: string;
    storeLogoRing: string;
    deliverySelectedSurface: string;
    deliverySelectedBorder: string;
    deliverySelectedText: string;
    deliveryIdleSurface: string;
    deliveryIdleBorder: string;
    deliveryIdleText: string;
    productCard: {
      backgroundColor: string;
      borderColor: string;
      rimLightColor: string;
      imageBackground: string;
      partnerTileBackground: string;
      partnerTileBorder: string;
      partnerTileShadow: BThwaniAppearanceShadow;
      titleColor: string;
      subtitleColor: string;
      priceColor: string;
      oldPriceColor: string;
      discountSurface: string;
      discountText: string;
      categorySurface: string;
      categoryText: string;
      statusDefaultSurface: string;
      statusDefaultText: string;
      statusSuccessSurface: string;
      statusSuccessText: string;
      statusDangerSurface: string;
      statusDangerText: string;
      favoriteSurface: string;
      favoriteBorder: string;
      favoriteActive: string;
      favoriteInactive: string;
      actionSurface: string;
      actionBorder: string;
      actionIcon: string;
      actionPlusSurface: string;
      actionPlusBorder: string;
      actionPlusIcon: string;
      shadowSoft: BThwaniAppearanceShadow;
      shadowPremium: BThwaniAppearanceShadow;
    };
  };
  controlPanel: {
    kpiSurface: string;
    kpiBorder: string;
    chartSurface: string;
    chartGrid: string;
    chartAxis: string;
    tableHeader: string;
    tableRow: string;
    tableRowHover: string;
    tableRowSelected: string;
    filterSurface: string;
    toolbarSurface: string;
    warningPanelSurface: string;
    warningPanelBorder: string;
    auditIndicator: string;
  };
  dataViz: {
    series: string[];
    grid: string;
    axis: string;
    positive: string;
    negative: string;
    warning: string;
  };
};

export type BThwaniAppearanceTokens = {
  mode: BThwaniAppearanceMode;
  themeMode: ThemeMode;
  isDark: boolean;
  palette: BThwaniAppearancePalette;
  colors: BThwaniAppearanceThemeColors;
  components: BThwaniAppearanceComponentTokens;
  appBackground: string;
  appBackgroundElevated: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentMuted: string;
  success: string;
  warning: string;
  danger: string;
  glassSurface: string;
  glassSurfaceStrong: string;
  glassBorder: string;
  glassText: string;
  glassMutedText: string;
  heroOverlay: string;
  heroOverlayStrong: string;
  chipBackground: string;
  chipSelectedBackground: string;
  actionBackground: string;
  actionSelectedBackground: string;
  productCardBackground: string;
  promoCardBackground: string;
  shadowSoft: BThwaniAppearanceShadow;
  shadowPremium: BThwaniAppearanceShadow;
};

export type BThwaniGlassRecipe = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
};

export const bthwaniAppearanceModes = Object.freeze(['lightPremium', 'darkGlass'] as const);

export const defaultBThwaniAppearanceMode: BThwaniAppearanceMode = 'lightPremium';
export const bthwaniAppearanceStorageKeySuffix = 'appearance-mode';

export function isBThwaniAppearanceMode(value: string | null | undefined): value is BThwaniAppearanceMode {
  return value === 'lightPremium' || value === 'darkGlass';
}

export function getBThwaniAppearanceStorageKey(appName = 'global') {
  const normalizedAppName = appName.trim() || 'global';
  return `@bthwani/${normalizedAppName}/${bthwaniAppearanceStorageKeySuffix}`;
}

export function getBThwaniAppearanceCookieKey(appName = 'global') {
  const normalizedAppName = (appName.trim() || 'global').replace(/[^a-zA-Z0-9_-]/g, '-');
  return `bthwani-${normalizedAppName}-${bthwaniAppearanceStorageKeySuffix}`;
}

export function syncBThwaniAppearanceCookie(appName: string, mode: BThwaniAppearanceMode) {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    document.cookie = `${getBThwaniAppearanceCookieKey(appName)}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignore cookie failures and keep the runtime appearance active.
  }
}

function createShadow(
  shadowColor: string,
  shadowOpacity: number,
  shadowRadius: number,
  width: number,
  height: number,
  elevation: number,
): BThwaniAppearanceShadow {
  return {
    shadowColor,
    shadowOpacity,
    shadowRadius,
    shadowOffset: { width, height },
    elevation,
  };
}

const appearancePaletteByMode = appearanceModeRawPalettes satisfies Record<BThwaniAppearanceMode, BThwaniAppearancePalette>;

export const lightThemeColors = {
  pageBackground: lightTheme.background,
  surfacePrimary: lightTheme.surface,
  surfaceSecondary: lightTheme.surfaceSecondary,
  surfaceRaised: lightTheme.surfaceRaised,
  surfaceInset: lightTheme.surfaceInset,
  textPrimary: lightTheme.text,
  textSecondary: appearancePaletteByMode.lightPremium.navySurface,
  textMuted: lightTheme.textMuted,
  borderSubtle: lightTheme.line,
  borderStrong: lightTheme.lineStrong,
  accentBlue: appearancePaletteByMode.lightPremium.deepBlue,
  accentOrange: lightTheme.brand,
  ctaPrimary: appearancePaletteByMode.lightPremium.deepBlue,
  ctaSecondary: appearancePaletteByMode.lightPremium.white,
  success: lightTheme.success,
  warning: lightTheme.warning,
  danger: lightTheme.danger,
  info: lightTheme.info,
  overlay: lightTheme.overlay,
  overlaySoft: lightTheme.overlaySoft,
  focusRing: lightTheme.focusRing,
  disabledSurface: lightTheme.disabledSurface,
  disabledInk: lightTheme.disabledText,
  glassSurface: withAlpha(appearancePaletteByMode.lightPremium.white, 0.72),
  glassSurfaceStrong: withAlpha(appearancePaletteByMode.lightPremium.white, 0.86),
  glassBorder: withAlpha(appearancePaletteByMode.lightPremium.deepBlue, 0.12),
  rimLightSubtle: withAlpha(appearancePaletteByMode.lightPremium.deepBlue, 0.08),
  rimLightStrong: withAlpha(appearancePaletteByMode.lightPremium.deepBlue, 0.16),
  shadowSoftColor: appearancePaletteByMode.lightPremium.deepBlue,
  shadowPremiumColor: appearancePaletteByMode.lightPremium.deepBlue,
} as const satisfies BThwaniAppearanceThemeColors;

export const darkThemeColors = {
  pageBackground: darkTheme.background,
  surfacePrimary: darkTheme.surface,
  surfaceSecondary: darkTheme.surfaceSecondary,
  surfaceRaised: darkTheme.surfaceRaised,
  surfaceInset: darkTheme.surfaceInset,
  textPrimary: darkTheme.text,
  textSecondary: withAlpha(appearancePaletteByMode.darkGlass.offWhite, 0.82),
  textMuted: darkTheme.textMuted,
  borderSubtle: darkTheme.line,
  borderStrong: darkTheme.lineStrong,
  accentBlue: appearancePaletteByMode.darkGlass.deepBlueElevated,
  accentOrange: darkTheme.brand,
  ctaPrimary: appearancePaletteByMode.darkGlass.deepBlueElevated,
  ctaSecondary: withAlpha(appearancePaletteByMode.darkGlass.white, 0.12),
  success: darkTheme.success,
  warning: darkTheme.warning,
  danger: darkTheme.danger,
  info: darkTheme.info,
  overlay: darkTheme.overlay,
  overlaySoft: darkTheme.overlaySoft,
  focusRing: darkTheme.focusRing,
  disabledSurface: darkTheme.disabledSurface,
  disabledInk: darkTheme.disabledText,
  glassSurface: withAlpha(appearancePaletteByMode.darkGlass.white, 0.08),
  glassSurfaceStrong: withAlpha(appearancePaletteByMode.darkGlass.white, 0.14),
  glassBorder: withAlpha(appearancePaletteByMode.darkGlass.white, 0.18),
  rimLightSubtle: withAlpha(appearancePaletteByMode.darkGlass.white, 0.12),
  rimLightStrong: withAlpha(appearancePaletteByMode.darkGlass.white, 0.22),
  shadowSoftColor: appearancePaletteByMode.darkGlass.navyNight,
  shadowPremiumColor: rawColorPalettes.neutral[950],
} as const satisfies BThwaniAppearanceThemeColors;

function createButtonStates(mode: BThwaniAppearanceMode, colors: BThwaniAppearanceThemeColors, palette: BThwaniAppearancePalette) {
  const shadowSoft = createShadow(colors.shadowSoftColor, mode === 'darkGlass' ? 0.18 : 0.08, mode === 'darkGlass' ? 20 : 16, 0, mode === 'darkGlass' ? 8 : 6, mode === 'darkGlass' ? 6 : 4);
  const shadowPremium = createShadow(colors.shadowPremiumColor, mode === 'darkGlass' ? 0.26 : 0.14, mode === 'darkGlass' ? 32 : 28, 0, mode === 'darkGlass' ? 14 : 12, mode === 'darkGlass' ? 12 : 10);

  return {
    primary: {
      default: {
        backgroundColor: colors.ctaPrimary,
        borderColor: colors.ctaPrimary,
        textColor: palette.white,
        iconColor: palette.white,
        shadow: mode === 'darkGlass' ? shadowSoft : undefined,
      },
      pressed: {
        backgroundColor: palette.deepBlueElevated,
        borderColor: palette.deepBlueElevated,
        textColor: palette.white,
        iconColor: palette.white,
        shadow: mode === 'darkGlass' ? shadowSoft : undefined,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    brand: {
      default: {
        backgroundColor: colors.accentOrange,
        borderColor: colors.accentOrange,
        textColor: palette.white,
        iconColor: palette.white,
        shadow: shadowPremium,
      },
      pressed: {
        backgroundColor: palette.orangeSoft,
        borderColor: palette.orangeSoft,
        textColor: palette.white,
        iconColor: palette.white,
        shadow: shadowPremium,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    secondary: {
      default: {
        backgroundColor: colors.surfacePrimary,
        borderColor: colors.borderStrong,
        textColor: colors.textPrimary,
        iconColor: colors.textPrimary,
      },
      pressed: {
        backgroundColor: colors.surfaceInset,
        borderColor: colors.borderStrong,
        textColor: colors.textPrimary,
        iconColor: colors.textPrimary,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    ghost: {
      default: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: mode === 'darkGlass' ? colors.textPrimary : colors.accentBlue,
        iconColor: mode === 'darkGlass' ? colors.textPrimary : colors.accentBlue,
      },
      pressed: {
        backgroundColor: mode === 'darkGlass' ? colors.glassSurface : colors.surfaceInset,
        borderColor: 'transparent',
        textColor: mode === 'darkGlass' ? colors.textPrimary : colors.accentBlue,
        iconColor: mode === 'darkGlass' ? colors.textPrimary : colors.accentBlue,
      },
      disabled: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    danger: {
      default: {
        backgroundColor: colors.danger,
        borderColor: colors.danger,
        textColor: palette.white,
        iconColor: palette.white,
      },
      pressed: {
        backgroundColor: palette.danger,
        borderColor: palette.danger,
        textColor: palette.white,
        iconColor: palette.white,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    success: {
      default: {
        backgroundColor: colors.success,
        borderColor: colors.success,
        textColor: palette.white,
        iconColor: palette.white,
      },
      pressed: {
        backgroundColor: palette.success,
        borderColor: palette.success,
        textColor: palette.white,
        iconColor: palette.white,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    warning: {
      default: {
        backgroundColor: withAlpha(colors.warning, mode === 'darkGlass' ? 0.2 : 0.12),
        borderColor: colors.warning,
        textColor: colors.warning,
        iconColor: colors.warning,
      },
      pressed: {
        backgroundColor: withAlpha(colors.warning, mode === 'darkGlass' ? 0.28 : 0.18),
        borderColor: colors.warning,
        textColor: colors.warning,
        iconColor: colors.warning,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    info: {
      default: {
        backgroundColor: withAlpha(colors.info, mode === 'darkGlass' ? 0.2 : 0.12),
        borderColor: colors.info,
        textColor: colors.info,
        iconColor: colors.info,
      },
      pressed: {
        backgroundColor: withAlpha(colors.info, mode === 'darkGlass' ? 0.28 : 0.18),
        borderColor: colors.info,
        textColor: colors.info,
        iconColor: colors.info,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    default: {
      default: {
        backgroundColor: colors.surfaceInset,
        borderColor: colors.borderSubtle,
        textColor: colors.textMuted,
        iconColor: colors.textMuted,
      },
      pressed: {
        backgroundColor: colors.surfaceSecondary,
        borderColor: colors.borderStrong,
        textColor: colors.textPrimary,
        iconColor: colors.textPrimary,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    glass: {
      default: {
        backgroundColor: colors.glassSurface,
        borderColor: colors.glassBorder,
        textColor: colors.textPrimary,
        iconColor: colors.textPrimary,
        shadow: shadowSoft,
      },
      pressed: {
        backgroundColor: colors.glassSurfaceStrong,
        borderColor: colors.rimLightSubtle,
        textColor: colors.textPrimary,
        iconColor: colors.textPrimary,
        shadow: shadowSoft,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    glassStrong: {
      default: {
        backgroundColor: colors.accentOrange,
        borderColor: mode === 'darkGlass' ? colors.rimLightStrong : colors.accentOrange,
        textColor: palette.white,
        iconColor: palette.white,
        shadow: shadowPremium,
      },
      pressed: {
        backgroundColor: palette.orangeSoft,
        borderColor: mode === 'darkGlass' ? colors.rimLightStrong : palette.orangeSoft,
        textColor: palette.white,
        iconColor: palette.white,
        shadow: shadowPremium,
      },
      disabled: {
        backgroundColor: colors.disabledSurface,
        borderColor: colors.disabledSurface,
        textColor: colors.disabledInk,
        iconColor: colors.disabledInk,
      },
      focusRing: colors.focusRing,
    },
    loadingIndicator: palette.white,
  } as const satisfies BThwaniAppearanceComponentTokens['buttons'];
}

function createComponentTokens(mode: BThwaniAppearanceMode, colors: BThwaniAppearanceThemeColors, palette: BThwaniAppearancePalette): BThwaniAppearanceComponentTokens {
  const shadowSoft = createShadow(colors.shadowSoftColor, mode === 'darkGlass' ? 0.18 : 0.08, mode === 'darkGlass' ? 20 : 16, 0, mode === 'darkGlass' ? 8 : 6, mode === 'darkGlass' ? 6 : 4);
  const shadowPremium = createShadow(colors.shadowPremiumColor, mode === 'darkGlass' ? 0.26 : 0.14, mode === 'darkGlass' ? 32 : 28, 0, mode === 'darkGlass' ? 14 : 12, mode === 'darkGlass' ? 12 : 10);
  const badgeSurfaceSoft = mode === 'darkGlass' ? colors.glassSurface : palette.orangePeach;

  return {
    buttons: createButtonStates(mode, colors, palette),
    badges: {
      neutral: { backgroundColor: colors.surfaceInset, borderColor: colors.borderSubtle, textColor: colors.textMuted, iconColor: colors.textMuted },
      brand: { backgroundColor: badgeSurfaceSoft, borderColor: colors.accentOrange, textColor: colors.accentOrange, iconColor: colors.accentOrange },
      promo: { backgroundColor: withAlpha(colors.accentOrange, mode === 'darkGlass' ? 0.18 : 0.1), borderColor: colors.accentOrange, textColor: colors.accentOrange, iconColor: colors.accentOrange },
      premium: { backgroundColor: mode === 'darkGlass' ? colors.glassSurfaceStrong : colors.surfacePrimary, borderColor: colors.rimLightStrong, textColor: colors.textPrimary, iconColor: colors.textPrimary },
      success: { backgroundColor: withAlpha(colors.success, mode === 'darkGlass' ? 0.16 : 0.1), borderColor: colors.success, textColor: colors.success, iconColor: colors.success },
      warning: { backgroundColor: withAlpha(colors.warning, mode === 'darkGlass' ? 0.16 : 0.1), borderColor: colors.warning, textColor: colors.warning, iconColor: colors.warning },
      danger: { backgroundColor: withAlpha(colors.danger, mode === 'darkGlass' ? 0.16 : 0.1), borderColor: colors.danger, textColor: colors.danger, iconColor: colors.danger },
      info: { backgroundColor: withAlpha(colors.info, mode === 'darkGlass' ? 0.16 : 0.1), borderColor: colors.info, textColor: colors.info, iconColor: colors.info },
    },
    chips: {
      default: { backgroundColor: mode === 'darkGlass' ? colors.glassSurface : colors.surfacePrimary, borderColor: colors.borderSubtle, textColor: colors.textPrimary, iconColor: colors.textPrimary },
      selected: { backgroundColor: withAlpha(colors.accentOrange, mode === 'darkGlass' ? 0.22 : 0.12), borderColor: colors.accentOrange, textColor: mode === 'darkGlass' ? colors.textPrimary : colors.accentOrange, iconColor: mode === 'darkGlass' ? colors.textPrimary : colors.accentOrange },
      glass: { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder, textColor: colors.textPrimary, iconColor: colors.textPrimary },
      glassSelected: { backgroundColor: colors.glassSurfaceStrong, borderColor: colors.rimLightStrong, textColor: colors.textPrimary, iconColor: colors.textPrimary },
    },
    inputs: {
      background: mode === 'darkGlass' ? colors.surfaceInset : colors.surfacePrimary,
      border: colors.borderSubtle,
      focusBorder: colors.accentOrange,
      errorBorder: colors.danger,
      placeholder: colors.textMuted,
      label: colors.textPrimary,
      helper: colors.textMuted,
      disabledSurface: colors.disabledSurface,
      disabledText: colors.disabledInk,
      sectionSurface: mode === 'darkGlass' ? colors.surfaceSecondary : colors.surfaceRaised,
    },
    navigation: {
      headerSurface: mode === 'darkGlass' ? colors.surfaceSecondary : colors.surfacePrimary,
      headerBorder: colors.borderSubtle,
      navSurface: mode === 'darkGlass' ? colors.surfaceSecondary : colors.surfaceRaised,
      navBorder: colors.borderSubtle,
      navActiveBackground: mode === 'darkGlass' ? colors.glassSurfaceStrong : colors.surfaceInset,
      navActiveText: colors.textPrimary,
      navInactiveText: colors.textMuted,
      badgeSurface: mode === 'darkGlass' ? colors.glassSurface : colors.surfaceInset,
      badgeText: colors.textPrimary,
    },
    alerts: {
      info: { backgroundColor: withAlpha(colors.info, mode === 'darkGlass' ? 0.16 : 0.09), borderColor: colors.info, textColor: colors.textPrimary, iconColor: colors.info },
      success: { backgroundColor: withAlpha(colors.success, mode === 'darkGlass' ? 0.16 : 0.09), borderColor: colors.success, textColor: colors.textPrimary, iconColor: colors.success },
      warning: { backgroundColor: withAlpha(colors.warning, mode === 'darkGlass' ? 0.18 : 0.11), borderColor: colors.warning, textColor: colors.textPrimary, iconColor: colors.warning },
      danger: { backgroundColor: withAlpha(colors.danger, mode === 'darkGlass' ? 0.18 : 0.11), borderColor: colors.danger, textColor: colors.textPrimary, iconColor: colors.danger },
      promotion: { backgroundColor: mode === 'darkGlass' ? colors.glassSurfaceStrong : palette.orangePeach, borderColor: colors.rimLightStrong, textColor: colors.textPrimary, iconColor: colors.accentOrange },
      offline: { backgroundColor: mode === 'darkGlass' ? colors.surfaceInset : colors.surfaceSecondary, borderColor: colors.borderStrong, textColor: colors.textSecondary, iconColor: colors.textSecondary },
    },
    lists: {
      rowBackground: colors.surfacePrimary,
      rowPressedBackground: colors.surfaceInset,
      rowSelectedBackground: mode === 'darkGlass' ? colors.glassSurfaceStrong : colors.surfaceSecondary,
      rowDisabledBackground: colors.disabledSurface,
      rowDivider: colors.borderSubtle,
      trailingAction: colors.accentOrange,
      title: colors.textPrimary,
      subtitle: colors.textSecondary,
      meta: colors.textMuted,
    },
    overlays: {
      modalBackdrop: colors.overlay,
      modalSurface: mode === 'darkGlass' ? colors.surfaceRaised : colors.surfacePrimary,
      modalBorder: mode === 'darkGlass' ? colors.glassBorder : colors.borderSubtle,
      sheetSurface: mode === 'darkGlass' ? colors.surfaceRaised : colors.surfacePrimary,
      popoverSurface: mode === 'darkGlass' ? colors.surfaceRaised : colors.surfacePrimary,
      tooltipSurface: mode === 'darkGlass' ? colors.surfaceSecondary : colors.textPrimary,
      tooltipText: mode === 'darkGlass' ? colors.textPrimary : palette.white,
      skeletonBase: mode === 'darkGlass' ? colors.surfaceSecondary : colors.surfaceInset,
      skeletonHighlight: mode === 'darkGlass' ? colors.glassSurfaceStrong : colors.surfacePrimary,
      heroOverlay: colors.overlay,
    },
    commerce: {
      price: colors.textPrimary,
      oldPrice: colors.textMuted,
      discountSurface: withAlpha(colors.danger, mode === 'darkGlass' ? 0.18 : 0.1),
      discountText: colors.danger,
      rating: colors.accentOrange,
      favoriteActive: colors.danger,
      favoriteInactive: colors.textMuted,
      favoriteSurface: mode === 'darkGlass' ? colors.glassSurfaceStrong : colors.surfacePrimary,
      favoriteBorder: mode === 'darkGlass' ? colors.glassBorder : colors.borderStrong,
      cartIndicatorSurface: colors.accentOrange,
      cartIndicatorText: palette.white,
      availabilityOpen: colors.success,
      availabilityClosed: colors.danger,
      promoSurface: mode === 'darkGlass' ? colors.glassSurfaceStrong : palette.orangePeach,
      promoBorder: colors.rimLightStrong,
      imageFrame: mode === 'darkGlass' ? colors.surfaceInset : colors.surfaceInset,
      storeLogoRing: mode === 'darkGlass' ? colors.rimLightStrong : colors.borderSubtle,
      deliverySelectedSurface: colors.accentOrange,
      deliverySelectedBorder: mode === 'darkGlass' ? colors.rimLightStrong : colors.accentOrange,
      deliverySelectedText: palette.white,
      deliveryIdleSurface: mode === 'darkGlass' ? colors.glassSurface : colors.surfacePrimary,
      deliveryIdleBorder: mode === 'darkGlass' ? colors.glassBorder : colors.borderSubtle,
      deliveryIdleText: colors.textPrimary,
      productCard: {
        backgroundColor: colors.surfacePrimary,
        borderColor: mode === 'darkGlass' ? colors.glassBorder : colors.borderSubtle,
        rimLightColor: mode === 'darkGlass' ? colors.rimLightStrong : colors.rimLightSubtle,
        imageBackground: colors.surfaceInset,
        partnerTileBackground: mode === 'darkGlass' ? colors.glassSurfaceStrong : colors.surfacePrimary,
        partnerTileBorder: mode === 'darkGlass' ? colors.glassBorder : colors.borderSubtle,
        partnerTileShadow: shadowSoft,
        titleColor: colors.textPrimary,
        subtitleColor: colors.textMuted,
        priceColor: colors.textPrimary,
        oldPriceColor: colors.textMuted,
        discountSurface: withAlpha(colors.danger, mode === 'darkGlass' ? 0.2 : 0.1),
        discountText: colors.danger,
        categorySurface: mode === 'darkGlass' ? colors.surfaceSecondary : colors.surfaceInset,
        categoryText: colors.textMuted,
        statusDefaultSurface: mode === 'darkGlass' ? colors.glassSurface : colors.surfaceInset,
        statusDefaultText: colors.textMuted,
        statusSuccessSurface: withAlpha(colors.success, mode === 'darkGlass' ? 0.18 : 0.1),
        statusSuccessText: colors.success,
        statusDangerSurface: withAlpha(colors.danger, mode === 'darkGlass' ? 0.18 : 0.1),
        statusDangerText: colors.danger,
        favoriteSurface: mode === 'darkGlass' ? colors.glassSurfaceStrong : colors.surfacePrimary,
        favoriteBorder: mode === 'darkGlass' ? colors.rimLightSubtle : colors.borderStrong,
        favoriteActive: colors.danger,
        favoriteInactive: colors.textMuted,
        actionSurface: colors.accentOrange,
        actionBorder: mode === 'darkGlass' ? colors.rimLightStrong : colors.accentOrange,
        actionIcon: palette.white,
        actionPlusSurface: mode === 'darkGlass' ? colors.surfacePrimary : colors.surfacePrimary,
        actionPlusBorder: mode === 'darkGlass' ? colors.glassBorder : colors.borderStrong,
        actionPlusIcon: colors.textPrimary,
        shadowSoft,
        shadowPremium,
      },
    },
    controlPanel: {
      kpiSurface: mode === 'darkGlass' ? colors.surfaceRaised : colors.surfacePrimary,
      kpiBorder: mode === 'darkGlass' ? colors.glassBorder : colors.borderSubtle,
      chartSurface: mode === 'darkGlass' ? colors.surfaceSecondary : colors.surfacePrimary,
      chartGrid: mode === 'darkGlass' ? withAlpha(palette.white, 0.12) : withAlpha(palette.deepBlue, 0.1),
      chartAxis: colors.textMuted,
      tableHeader: mode === 'darkGlass' ? colors.surfaceInset : colors.surfaceSecondary,
      tableRow: colors.surfacePrimary,
      tableRowHover: mode === 'darkGlass' ? colors.glassSurface : colors.surfaceInset,
      tableRowSelected: mode === 'darkGlass' ? colors.glassSurfaceStrong : colors.surfaceSecondary,
      filterSurface: mode === 'darkGlass' ? colors.surfaceInset : colors.surfacePrimary,
      toolbarSurface: mode === 'darkGlass' ? colors.surfaceSecondary : colors.surfaceRaised,
      warningPanelSurface: withAlpha(colors.warning, mode === 'darkGlass' ? 0.14 : 0.09),
      warningPanelBorder: colors.warning,
      auditIndicator: colors.accentOrange,
    },
    dataViz: {
      series: mode === 'darkGlass'
        ? [colors.accentOrange, colors.info, colors.success, colors.warning]
        : [colors.accentBlue, colors.accentOrange, colors.success, colors.warning],
      grid: mode === 'darkGlass' ? withAlpha(palette.white, 0.1) : withAlpha(palette.deepBlue, 0.08),
      axis: colors.textMuted,
      positive: colors.success,
      negative: colors.danger,
      warning: colors.warning,
    },
  };
}

const appearanceThemeColorsByMode = {
  lightPremium: lightThemeColors,
  darkGlass: darkThemeColors,
} as const satisfies Record<BThwaniAppearanceMode, BThwaniAppearanceThemeColors>;

const appearanceComponentTokensByMode = {
  lightPremium: createComponentTokens('lightPremium', lightThemeColors, appearancePaletteByMode.lightPremium),
  darkGlass: createComponentTokens('darkGlass', darkThemeColors, appearancePaletteByMode.darkGlass),
} as const satisfies Record<BThwaniAppearanceMode, BThwaniAppearanceComponentTokens>;

const appearanceTokensByMode = {
  lightPremium: {
    mode: 'lightPremium',
    themeMode: 'light',
    isDark: false,
    palette: appearancePaletteByMode.lightPremium,
    colors: lightThemeColors,
    components: appearanceComponentTokensByMode.lightPremium,
    appBackground: lightThemeColors.pageBackground,
    appBackgroundElevated: lightThemeColors.surfaceRaised,
    surface: lightThemeColors.surfacePrimary,
    surfaceRaised: lightThemeColors.surfaceRaised,
    surfaceMuted: lightThemeColors.surfaceInset,
    textPrimary: lightThemeColors.textPrimary,
    textSecondary: lightThemeColors.textSecondary,
    textMuted: lightThemeColors.textMuted,
    border: lightThemeColors.borderSubtle,
    borderStrong: lightThemeColors.borderStrong,
    accent: lightThemeColors.accentOrange,
    accentMuted: withAlpha(lightThemeColors.accentOrange, 0.14),
    success: lightThemeColors.success,
    warning: lightThemeColors.warning,
    danger: lightThemeColors.danger,
    glassSurface: lightThemeColors.glassSurface,
    glassSurfaceStrong: lightThemeColors.glassSurfaceStrong,
    glassBorder: lightThemeColors.glassBorder,
    glassText: lightThemeColors.textPrimary,
    glassMutedText: lightThemeColors.textMuted,
    heroOverlay: lightThemeColors.overlaySoft,
    heroOverlayStrong: lightThemeColors.overlay,
    chipBackground: lightThemeColors.surfacePrimary,
    chipSelectedBackground: withAlpha(lightThemeColors.accentOrange, 0.12),
    actionBackground: lightThemeColors.surfacePrimary,
    actionSelectedBackground: lightThemeColors.accentOrange,
    productCardBackground: lightThemeColors.surfacePrimary,
    promoCardBackground: withAlpha(lightThemeColors.accentOrange, 0.08),
    shadowSoft: appearanceComponentTokensByMode.lightPremium.commerce.productCard.shadowSoft,
    shadowPremium: appearanceComponentTokensByMode.lightPremium.commerce.productCard.shadowPremium,
  },
  darkGlass: {
    mode: 'darkGlass',
    themeMode: 'dark',
    isDark: true,
    palette: appearancePaletteByMode.darkGlass,
    colors: darkThemeColors,
    components: appearanceComponentTokensByMode.darkGlass,
    appBackground: darkThemeColors.pageBackground,
    appBackgroundElevated: darkThemeColors.surfaceRaised,
    surface: darkThemeColors.surfacePrimary,
    surfaceRaised: darkThemeColors.surfaceRaised,
    surfaceMuted: darkThemeColors.surfaceInset,
    textPrimary: darkThemeColors.textPrimary,
    textSecondary: darkThemeColors.textSecondary,
    textMuted: darkThemeColors.textMuted,
    border: darkThemeColors.borderSubtle,
    borderStrong: darkThemeColors.borderStrong,
    accent: darkThemeColors.accentOrange,
    accentMuted: withAlpha(darkThemeColors.accentOrange, 0.22),
    success: darkThemeColors.success,
    warning: darkThemeColors.warning,
    danger: darkThemeColors.danger,
    glassSurface: darkThemeColors.glassSurface,
    glassSurfaceStrong: darkThemeColors.glassSurfaceStrong,
    glassBorder: darkThemeColors.glassBorder,
    glassText: darkThemeColors.textPrimary,
    glassMutedText: darkThemeColors.textMuted,
    heroOverlay: darkThemeColors.overlaySoft,
    heroOverlayStrong: darkThemeColors.overlay,
    chipBackground: darkThemeColors.glassSurface,
    chipSelectedBackground: withAlpha(darkThemeColors.accentOrange, 0.18),
    actionBackground: darkThemeColors.glassSurfaceStrong,
    actionSelectedBackground: darkThemeColors.accentOrange,
    productCardBackground: appearanceComponentTokensByMode.darkGlass.commerce.productCard.backgroundColor,
    promoCardBackground: withAlpha(darkThemeColors.accentOrange, 0.12),
    shadowSoft: appearanceComponentTokensByMode.darkGlass.commerce.productCard.shadowSoft,
    shadowPremium: appearanceComponentTokensByMode.darkGlass.commerce.productCard.shadowPremium,
  },
} as const satisfies Record<BThwaniAppearanceMode, BThwaniAppearanceTokens>;

export const bthwaniAppearancePaletteByMode = Object.freeze(appearancePaletteByMode);
export const bthwaniAppearanceThemeColorsByMode = Object.freeze(appearanceThemeColorsByMode);
export const bthwaniAppearanceComponentTokensByMode = Object.freeze(appearanceComponentTokensByMode);
export const bthwaniAppearanceTokensByMode = Object.freeze(appearanceTokensByMode);

export function getBThwaniAppearanceTokens(mode: BThwaniAppearanceMode = defaultBThwaniAppearanceMode) {
  const resolvedMode =
    mode === 'lightPremium' || mode === 'darkGlass'
      ? mode
      : mode === 'light'
        ? 'lightPremium'
        : mode === 'dark'
          ? 'darkGlass'
          : defaultBThwaniAppearanceMode;
  return bthwaniAppearanceTokensByMode[resolvedMode];
}

export function getBThwaniAppearanceThemeMode(mode: BThwaniAppearanceMode) {
  return getBThwaniAppearanceTokens(mode).themeMode;
}

export function resolveBThwaniAppearanceMode(themeMode: ThemeMode): BThwaniAppearanceMode {
  return themeMode === 'dark' || themeMode === 'high-contrast' ? 'darkGlass' : 'lightPremium';
}

export function getBThwaniGlassRecipe(mode: BThwaniAppearanceMode, role: BThwaniGlassRole): BThwaniGlassRecipe {
  const tokens = getBThwaniAppearanceTokens(mode);

  if (role === 'surfaceStrong') {
    return {
      backgroundColor: tokens.glassSurfaceStrong,
      borderColor: tokens.glassBorder,
      textColor: tokens.glassText,
      mutedTextColor: tokens.glassMutedText,
    };
  }

  if (role === 'heroOverlay') {
    return {
      backgroundColor: tokens.heroOverlayStrong,
      borderColor: tokens.glassBorder,
      textColor: tokens.glassText,
      mutedTextColor: tokens.glassMutedText,
    };
  }

  return {
    backgroundColor: tokens.glassSurface,
    borderColor: tokens.glassBorder,
    textColor: tokens.glassText,
    mutedTextColor: tokens.glassMutedText,
  };
}
