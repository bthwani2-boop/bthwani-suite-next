/** Aggregated zone-level data only — no individual captain positions. Consumer: control-panel only. */
export type DshZoneHeatCell = {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly activeCaptainCount: number;
  readonly pendingOrderCount: number;
  readonly densityLevel: "low" | "medium" | "high" | "saturated";
  readonly updatedAt: string;
};

export type DshOperationalHeatmap = {
  readonly cells: readonly DshZoneHeatCell[];
  readonly generatedAt: string;
  readonly aggregatedOnly: true;
};
