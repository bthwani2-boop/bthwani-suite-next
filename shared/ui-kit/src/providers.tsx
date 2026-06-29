'use client';

import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useId,
	type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from './tamagui-config';
import {
	defaultBThwaniAppearanceMode,
	getBThwaniAppearanceThemeMode,
	getBThwaniAppearanceTokens,
	resolveBThwaniAppearanceMode,
	type BThwaniAppearanceMode,
	type BThwaniAppearanceTokens,
} from './appearance';
import {
	directionConfig,
	getUiText,
	lightTheme,
	resolveDirectionFromLanguage,
	resolveSemanticTheme,
	type Language,
	type Direction,
	type SemanticTheme,
	type ThemeMode,
} from './foundation';

export type RootConfig = {
	language?: Language;
	themeMode?: ThemeMode;
};

export const ROOT_DEFAULTS: Required<Pick<RootConfig, 'language' | 'themeMode'>> = {
	language: directionConfig.defaultLanguage,
	themeMode: 'light',
};

type DirectionContextValue = {
	direction: Direction;
	language: Language;
	isRtl: boolean;
	usesLogicalStartEnd: boolean;
	setLanguage: (language: Language) => void;
};

const DirectionContext = createContext<DirectionContextValue>({
	direction: directionConfig.defaultDirection,
	language: directionConfig.defaultLanguage,
	isRtl: directionConfig.defaultDirection === 'rtl',
	usesLogicalStartEnd: directionConfig.logicalStartEnd,
	setLanguage: () => undefined,
});

type ThemeContextValue = {
	mode: ThemeMode;
	theme: SemanticTheme;
};

const ThemeContext = createContext<ThemeContextValue>({
	mode: 'light',
	theme: lightTheme,
});

type BThwaniAppearanceContextValue = {
	mode: BThwaniAppearanceMode;
	tokens: BThwaniAppearanceTokens;
};

const AppearanceContext = createContext<BThwaniAppearanceContextValue | null>(null);

type PortalFactory = (children: ReactNode, container: Element) => ReactNode;

type PortalContextValue = {
	hostElement: Element | null;
	isWeb: boolean;
};

const PortalContext = createContext<PortalContextValue>({
	hostElement: null,
	isWeb: Platform.OS === 'web',
});

let cachedPortalFactory: PortalFactory | null | undefined;

function readStoredLanguage() {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const storedLanguage = window.localStorage.getItem(directionConfig.languageStorageKey);
		return storedLanguage === 'ar' || storedLanguage === 'en' ? storedLanguage : null;
	} catch {
		return null;
	}
}

function syncDocumentLanguage(language: Language, direction: Direction) {
	if (typeof document === 'undefined') {
		return;
	}

	document.documentElement.lang = language;
	document.documentElement.dir = direction;

	try {
		window.localStorage.setItem(directionConfig.languageStorageKey, language);
	} catch {
		// Ignore storage failures and keep the in-memory language active.
	}

	try {
		document.cookie = `${directionConfig.languageStorageKey}=${language}; path=/; max-age=31536000; SameSite=Lax`;
	} catch {
		// Ignore cookie failures in non-standard runtimes.
	}
}

function resolvePortalFactory() {
	if (cachedPortalFactory !== undefined) {
		return cachedPortalFactory;
	}

	try {
		const reactDomModule = new Function('return import("react-dom")')() as Promise<{ createPortal?: PortalFactory }>;
		cachedPortalFactory = null;
		void reactDomModule.then((module) => {
			cachedPortalFactory = module.createPortal ?? null;
		});
	} catch {
		cachedPortalFactory = null;
	}

	return cachedPortalFactory;
}

export type ThemeProviderProps = {
	mode?: ThemeMode;
	children: ReactNode;
};

