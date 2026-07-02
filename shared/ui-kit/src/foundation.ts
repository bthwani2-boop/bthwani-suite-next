import { uiKitLocales } from './locales';
import { colorRoles } from './tokens/colors';

export const tokenSourceMetadata = {
	authorityPackage: '@bthwani/ui-kit',
	authorityFile: 'src/foundation.ts',
	format: 'bth-token-source.v1',
	version: '2026.04.23',
	stage: 'phase-c-hardening'
} as const;

export const rawColorPalettes = {
	neutral: {
		0: colorRoles.surfaceBase,
		50: colorRoles.surfaceBase,
		100: colorRoles.surfaceBase,
		200: colorRoles.surfaceBase,
		300: colorRoles.surfaceBase,
		400: colorRoles.surfaceBase,
		500: colorRoles.brandStructure,
		600: colorRoles.brandStructure,
		700: colorRoles.brandStructure,
		800: colorRoles.brandStructure,
		900: colorRoles.brandStructure,
		950: colorRoles.brandStructure
	},
	brand: {
		50: colorRoles.surfaceBase,
		100: colorRoles.surfaceBase,
		500: colorRoles.brandAction,
		600: colorRoles.brandStructure,
		700: colorRoles.brandStructure
	},
	success: {
		50: colorRoles.surfaceBase,
		100: colorRoles.surfaceBase,
		600: colorRoles.brandStructure,
		700: colorRoles.brandStructure
	},
	warning: {
		50: colorRoles.surfaceBase,
		100: colorRoles.surfaceBase,
		600: colorRoles.brandAction,
		700: colorRoles.brandAction
	},
	danger: {
		50: colorRoles.surfaceBase,
		100: colorRoles.surfaceBase,
		600: colorRoles.brandAction,
		700: colorRoles.brandAction
	},
	info: {
		50: colorRoles.surfaceBase,
		100: colorRoles.surfaceBase,
		600: colorRoles.brandStructure,
		700: colorRoles.brandStructure
	}
} as const;

export const appearanceModeRawPalettes = {
	lightPremium: {
		deepBlue: colorRoles.brandStructure,
		deepBlueElevated: colorRoles.brandStructure,
		orange: colorRoles.brandAction,
		orangeSoft: colorRoles.brandAction,
		orangePeach: colorRoles.surfaceBase,
		white: colorRoles.surfaceBase,
		offWhite: colorRoles.surfaceBase,
		warmWhite: colorRoles.surfaceBase,
		warmSurface: colorRoles.surfaceBase,
		warmSurfaceElevated: colorRoles.surfaceBase,
		navyNight: colorRoles.brandStructure,
		navyNightElevated: colorRoles.brandStructure,
		navySurface: colorRoles.brandStructure,
		navySurfaceRaised: colorRoles.brandStructure,
		inkMuted: colorRoles.brandStructure,
		inkSoft: colorRoles.surfaceBase,
		success: colorRoles.brandStructure,
		warning: colorRoles.brandAction,
		danger: colorRoles.brandAction,
		info: colorRoles.brandStructure,
	},
	darkGlass: {
		deepBlue: colorRoles.brandStructure,
		deepBlueElevated: colorRoles.brandStructure,
		orange: colorRoles.brandAction,
		orangeSoft: colorRoles.brandAction,
		orangePeach: colorRoles.brandStructure,
		white: colorRoles.surfaceBase,
		offWhite: colorRoles.surfaceBase,
		warmWhite: colorRoles.surfaceBase,
		warmSurface: colorRoles.brandStructure,
		warmSurfaceElevated: colorRoles.brandStructure,
		navyNight: colorRoles.brandStructure,
		navyNightElevated: colorRoles.brandStructure,
		navySurface: colorRoles.brandStructure,
		navySurfaceRaised: colorRoles.brandStructure,
		inkMuted: colorRoles.surfaceBase,
		inkSoft: colorRoles.brandStructure,
		success: colorRoles.brandStructure,
		warning: colorRoles.brandAction,
		danger: colorRoles.brandAction,
		info: colorRoles.surfaceBase,
	},
} as const;

export const brandColorRoles = {
	brand: rawColorPalettes.brand[500],
	brandStrong: rawColorPalettes.brand[600],
	brandSurface: rawColorPalettes.brand[100],
	brandSoft: rawColorPalettes.brand[50]
} as const;

export const surfaceContainerRoles = {
	background: rawColorPalettes.neutral[50],
	backgroundAlt: rawColorPalettes.neutral[0],
	surface: rawColorPalettes.neutral[0],
	surfaceRaised: rawColorPalettes.neutral[0],
	surfaceInset: rawColorPalettes.neutral[100],
	line: rawColorPalettes.neutral[200],
	lineStrong: rawColorPalettes.neutral[300],
	disabledSurface: rawColorPalettes.neutral[100]
} as const;

export function withAlpha(hex: string, alpha: number) {
	const normalized = hex.replace('#', '');
	const offset = normalized.length === 3 ? 1 : 2;
	const values = normalized.length === 3
		? normalized.split('').map((value) => parseInt(`${value}${value}`, 16))
		: [0, 1, 2].map((index) => parseInt(normalized.slice(index * offset, index * offset + offset), 16));

	return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
}

