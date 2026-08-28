export { StyleSheet as WebStyleSheet } from "./platform/web/StyleSheet";
export { View as WebView } from "./platform/web/View";
export type { ViewProps as WebViewProps } from "./platform/web/View";

// ─── Website Lane ──────────────────────────────────────────────────────────────
// Use for: landing pages, marketing, public-facing pages.
export {
	WebMissionHeroCard,
	WebPageFrame,
	WebThemeStyle,
} from './web/index';
export type {
	WebMissionHeroCardProps,
	WebPageFrameProps,
	WebRootLayoutProps,
} from './web/index';

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
	WebControlPanelViewport,
	WebControlPanelWorkbench,
	WebControlPanelDenseHeader,
	WebControlPanelSplitPane,
	WebControlPanelMapCanvas,
	WebControlPanelMiniMapZone,
	WebControlPanelMapPin,
	WebControlPanelRouteLine,
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
	WebSectionCard,
	WebSignalCard,
} from './web/index';
export type {
	WebControlActionButtonProps,
	WebControlActionCardProps,
	WebControlDisclosureItemProps,
	WebControlSurfaceAction,
	WebControlSurfaceActionTone,
	WebControlSurfaceHeaderChip,
	WebControlSurfaceHeaderChipTone,
	WebControlSurfaceHeaderProps,
	WebCompactSurfaceHeaderProps,
	WebSystemSuggestionProps,
	WebSystemSuggestionActionProps,
	WebSectionCardProps,
	WebSignalCardProps,
	WebSignalCardTone,
} from './web/index';