export function ThemeProvider({ mode = 'light', children }: ThemeProviderProps) {
	const value = useMemo<ThemeContextValue>(() => ({ mode, theme: resolveSemanticTheme(mode) }), [mode]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
	return useContext(ThemeContext);
}

export function useTheme() {
	return useThemeContext();
}

export type BThwaniAppearanceProviderProps = {
	mode?: BThwaniAppearanceMode;
	children: ReactNode;
	syncThemeMode?: boolean;
};

export function BThwaniAppearanceProvider({
	mode = defaultBThwaniAppearanceMode,
	children,
	syncThemeMode = true,
}: BThwaniAppearanceProviderProps) {
	const value = useMemo<BThwaniAppearanceContextValue>(() => ({
		mode,
		tokens: getBThwaniAppearanceTokens(mode),
	}), [mode]);

	const content = <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;

	if (!syncThemeMode) {
		return content;
	}

	return <ThemeProvider mode={getBThwaniAppearanceThemeMode(mode)}>{content}</ThemeProvider>;
}

export function useBThwaniAppearanceContext() {
	return useContext(AppearanceContext);
}

export function useBThwaniAppearance() {
	const appearanceContext = useContext(AppearanceContext);
	const { mode } = useTheme();
	const resolvedMode = appearanceContext?.mode ?? resolveBThwaniAppearanceMode(mode);

	return useMemo<BThwaniAppearanceContextValue>(() => (
		appearanceContext ?? {
			mode: resolvedMode,
			tokens: getBThwaniAppearanceTokens(resolvedMode),
		}
	), [appearanceContext, resolvedMode]);
}

export type DirectionProviderProps = {
	language?: Language;
	children: ReactNode;
};

export function DirectionProvider({ language = directionConfig.defaultLanguage, children }: DirectionProviderProps) {
	const [activeLanguage, setActiveLanguage] = useState<Language>(() => readStoredLanguage() ?? language);

	useEffect(() => {
		const storedLanguage = readStoredLanguage();

		if (storedLanguage) {
			setActiveLanguage((currentLanguage) => (currentLanguage === storedLanguage ? currentLanguage : storedLanguage));
			return;
		}

		setActiveLanguage((currentLanguage) => (currentLanguage === language ? currentLanguage : language));
	}, [language]);

	const resolvedDirection = resolveDirectionFromLanguage(activeLanguage);

	useEffect(() => {
		syncDocumentLanguage(activeLanguage, resolvedDirection);
	}, [activeLanguage, resolvedDirection]);

	const setLanguage = useCallback((nextLanguage: Language) => {
		setActiveLanguage(nextLanguage);
	}, []);

	const value = useMemo<DirectionContextValue>(
		() => ({
			direction: resolvedDirection,
			language: activeLanguage,
			isRtl: resolvedDirection === 'rtl',
			usesLogicalStartEnd: directionConfig.logicalStartEnd,
			setLanguage,
		}),
		[activeLanguage, resolvedDirection, setLanguage]
	);

	return <DirectionContext.Provider value={value}>{children}</DirectionContext.Provider>;
}

export function useDirectionContext() {
	return useContext(DirectionContext);
}

export function useDirection() {
	return useDirectionContext();
}

export function useUiLanguage() {
	const { language, setLanguage } = useDirection();
	const isEnglish = language === 'en';

	const toggleLanguage = useCallback(() => {
		setLanguage(isEnglish ? 'ar' : 'en');
	}, [isEnglish, setLanguage]);

	return {
		language,
		isEnglish,
		toggleLanguage,
	};
}

export function useUiText() {
	const { language } = useDirection();
	return getUiText(language === 'en' ? 'en' : 'ar');
}

type UiTextVars = Record<string, string | number | boolean | null | undefined>;

function getValueByDot(obj: unknown, key: string): unknown {
	if (!key) return undefined;

	const parts = key.split('.');
	let current: unknown = obj;

	for (const part of parts) {
		if (current && typeof current === 'object' && part in current) {
			current = (current as Record<string, unknown>)[part];
		} else {
			return undefined;
		}
	}

	return current;
}

export function useI18n() {
	const uiText = useUiText();
	const { direction, language } = useDirection();

	const t = useCallback((key: string, vars?: UiTextVars) => {
		const value = getValueByDot(uiText, key);

		if (typeof value === 'string') {
			if (!vars) return value;

			return value.replace(/\{(\w+)\}/g, (_match, name: string) => {
				const resolved = vars[name];
				if (resolved === undefined || resolved === null) return '';
				return String(resolved);
			});
		}

		return String(value ?? key);
	}, [uiText]);

	const isRTL = direction === 'rtl';

	return { t, isRTL, language, direction, uiText };
}

export type UiKitProviderProps = {
	language?: Language;
	themeMode?: ThemeMode;
	children: ReactNode;
};

export function PortalHost({ children }: { children?: ReactNode }) {
	const [hostElement, setHostElement] = useState<Element | null>(null);
	const reactId = useId();
	const hostId = useMemo(() => `portal-host-${String(reactId).replace(/[:.]/g, '')}`, [reactId]);
	const isWeb = Platform.OS === 'web';

	const contextValue = useMemo<PortalContextValue>(() => ({ hostElement, isWeb }), [hostElement, isWeb]);

	return (
		<PortalContext.Provider value={contextValue}>
			{children}
			{isWeb
				? React.createElement('div', {
						id: hostId,
						ref: (node: Element | null) => setHostElement(node),
						'data-portal-host': 'true',
						style: {
							position: 'fixed',
							inset: 0,
							zIndex: 2147483000,
							pointerEvents: 'none',
							display: 'flex',
							flexDirection: 'column',
						},
					})
				: null}
		</PortalContext.Provider>
	);
}

export type PortalLayerProps = {
	active?: boolean;
	children: ReactNode;
	fallback?: ReactNode;
};

export function PortalLayer({ active = true, children, fallback = null }: PortalLayerProps) {
	const { hostElement, isWeb } = useContext(PortalContext);

	if (!active) {
		return null;
	}

	if (!isWeb) {
		return <>{fallback}</>;
	}

	const portalFactory = resolvePortalFactory();

	if (portalFactory && hostElement) {
		return <>{portalFactory(children, hostElement)}</>;
	}

	return <>{children}</>;
}

export function UiKitProvider({ language = 'ar', themeMode = 'light', children }: UiKitProviderProps) {
	return (
		<TamaguiProvider config={tamaguiConfig} defaultTheme={themeMode === 'dark' || themeMode === 'high-contrast' ? 'dark' : 'light'}>
			<ThemeProvider mode={themeMode}>
				<DirectionProvider language={language}>
					<PortalHost>{children}</PortalHost>
				</DirectionProvider>
			</ThemeProvider>
		</TamaguiProvider>
	);
}

export type RootProvidersProps = RootConfig & {
	children: ReactNode;
};

export function RootProviders({ children, language, themeMode }: RootProvidersProps) {
	return (
		<UiKitProvider
			language={language ?? ROOT_DEFAULTS.language}
			themeMode={themeMode ?? ROOT_DEFAULTS.themeMode}
		>
			{children}
		</UiKitProvider>
	);
}

export type { Language, Direction, SemanticTheme, ThemeMode } from './foundation';
export type { BThwaniAppearanceMode, BThwaniAppearanceTokens } from './appearance';