export const semanticColorRoles = {
	brand: brandColorRoles.brand,
	brandStrong: brandColorRoles.brandStrong,
	brandSoft: brandColorRoles.brandSoft,
	brandSurface: brandColorRoles.brandSurface,
	pageBackground: colorRoles.surfaceBase,
	surfacePrimary: rawColorPalettes.neutral[0],
	surfaceSecondary: colorRoles.surfaceBase,
	borderSubtle: withAlpha(rawColorPalettes.brand[600], 0.1),
	borderStrong: withAlpha(rawColorPalettes.brand[600], 0.18),
	textPrimary: rawColorPalettes.brand[600],
	textSecondary: colorRoles.brandStructure,
	textMuted: colorRoles.brandStructure,
	accentBlue: brandColorRoles.brandStrong,
	accentOrange: brandColorRoles.brand,
	ctaPrimary: brandColorRoles.brandStrong,
	ctaSecondary: rawColorPalettes.neutral[0],
	ink: rawColorPalettes.brand[600],
	inkMuted: colorRoles.brandStructure,
	inkSoft: colorRoles.surfaceBase,
	line: rawColorPalettes.neutral[200],
	lineStrong: withAlpha(rawColorPalettes.brand[600], 0.18),
	surface: rawColorPalettes.neutral[0],
	surfaceAlt: colorRoles.surfaceBase,
	surfaceInset: colorRoles.surfaceBase,
	surfaceRaised: colorRoles.surfaceBase,
	success: colorRoles.brandStructure,
	successStrong: colorRoles.brandStructure,
	successSoft: withAlpha(colorRoles.brandStructure, 0.1),
	warning: colorRoles.brandAction,
	warningStrong: colorRoles.brandAction,
	warningSoft: withAlpha(colorRoles.brandAction, 0.1),
	danger: colorRoles.brandAction,
	dangerStrong: colorRoles.brandAction,
	dangerSoft: withAlpha(colorRoles.brandAction, 0.1),
	info: colorRoles.brandStructure,
	infoStrong: colorRoles.brandStructure,
	infoSoft: withAlpha(colorRoles.brandStructure, 0.1),
	overlay: withAlpha(rawColorPalettes.brand[600], 0.22),
	overlaySoft: withAlpha(rawColorPalettes.brand[600], 0.1),
	focusRing: withAlpha(rawColorPalettes.brand[500], 0.3),
	disabledSurface: colorRoles.surfaceBase,
	disabledInk: colorRoles.surfaceBase,
	glassSurface: withAlpha(rawColorPalettes.neutral[0], 0.72),
	glassSurfaceStrong: withAlpha(rawColorPalettes.neutral[0], 0.86),
	glassBorder: withAlpha(rawColorPalettes.brand[600], 0.12),
	rimLightSubtle: withAlpha(rawColorPalettes.brand[600], 0.08),
	rimLightStrong: withAlpha(rawColorPalettes.brand[600], 0.16),
	black: rawColorPalettes.neutral[950],
	white: rawColorPalettes.neutral[0]
} as const;

export const rawSpacingScale = {
	0: 0,
	1: 4,
	2: 8,
	3: 12,
	4: 16,
	5: 20,
	6: 24,
	8: 32,
	10: 40,
	12: 48,
	14: 56,
	16: 64
} as const;

export const rawRadiusScale = {
	none: 0,
	xxs: 4,
	xs: 6,
	xs2: 8,
	sm: 10,
	sm2: 12,
	md: 14,
	md2: 16,
	lg: 18,
	lg2: 20,
	xl: 24,
	pill: 999
} as const;

export const rawElevationScale = {
	flat: 0,
	raised: 1,
	overlay: 2,
	floating: 3
} as const;

export const shadowPresets = {
	flat: undefined,
	raised: {
		shadowColor: colorRoles.brandStructure,
		shadowOpacity: 0.06,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2
	},
	overlay: {
		shadowColor: colorRoles.brandStructure,
		shadowOpacity: 0.08,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6
	},
	floating: {
		shadowColor: colorRoles.brandStructure,
		shadowOpacity: 0.12,
		shadowRadius: 28,
		shadowOffset: { width: 0, height: 10 },
		elevation: 10
	}
} as const;

export const shadowLaw = shadowPresets;

export const rawMotionScale = {
	instant: 0,
	quick: 120,
	standard: 180,
	calm: 240,
	emphasized: 320
} as const;

export const rawSizingScale = {
	controlSm: 36,
	controlMd: 44,
	controlLg: 52,
	iconSm: 16,
	iconMd: 20,
	iconLg: 24,
	avatarSm: 28,
	avatarMd: 40,
	avatarLg: 56
} as const;

export const rawBreakpointScale = {
	xs: 0,
	sm: 480,
	md: 768,
	lg: 1024,
	xl: 1280,
	wide: 1440
} as const;

