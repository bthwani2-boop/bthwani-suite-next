export type DshSurfaceId =
  | 'app-client'
  | 'app-partner'
  | 'app-captain'
  | 'app-field'
  | 'control-panel'
  | 'wlt-finance';

/**
 * On-demand contract: IDs/summaries first, heavy payloads only on explicit open.
 * summary-only       — identifier + label only; no detail loaded.
 * detail-on-open     — full detail loaded when user opens the flow.
 * evidence-on-open   — proof/attachments loaded only when evidence panel opens.
 * chat-on-open       — conversation thread loaded only when chat opens.
 * finance-snapshot-only — financial snapshot loaded read-only when finance panel opens.
 */
export type DshOnDemandPolicy =
  | 'summary-only'
  | 'detail-on-open'
  | 'evidence-on-open'
  | 'chat-on-open'
  | 'finance-snapshot-only';

export type CanonicalOperationsGroupId =
  | 'command-center'
  | 'live-orders'
  | 'dispatch-capacity'
  | 'exceptions'
  | 'special-ops';

