// ─── Website Lane ──────────────────────────────────────────────────────────────
export { WebMissionHeroCard, WebPageFrame, WebSectionCard, WebSignalCard } from './page-frame';
export type { WebMissionHeroCardProps, WebPageFrameProps, WebSectionCardProps, WebSignalCardProps, WebSignalCardTone } from './page-frame';
export { WebDocumentShell, WebRootBody, WebRootLayout, WebThemeStyle, buildWebRootMetadata } from './root-layout';
export type { WebRootLayoutProps } from './root-layout';

// ─── Shared WebApp Components ─────────────────────────────────────────────────
export { WebControlActionButton, WebControlActionCard, WebControlDisclosureItem, WebControlSurfaceHeader, WebCompactSurfaceHeader, WebSystemSuggestion } from './control-surface';
export type { WebControlActionButtonProps, WebControlActionCardProps, WebControlDisclosureItemProps, WebControlSurfaceAction, WebControlSurfaceActionTone, WebControlSurfaceHeaderChip, WebControlSurfaceHeaderChipTone, WebControlSurfaceHeaderProps, WebCompactSurfaceHeaderProps, WebSystemSuggestionProps, WebSystemSuggestionActionProps } from './control-surface';

// ─── Control Panel Lane ────────────────────────────────────────────────────────
// Use for: staff operations, admin dashboards, control rooms only.
export { WebCommandCenterFrame, WebCommandStrip, WebRailServiceList, WebSegmentedTabs, WebControlPanelFrame, WebControlPanelKpiStrip, WebControlPanelWorkspaceTabs, WebControlPanelSubTabs } from './command-center';
export type { WebCommandCenterFilter, WebCommandCenterFrameProps, WebCommandCenterNavItem, WebCommandStripFilter, WebCommandStripProps, WebRailServiceItem, WebRailServiceListProps, WebSearchItem, WebSegmentedTabItem, WebSegmentedTabsProps, WebControlPanelFrameProps, WebControlPanelKpiItem, WebControlPanelKpiStripProps, WebControlPanelKpiTone, WebControlPanelWorkspaceTabItem, WebControlPanelWorkspaceTabsProps, WebControlPanelSubTabItem, WebControlPanelSubTabsProps } from './command-center';
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
	WebControlPanelLaneTabs,
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
	WebControlPanelLaneTabItem,
	WebControlPanelLaneTabsProps,
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