export const rawSafeAreaScale = {
	none: 0,
	compact: 8,
	comfortable: 16,
	spacious: 24
} as const;

export const rawZIndexScale = {
	base: 0,
	dropdown: 100,
	sticky: 200,
	overlay: 300,
	modal: 400,
	toast: 500
} as const;

export const rawOpacityScale = {
	disabled: 0.48,
	pressed: 0.9,
	subtle: 0.72,
	overlay: 0.4
} as const;

export const rawBorderScale = {
	none: 0,
	hairline: 1,
	strong: 2
} as const;

export const rawTypographyScale = {
	fontFamilies: {
		arabic: 'System',
		latin: 'System',
		display: 'System',
		mono: 'monospace'
	},
	fontWeights: {
		regular: '400',
		medium: '500',
		semibold: '600',
		bold: '700',
		black: '800'
	},
	letterSpacings: {
		tighter: -0.8,
		tight: -0.4,
		normal: 0,
		wide: 0.2,
		wider: 0.4
	},
	textRoles: {
		displayXl: { fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -0.8 },
		displayLg: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.4 },
		hero: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
		titleXl: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
		titleLg: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 },
		titleMd: { fontSize: 20, lineHeight: 27, fontWeight: '600', letterSpacing: 0 },
		titleSm: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: 0 },
		bodyLg: { fontSize: 17, lineHeight: 26, fontWeight: '400', letterSpacing: 0 },
		bodyMd: { fontSize: 15, lineHeight: 23, fontWeight: '400', letterSpacing: 0 },
		bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
		bodyStrong: { fontSize: 15, lineHeight: 23, fontWeight: '600', letterSpacing: 0 },
		labelLg: { fontSize: 14, lineHeight: 18, fontWeight: '600', letterSpacing: 0.2 },
		labelMd: { fontSize: 13, lineHeight: 17, fontWeight: '600', letterSpacing: 0.2 },
		label: { fontSize: 13, lineHeight: 17, fontWeight: '600', letterSpacing: 0.2 },
		caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.2 },
		overline: { fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' as const },
		headingSm: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: 0 },
		code: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0 }
	}
} as const;

export const typographyRoles = rawTypographyScale.textRoles;

export type PaletteKey = keyof typeof colorPalette;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type ElevationToken = keyof typeof elevation;
export type MotionToken = keyof typeof motion;
export type BreakpointToken = keyof typeof breakpoints;
export type SafeAreaToken = keyof typeof safeArea;
export type BorderToken = keyof typeof borders;
export type TextRole = keyof typeof textRoles;
export type FontFamilyToken = keyof typeof fontFamilies;
export type FontWeightToken = keyof typeof fontWeights;
export type Direction = 'rtl' | 'ltr';
export type Language = 'ar' | 'en' | string;
export type LogicalTextAlign = 'start' | 'center' | 'end';

export const neutralPalette = rawColorPalettes.neutral;
export const brandPalette = rawColorPalettes.brand;
export const successPalette = rawColorPalettes.success;
export const warningPalette = rawColorPalettes.warning;
export const dangerPalette = rawColorPalettes.danger;
export const infoPalette = rawColorPalettes.info;

export const colorPalette = semanticColorRoles;
export const spacing = rawSpacingScale;
export const radius = rawRadiusScale;
export const elevation = rawElevationScale;
export const shadowByElevation = shadowPresets;
export const motion = rawMotionScale;
export const sizes = rawSizingScale;
export const breakpoints = rawBreakpointScale;
export const safeArea = rawSafeAreaScale;
export const zIndex = rawZIndexScale;
export const opacities = rawOpacityScale;
export const borders = rawBorderScale;
export const fontFamilies = rawTypographyScale.fontFamilies;
export const fontWeights = rawTypographyScale.fontWeights;
export const letterSpacings = rawTypographyScale.letterSpacings;
export const textRoles = rawTypographyScale.textRoles;

export function resolveFontFamily(direction: Direction, family: FontFamilyToken = 'latin') {
	if (family === 'mono') {
		return fontFamilies.mono;
	}

	if (family === 'display') {
		return fontFamilies.display;
	}

	return direction === 'rtl' ? fontFamilies.arabic : fontFamilies.latin;
}

export function resolveTextRole(role: TextRole) {
	return textRoles[role];
}

export const directionConfig = {
	defaultDirection: 'rtl' as Direction,
	defaultLanguage: 'ar',
	languageStorageKey: 'bth-language',
	supportedDirections: ['rtl', 'ltr'] as const,
	rtlLanguages: ['ar', 'fa', 'he', 'ur'] as const,
	logicalStartEnd: true,
	mirroredDirectionalIcons: true
};

export function isRtl(direction: Direction) {
	return direction === 'rtl';
}

export function isRtlLanguage(language?: Language) {
	if (!language) {
		return directionConfig.defaultDirection === 'rtl';
	}

	const normalized = language.toLowerCase();
	return directionConfig.rtlLanguages.some((candidate) => normalized === candidate || normalized.startsWith(`${candidate}-`));
}

