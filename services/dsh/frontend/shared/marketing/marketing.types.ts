export type DshMarketingTargetType =
  | "home" | "stores" | "store" | "category" | "subcategory"
  | "product" | "offer" | "campaign" | "search" | "custom";

export type DshCampaign = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly targetType?: DshMarketingTargetType;
  readonly targetId?: string;
  readonly audience: string;
  readonly placement?: string;
  readonly createdBy: string;
  readonly archivedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshMarketingState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly items: readonly T[] }
  | { readonly kind: "error"; readonly message: string };

// --- Extended Marketing Types (Aligned with Donor and Sovereign Brains) ---

// --- Control-Panel Editor Types ---

// --- Banner Editor Types ---

// --- Video Editor Types ---

// --- News Ticker Types ---

export type MarketingNewsTickerKind = 'alert' | 'news' | 'promo';
export type MarketingNewsTickerStatus = 'draft' | 'published' | 'paused';
export type MarketingNewsTickerSource = 'system' | 'ops' | 'partner';
export type MarketingNewsTickerAudience = 'all' | 'client' | 'partner' | 'captain';
export type MarketingNewsTickerDeliveryMode = 'scroll' | 'toast' | 'overlay';
export type MarketingNewsTickerPriority = 'low' | 'normal' | 'high' | 'critical';

export type MarketingNewsTickerItem = {
  id: string;
  message: string;
  kind: MarketingNewsTickerKind;
  status: MarketingNewsTickerStatus;
  source: MarketingNewsTickerSource;
  audience: MarketingNewsTickerAudience;
  deliveryMode: MarketingNewsTickerDeliveryMode;
  priority: MarketingNewsTickerPriority;
  pinned: boolean;
  actionType: string;
  actionTarget: string;
  clicks: number;
  impressions: number;
  openHour?: number;
  closeHour?: number;
  cooldownMinutes?: number;
  repeatGapMinutes?: number;
  updatedAt: string;
};

export type MarketingTickerPlanLane = 'active' | 'scheduled' | 'suppressed' | 'history';

export type MarketingTickerPlanReason =
  | 'scheduled_active'
  | 'paused_by_user'
  | 'cooldown_active'
  | 'not_in_hours'
  | 'priority_overridden'
  | 'audience_mismatch';

export type MarketingTickerPlanEntry = {
  readonly item: MarketingNewsTickerItem;
  readonly lane: MarketingTickerPlanLane;
  readonly reason?: MarketingTickerPlanReason;
  readonly active: boolean;
  readonly score: number;
};

export type MarketingTickerPlan = {
  readonly activeTicker: MarketingNewsTickerItem | null;
  readonly planEntries: readonly MarketingTickerPlanEntry[];
};

