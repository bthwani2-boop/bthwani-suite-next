// ─── Website Lane ──────────────────────────────────────────────────────────────
// Use for: landing pages, marketing, public-facing pages.
export { WebMissionHeroCard, WebPageFrame } from './page-frame';
export type { WebMissionHeroCardProps, WebPageFrameProps } from './page-frame';
// The legacy document shell/bootstrap exports were removed because they
// injected an unnonced inline script/style pair. WebThemeStyle remains the
// single style producer and accepts the request nonce from the server layout.
export { WebThemeStyle } from './root-layout';
export type { WebRootLayoutProps } from './root-layout';

// ─── Shared WebApp Components ─────────────────────────────────────────────────
// Use for: general app surfaces, forms, cards usable in both webapp and control panel.
export { WebControlActionButton, WebControlActionCard, WebControlDisclosureItem, WebControlSurfaceHeader, WebCompactSurfaceHeader, WebSystemSuggestion, WebSectionCard, WebSignalCard } from './control-surface';
export type { WebControlActionButtonProps, WebControlActionCardProps, WebControlDisclosureItemProps, WebControlSurfaceAction, WebControlSurfaceActionTone, WebControlSurfaceHeaderChip, WebControlSurfaceHeaderChipTone, WebControlSurfaceHeaderProps, WebCompactSurfaceHeaderProps, WebSystemSuggestionProps, WebSystemSuggestionActionProps, WebSectionCardProps, WebSignalCardProps, WebSignalCardTone } from './control-surface';

// ─── Control Panel Lane ────────────────────────────────────────────────────────
// Use for: staff operations, admin dashboards, control rooms only.
export { WebCommandCenterFrame, WebCommandStrip, WebRailServiceList, WebSegmentedTabs, WebControlPanelFrame, WebControlPanelKpiStrip, WebControlPanelWorkspaceTabs } from './command-center';
export type { WebCommandCenterFilter, WebCommandCenterFrameProps, WebCommandCenterNavItem, WebCommandStripFilter, WebCommandStripProps, WebRailServiceItem, WebRailServiceListProps, WebSearchItem, WebSegmentedTabItem, WebSegmentedTabsProps, WebControlPanelKpiItem, WebControlPanelKpiStripProps, WebControlPanelKpiTone, WebControlPanelWorkspaceTabItem, WebControlPanelWorkspaceTabsProps, WebControlPanelFrameProps } from './command-center';
export { WebControlPanelQueue } from './control-panel-queue';
export type { WebControlPanelQueueProps } from './control-panel-queue';
export {
	WebControlPanelViewport,
	WebControlPanelWorkbench,
	WebControlPanelDenseHeader,
	WebControlPanelSplitPane,
	WebControlPanelMapCanvas,
	WebControlPanelMiniMapZone,
	WebControlPanelMapPin,
	WebControlPanelRouteLine,
	WebControlPanelTertiaryFilters,
	WebControlPanelCompactPager,
	WebControlPanelStatusTag,
	WebControlPanelActionCluster,
	WebControlPanelDecisionRow,
	WebControlPanelRecommendation,
	WebControlPanelInspectorShell,
} from './control-surface';
export type {
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
	WebControlPanelCompactPagerProps,
	WebControlPanelStatusTone,
	WebControlPanelStatusTagProps,
	WebControlPanelActionItem,
	WebControlPanelActionClusterProps,
	WebControlPanelDecisionRowRisk,
	WebControlPanelDecisionRowProps,
	WebControlPanelRecommendationProps,
	WebControlPanelInspectorShellProps,
} from './control-surface';