export function resolveDirectionFromLanguage(language?: Language, fallback: Direction = directionConfig.defaultDirection) {
	if (!language) {
		return fallback;
	}

	return isRtlLanguage(language) ? 'rtl' : 'ltr';
}

export function resolveLogicalInsets(direction: Direction, start: number, end: number, property: 'padding' | 'margin' = 'padding') {
	if (property === 'margin') {
		return isRtl(direction)
			? { marginRight: start, marginLeft: end }
			: { marginLeft: start, marginRight: end };
	}

	return isRtl(direction)
		? { paddingRight: start, paddingLeft: end }
		: { paddingLeft: start, paddingRight: end };
}

export function resolveLogicalPadding(direction: Direction, start: number, end: number) {
	return resolveLogicalInsets(direction, start, end, 'padding');
}

export function resolveLogicalMargin(direction: Direction, start: number, end: number) {
	return resolveLogicalInsets(direction, start, end, 'margin');
}

export function resolveLogicalBorderRadius(direction: Direction, start: number, end: number) {
	return isRtl(direction)
		? {
				borderTopRightRadius: start,
				borderBottomRightRadius: start,
				borderTopLeftRadius: end,
				borderBottomLeftRadius: end
			}
		: {
				borderTopLeftRadius: start,
				borderBottomLeftRadius: start,
				borderTopRightRadius: end,
				borderBottomRightRadius: end
			};
}

export function resolveTextAlign(direction: Direction, align: LogicalTextAlign = 'start') {
	if (align === 'center') return 'center';
	if (align === 'start') return isRtl(direction) ? 'right' : 'left';
	return isRtl(direction) ? 'left' : 'right';
}

export function resolveRowDirection(direction: Direction, reversed = false) {
	const baseDirection = isRtl(direction) ? 'row-reverse' : 'row';

	if (!reversed) {
		return baseDirection;
	}

	return baseDirection === 'row' ? 'row-reverse' : 'row';
}

export type CssVariableMap = Record<string, string>;

function toKebabCase(value: string) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[_\s]+/g, '-')
		.toLowerCase();
}

function toPixel(value: number) {
	return value === 0 ? '0' : `${value}px`;
}

function toMilliseconds(value: number) {
	return value === 0 ? '0ms' : `${value}ms`;
}

function appendVariables(target: CssVariableMap, entries: Record<string, string>) {
	for (const [name, value] of Object.entries(entries)) {
		target[name] = value;
	}
}

function createPrefixedAliasVariables(
	variables: CssVariableMap,
	canonicalPrefix: string,
	aliasPrefix: string,
) {
	const aliases: CssVariableMap = {};

	for (const name of Object.keys(variables)) {
		if (!name.startsWith(canonicalPrefix)) {
			continue;
		}

		aliases[name.replace(canonicalPrefix, aliasPrefix)] = `var(${name})`;
	}

	return aliases;
}

function createPaletteCssVariables() {
	const variables: CssVariableMap = {};

	for (const [paletteName, paletteValues] of Object.entries(rawColorPalettes)) {
		for (const [tokenName, tokenValue] of Object.entries(paletteValues)) {
			variables[`--bthwani-palette-${toKebabCase(paletteName)}-${tokenName}`] = tokenValue;
		}
	}

	for (const [semanticRole, tokenValue] of Object.entries(semanticColorRoles)) {
		variables[`--bthwani-color-${toKebabCase(semanticRole)}`] = tokenValue;
	}

	appendVariables(variables, createPrefixedAliasVariables(variables, '--bthwani-', '--bth-'));
	appendVariables(variables, createPrefixedAliasVariables(variables, '--bthwani-', '--ui-'));

	return variables;
}

function createScaleCssVariables(prefix: string, values: Record<string, number>, formatter: (value: number) => string) {
	const variables: CssVariableMap = {};

	for (const [tokenName, tokenValue] of Object.entries(values)) {
		variables[`--bth-${prefix}-${toKebabCase(tokenName)}`] = formatter(tokenValue);
	}

	return variables;
}

function createTypographyCssVariables() {
	const variables: CssVariableMap = {};

	for (const [familyName, familyValue] of Object.entries(rawTypographyScale.fontFamilies)) {
		variables[`--bth-font-family-${toKebabCase(familyName)}`] = familyValue;
	}

	for (const [weightName, weightValue] of Object.entries(rawTypographyScale.fontWeights)) {
		variables[`--bth-font-weight-${toKebabCase(weightName)}`] = weightValue;
	}

	for (const [spacingName, spacingValue] of Object.entries(rawTypographyScale.letterSpacings)) {
		variables[`--bth-letter-spacing-${toKebabCase(spacingName)}`] = `${spacingValue}px`;
	}

	for (const [roleName, roleValues] of Object.entries(rawTypographyScale.textRoles)) {
		for (const [propertyName, propertyValue] of Object.entries(roleValues)) {
			const variableName = `--bth-text-role-${toKebabCase(roleName)}-${toKebabCase(propertyName)}`;

			if (typeof propertyValue === 'number') {
				variables[variableName] = `${propertyValue}px`;
			} else {
				variables[variableName] = String(propertyValue);
			}
		}
	}

	return variables;
}

