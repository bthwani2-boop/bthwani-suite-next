export { StyleSheet as WebStyleSheet } from "./platform/web/StyleSheet";
export { View as WebView } from "./platform/web/View";
export type { ViewProps as WebViewProps } from "./platform/web/View";

// ─── Website Lane ──────────────────────────────────────────────────────────────
// Use for: landing pages, marketing, public-facing pages.
export {
	WebMissionHeroCard,
	WebPageFrame,
	WebSectionCard,
	WebSignalCard,
} from './web/page-frame';
export {
	WebDocumentShell,
	WebRootBody,
	WebRootLayout,
	WebThemeStyle,
	buildWebRootMetadata,
} from './web/root-layout';

// ─── Control Panel Lane ────────────────────────────────────────────────────────
// Use for: staff operations, admin dashboards, control rooms only.
export {
	WebCommandCenterFrame,
	WebCommandStrip,
	WebRailServiceList,
	WebSegmentedTabs,
	// ControlPanel primitives
	WebControlPanelFrame,
	WebControlPanelKpiStrip,
	WebControlPanelWorkspaceTabs,
	WebControlPanelSubTabs,
	WebControlPanelViewport,
	WebControlPanelWorkbench,
	WebControlPanelDenseHeader,
	WebControlPanelSplitPane,
	WebControlPanelMapCanvas,
	WebControlPanelMiniMapZone,
	WebControlPanelMapPin,
	WebControlPanelRouteLine,
	WebControlPanelLaneTabs,
	WebControlPanelTertiaryFilters,
	WebControlPanelQueue,
	WebControlPanelCompactPager,
	WebControlPanelDecisionRow,
	WebControlPanelRecommendation,
	WebControlPanelActionCluster,
	WebControlPanelInspectorShell,
	WebControlPanelStatusTag,
} from './web/index';
export type {
	WebSearchItem,
	WebControlPanelFrameProps,
	WebControlPanelKpiItem,
	WebControlPanelKpiStripProps,
	WebControlPanelKpiTone,
	WebControlPanelWorkspaceTabItem,
	WebControlPanelWorkspaceTabsProps,
	WebControlPanelSubTabItem,
	WebControlPanelSubTabsProps,
	WebControlPanelDenseHeaderMetric,
	WebControlPanelViewportProps,
	WebControlPanelWorkbenchProps,
	WebControlPanelDenseHeaderProps,
	WebControlPanelSplitPaneWidth,
	WebControlPanelSplitPaneProps,
	WebControlPanelMapCanvasProps,
	WebControlPanelMiniMapZoneProps,
	WebControlPanelMapPinProps,
	WebControlPanelRouteLineProps,
	WebControlPanelLaneTabItem,
	WebControlPanelLaneTabsProps,
	WebControlPanelTertiaryFilterItem,
	WebControlPanelTertiaryFiltersProps,
	WebControlPanelQueueProps,
	WebControlPanelCompactPagerProps,
	WebControlPanelDecisionRowProps,
	WebControlPanelDecisionRowRisk,
	WebControlPanelRecommendationProps,
	WebControlPanelActionItem,
	WebControlPanelActionClusterProps,
	WebControlPanelInspectorShellProps,
	WebControlPanelStatusTone,
	WebControlPanelStatusTagProps,
} from './web/index';

// ─── Shared WebApp Components ─────────────────────────────────────────────────
// Use for: general app surfaces, forms, cards usable in both webapp and control panel.
export {
	WebControlActionButton,
	WebControlActionCard,
	WebControlDisclosureItem,
	WebControlSurfaceHeader,
	WebCompactSurfaceHeader,
	WebSystemSuggestion,
} from './web/index';