export function createTokenCssVariables() {
	const variables: CssVariableMap = {};

	appendVariables(variables, createPaletteCssVariables());
	appendVariables(variables, createScaleCssVariables('spacing', rawSpacingScale, toPixel));
	appendVariables(variables, createScaleCssVariables('radius', rawRadiusScale, toPixel));
	appendVariables(variables, createScaleCssVariables('size', rawSizingScale, toPixel));
	appendVariables(variables, createScaleCssVariables('breakpoint', rawBreakpointScale, toPixel));
	appendVariables(variables, createScaleCssVariables('safe-area', rawSafeAreaScale, toPixel));
	appendVariables(variables, createScaleCssVariables('motion', rawMotionScale, toMilliseconds));
	appendVariables(variables, createScaleCssVariables('border', rawBorderScale, toPixel));
	appendVariables(variables, createScaleCssVariables('z-index', rawZIndexScale, String));
	appendVariables(variables, createScaleCssVariables('opacity', rawOpacityScale, String));
	appendVariables(variables, createScaleCssVariables('elevation', rawElevationScale, String));
	appendVariables(variables, createTypographyCssVariables());

	// Add UI-prefixed alias variables that reference the canonical --bth-* tokens.
	const uiAliasEntries: CssVariableMap = {};
	for (const [name, value] of Object.entries(variables)) {
		if (name.startsWith('--bth-')) {
			uiAliasEntries[name.replace('--bth-', '--ui-')] = `var(${name})`;
		}
	}
	appendVariables(variables, uiAliasEntries);

	return variables;
}

export function createTokenCssDeclarations() {
	return Object.entries(createTokenCssVariables())
		.map(([variableName, variableValue]) => `  ${variableName}: ${variableValue};`)
		.join('\n');
}

export function createTokenCssBlock(selector = ':root') {
	return `${selector} {\n${createTokenCssDeclarations()}\n}`;
}

export function createNativeTokenOutput() {
	return {
		metadata: tokenSourceMetadata,
		colors: {
			raw: rawColorPalettes,
			semantic: semanticColorRoles
		},
		spacing: rawSpacingScale,
		radius: rawRadiusScale,
		elevation: rawElevationScale,
		motion: rawMotionScale,
		sizing: rawSizingScale,
		breakpoints: rawBreakpointScale,
		safeArea: rawSafeAreaScale,
		borders: rawBorderScale,
		zIndex: rawZIndexScale,
		opacity: rawOpacityScale,
		typography: rawTypographyScale
	};
}

export const tokenCssVariables = createTokenCssVariables();
export const nativeTokenOutput = createNativeTokenOutput();

export type ThemeMode = 'light' | 'dark' | 'high-contrast';

export type SemanticTheme = {
	mode: ThemeMode;
	background: string;
	backgroundAlt: string;
	surface: string;
	surfaceRaised: string;
	surfaceInset: string;
	surfaceSecondary: string;
	line: string;
	lineStrong: string;
	text: string;
	textMuted: string;
	textSoft: string;
	textInverse: string;
	brand: string;
	brandContrast: string;
	brandSurface: string;
	brandHeaderBackground: string;
	brandHeaderSurface: string;
	brandHeaderSurfaceStrong: string;
	brandHeaderStroke: string;
	brandHeaderStatusBar: string;
	success: string;
	successSurface: string;
	successText: string;
	warning: string;
	warningSurface: string;
	warningText: string;
	danger: string;
	dangerSurface: string;
	dangerText: string;
	info: string;
	infoSurface: string;
	infoText: string;
	focusRing: string;
	overlay: string;
	overlaySoft: string;
	disabledSurface: string;
	disabledText: string;
	fieldBackground: string;
	fieldBorder: string;
	fieldBorderActive: string;
	fieldPlaceholder: string;
};

export const lightTheme: SemanticTheme = {
	mode: 'light',
	background: colorPalette.pageBackground,
	backgroundAlt: colorPalette.surface,
	surface: colorPalette.surface,
	surfaceRaised: colorPalette.surfaceRaised,
	surfaceInset: colorPalette.surfaceInset,
	surfaceSecondary: colorPalette.surfaceSecondary,
	line: colorPalette.borderSubtle,
	lineStrong: colorPalette.borderStrong,
	text: colorPalette.textPrimary,
	textMuted: colorPalette.textMuted,
	textSoft: colorPalette.inkSoft,
	textInverse: colorPalette.white,
	brand: colorPalette.accentOrange,
	brandContrast: colorPalette.white,
	brandSurface: brandColorRoles.brandSurface,
	brandHeaderBackground: colorPalette.accentBlue,
	brandHeaderSurface: withAlpha(colorPalette.white, 0.08),
	brandHeaderSurfaceStrong: withAlpha(colorPalette.white, 0.14),
	brandHeaderStroke: withAlpha(colorPalette.white, 0.16),
	brandHeaderStatusBar: colorPalette.accentBlue,
	success: colorPalette.success,
	successSurface: colorPalette.successSoft,
	successText: colorPalette.successStrong,
	warning: colorPalette.warning,
	warningSurface: colorPalette.warningSoft,
	warningText: colorPalette.warningStrong,
	danger: colorPalette.danger,
	dangerSurface: colorPalette.dangerSoft,
	dangerText: colorPalette.dangerStrong,
	info: colorPalette.info,
	infoSurface: colorPalette.infoSoft,
	infoText: colorPalette.infoStrong,
	focusRing: colorPalette.focusRing,
	overlay: colorPalette.overlay,
	overlaySoft: colorPalette.overlaySoft,
	disabledSurface: colorPalette.disabledSurface,
	disabledText: colorPalette.disabledInk,
	fieldBackground: colorPalette.surface,
	fieldBorder: colorPalette.borderSubtle,
	fieldBorderActive: colorPalette.accentOrange,
	fieldPlaceholder: colorPalette.inkSoft
};

export const darkTheme: SemanticTheme = {
	mode: 'dark',
	background: colorRoles.brandStructure,
	backgroundAlt: colorRoles.brandStructure,
	surface: colorRoles.brandStructure,
	surfaceRaised: colorRoles.brandStructure,
	surfaceInset: colorRoles.brandStructure,
	surfaceSecondary: colorRoles.brandStructure,
	line: withAlpha(colorRoles.surfaceBase, 0.1),
	lineStrong: withAlpha(colorRoles.surfaceBase, 0.2),
	text: colorRoles.surfaceBase,
	textMuted: withAlpha(colorRoles.surfaceBase, 0.62),
	textSoft: colorRoles.brandStructure,
	textInverse: colorPalette.ink,
	brand: colorRoles.brandAction,
	brandContrast: colorRoles.surfaceBase,
	brandSurface: withAlpha(colorRoles.brandAction, 0.18),
	brandHeaderBackground: colorRoles.brandStructure,
	brandHeaderSurface: withAlpha(colorRoles.surfaceBase, 0.08),
	brandHeaderSurfaceStrong: withAlpha(colorRoles.surfaceBase, 0.14),
	brandHeaderStroke: withAlpha(colorRoles.surfaceBase, 0.18),
	brandHeaderStatusBar: colorRoles.brandStructure,
	success: colorRoles.brandStructure,
	successSurface: withAlpha(colorRoles.brandStructure, 0.16),
	successText: colorRoles.surfaceBase,
	warning: colorRoles.brandAction,
	warningSurface: withAlpha(colorRoles.brandAction, 0.16),
	warningText: colorRoles.surfaceBase,
	danger: colorRoles.brandAction,
	dangerSurface: withAlpha(colorRoles.brandAction, 0.16),
	dangerText: colorRoles.surfaceBase,
	info: colorRoles.surfaceBase,
	infoSurface: withAlpha(colorRoles.surfaceBase, 0.16),
	infoText: colorRoles.surfaceBase,
	focusRing: withAlpha(colorRoles.brandAction, 0.36),
	overlay: withAlpha(colorRoles.brandStructure, 0.68),
	overlaySoft: withAlpha(colorRoles.brandStructure, 0.42),
	disabledSurface: withAlpha(colorRoles.surfaceBase, 0.08),
	disabledText: withAlpha(colorRoles.surfaceBase, 0.36),
	fieldBackground: colorRoles.brandStructure,
	fieldBorder: withAlpha(colorRoles.surfaceBase, 0.1),
	fieldBorderActive: colorRoles.brandAction,
	fieldPlaceholder: colorRoles.brandStructure
};

export const highContrastTheme: SemanticTheme = {
	mode: 'high-contrast',
	background: colorRoles.brandStructure,
	backgroundAlt: colorRoles.brandStructure,
	surface: colorRoles.brandStructure,
	surfaceRaised: colorRoles.brandStructure,
	surfaceInset: colorRoles.brandStructure,
	surfaceSecondary: withAlpha(colorRoles.brandAction, 0.18),
	line: colorRoles.surfaceBase,
	lineStrong: colorRoles.surfaceBase,
	text: colorRoles.surfaceBase,
	textMuted: colorRoles.surfaceBase,
	textSoft: colorRoles.surfaceBase,
	textInverse: colorRoles.brandStructure,
	brand: colorRoles.brandAction,
	brandContrast: colorRoles.brandStructure,
	brandSurface: colorRoles.brandAction,
	brandHeaderBackground: colorRoles.brandAction,
	brandHeaderSurface: withAlpha(colorRoles.surfaceBase, 0.12),
	brandHeaderSurfaceStrong: withAlpha(colorRoles.surfaceBase, 0.2),
	brandHeaderStroke: colorRoles.surfaceBase,
	brandHeaderStatusBar: colorRoles.brandAction,
	success: colorRoles.brandAction,
	successSurface: colorRoles.brandStructure,
	successText: colorRoles.surfaceBase,
	warning: colorRoles.brandAction,
	warningSurface: colorRoles.brandStructure,
	warningText: colorRoles.surfaceBase,
	danger: colorRoles.brandAction,
	dangerSurface: colorRoles.brandStructure,
	dangerText: colorRoles.surfaceBase,
	info: colorRoles.surfaceBase,
	infoSurface: colorRoles.brandStructure,
	infoText: colorRoles.surfaceBase,
	focusRing: colorRoles.surfaceBase,
	overlay: withAlpha(colorRoles.brandStructure, 0.88),
	overlaySoft: withAlpha(colorRoles.brandStructure, 0.72),
	disabledSurface: colorRoles.brandStructure,
	disabledText: colorRoles.surfaceBase,
	fieldBackground: colorRoles.brandStructure,
	fieldBorder: colorRoles.surfaceBase,
	fieldBorderActive: colorRoles.brandAction,
	fieldPlaceholder: colorRoles.surfaceBase
};

export const semanticThemeByMode: Record<ThemeMode, SemanticTheme> = {
	light: lightTheme,
	dark: darkTheme,
	'high-contrast': highContrastTheme
};

export const themeByMode = semanticThemeByMode;

export function resolveSemanticTheme(mode: ThemeMode) {
	return semanticThemeByMode[mode];
}

export type ThemeCssVariableMap = Record<string, string>;

function toThemeKebabCase(value: string) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[_\s]+/g, '-')
		.toLowerCase();
}

function resolveColorScheme(mode: ThemeMode) {
	return mode === 'dark' || mode === 'high-contrast' ? 'dark' : 'light';
}

const platformThemeAliasMap = {
	'app-background': 'background',
	'app-surface': 'surface',
	'app-surface-raised': 'surfaceRaised',
	'app-surface-inset': 'surfaceInset',
	'app-border': 'line',
	'app-border-strong': 'lineStrong',
	'app-text': 'text',
	'app-text-muted': 'textMuted',
	'app-text-soft': 'textSoft',
	'app-brand': 'brand',
	'app-brand-surface': 'brandSurface',
	'app-field': 'fieldBackground',
	'app-field-border': 'fieldBorder',
	'app-focus-ring': 'focusRing',
} as const satisfies Record<string, keyof Omit<SemanticTheme, 'mode'>>;

const controlPanelThemeAliasMap = {
	'control-panel-background': 'background',
	'control-panel-stage': 'surfaceSecondary',
	'control-panel-surface': 'surface',
	'control-panel-surface-raised': 'surfaceRaised',
	'control-panel-surface-inset': 'surfaceInset',
	'control-panel-border': 'line',
	'control-panel-border-strong': 'lineStrong',
	'control-panel-text': 'text',
	'control-panel-text-muted': 'textMuted',
	'control-panel-text-soft': 'textSoft',
	'control-panel-brand': 'brandHeaderBackground',
	'control-panel-brand-surface': 'brandHeaderSurface',
	'control-panel-field': 'fieldBackground',
	'control-panel-field-border': 'fieldBorder',
	'control-panel-focus-ring': 'focusRing',
} as const satisfies Record<string, keyof Omit<SemanticTheme, 'mode'>>;

function createDerivedThemeAliasVariables(
	canonicalPrefix: string,
	aliasMap: Record<string, keyof Omit<SemanticTheme, 'mode'>>,
) {
	const variables: ThemeCssVariableMap = {};

	for (const [aliasName, sourceThemeKey] of Object.entries(aliasMap)) {
		variables[`${canonicalPrefix}${aliasName}`] = `var(${canonicalPrefix}${toThemeKebabCase(sourceThemeKey)})`;
	}

	return variables;
}

export function createThemeCssVariables(theme: SemanticTheme) {
	const variables: ThemeCssVariableMap = {};

	for (const [themeKey, themeValue] of Object.entries(theme)) {
		if (themeKey === 'mode') {
			continue;
		}

		variables[`--bthwani-${toThemeKebabCase(themeKey)}`] = themeValue;
	}

	appendVariables(variables, createDerivedThemeAliasVariables('--bthwani-', platformThemeAliasMap));
	appendVariables(variables, createDerivedThemeAliasVariables('--bthwani-', controlPanelThemeAliasMap));

	variables['--bthwani-color-scheme'] = resolveColorScheme(theme.mode);

	appendVariables(variables, createPrefixedAliasVariables(variables, '--bthwani-', '--bth-'));
	appendVariables(variables, createPrefixedAliasVariables(variables, '--bthwani-', '--ui-'));

	return variables;
}

export function createThemeCssDeclarations(theme: SemanticTheme) {
	return Object.entries(createThemeCssVariables(theme))
		.map(([variableName, variableValue]) => `  ${variableName}: ${variableValue};`)
		.concat(`  color-scheme: ${resolveColorScheme(theme.mode)};`)
		.join('\n');
}

export function createThemeCssBlock(theme: SemanticTheme, selector: string) {
	return `${selector} {\n${createThemeCssDeclarations(theme)}\n}`;
}

export function buildWebThemeStyleSheet(rootSelector = '[data-bth-root="true"]') {
	// Split comma-separated root selectors and apply theme suffixes per-selector.
	function splitRootSelectors(selector: string) {
		return selector
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	// Normalize and dedupe selectors so duplicate entries don't produce repeated rules.
	const parts = Array.from(new Set(splitRootSelectors(rootSelector)));

	// Build light selectors: include bare root selectors and light-suffixed selectors.
	const lightBare = parts.join(', ');
	const lightSuffixed = parts.map((s) => `${s}[data-bth-theme='light']`).join(', ');
	const lightSelector = [lightBare, lightSuffixed].filter(Boolean).join(', ');

	// Dark and high-contrast must only match selectors that include the theme suffix.
	const darkSelector = parts.map((s) => `${s}[data-bth-theme='dark']`).join(', ');
	const highContrastSelector = parts.map((s) => `${s}[data-bth-theme='high-contrast']`).join(', ');

	return [
		// token block intentionally uses the original `rootSelector` as before
		createTokenCssBlock(rootSelector),
		// light must apply to both the bare root selectors and the light-suffixed selectors
		createThemeCssBlock(lightTheme, lightSelector),
		// dark / high-contrast must only match selectors that include the theme suffix
		createThemeCssBlock(darkTheme, darkSelector),
		createThemeCssBlock(highContrastTheme, highContrastSelector)
	].join('\n\n');
}

export function createNativeThemeOutput(mode: ThemeMode) {
	return {
		mode,
		theme: resolveSemanticTheme(mode),
		tokens: createNativeTokenOutput()
	};
}

export const themeModes = Object.freeze(Object.keys(semanticThemeByMode) as ThemeMode[]);

export const nativeThemeOutputs = Object.freeze(
	Object.fromEntries(themeModes.map((mode) => [mode, createNativeThemeOutput(mode)])) as Record<ThemeMode, ReturnType<typeof createNativeThemeOutput>>
);

type TamaguiThemeBridge = Record<ThemeMode, Omit<SemanticTheme, 'mode'>>;

function stripThemeMode(theme: SemanticTheme): Omit<SemanticTheme, 'mode'> {
	const { mode, ...themeTokens } = theme;
	return themeTokens;
}

export type TamaguiBridge = {
	themes: TamaguiThemeBridge;
	tokens: ReturnType<typeof createNativeTokenOutput>;
	defaultTheme: 'light';
	defaultThemeByMode: Record<ThemeMode, 'light' | 'dark'>;
	logicalDirection: typeof directionConfig;
};

export function createTamaguiBridge(): TamaguiBridge {
	return {
		themes: {
			light: stripThemeMode(lightTheme),
			dark: stripThemeMode(darkTheme),
			'high-contrast': stripThemeMode(highContrastTheme)
		},
		tokens: nativeTokenOutput,
		defaultTheme: 'light',
		defaultThemeByMode: {
			light: 'light',
			dark: 'dark',
			'high-contrast': 'dark'
		},
		logicalDirection: directionConfig
	};
}

export const tamaguiBridge = createTamaguiBridge();

export type Locale = 'ar' | 'en';

export type UiTextCatalogStringLeafShape<T> = {
	readonly [K in keyof T]: T[K] extends string
		? string
		: UiTextCatalogStringLeafShape<T[K]>;
};

export type UiTextCatalogShape = UiTextCatalogStringLeafShape<typeof uiKitLocales.ar.common>;

export const uiTextCatalog = {
	ar: uiKitLocales.ar.common,
	en: uiKitLocales.en.common,
} as const satisfies Record<Locale, UiTextCatalogShape>;

export function getUiText(locale: Locale = 'ar') {
	return uiTextCatalog[locale];
}

export function amountToArabicText(n: number, t: (key: string) => string): string {
	if (n <= 0) return t('surfaces.صفر');
	const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
	const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
	const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
	const andStr = t('surfaces.and') || ' و ';
	const hundredStr = t('surfaces.hundred') || ' مائة ';

	function inner(x: number): string {
		if (x >= 1000) {
			const k = Math.floor(x / 1000);
			const rest = x % 1000;
			const kStr = k <= 19 ? (k === 10 ? 'عشرة' : k === 11 ? 'أحد عشر' : k < 10 ? ones[k] : ones[k % 10] + ' عشر') : k < 100 ? (tens[Math.floor(k / 10)] + (k % 10 ? andStr + ones[k % 10] : '')) : hundreds[Math.floor(k / 100)] + (k % 100 ? andStr + inner(k % 100) : '');
			const thousandWord = k === 2 ? t('surfaces.ألفان') : k >= 3 && k <= 10 ? ones[k] + ' آلاف' : kStr + ' ألف';
			return rest > 0 ? thousandWord + andStr + inner(rest) : thousandWord;
		}
		if (x >= 100) {
			const h = Math.floor(x / 100);
			const r = x % 100;
			return (hundreds[h] || inner(h) + hundredStr) + (r > 0 ? andStr + inner(r) : '');
		}
		if (x >= 20) return (x % 10 ? ones[x % 10] + andStr : '') + tens[Math.floor(x / 10)];
		if (x >= 10) return x === 10 ? t('surfaces.عشرة') : ones[x % 10] + ' عشر';
		return ones[x] || String(x);
	}

	return inner(n);
}
