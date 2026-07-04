import { useCallback, useEffect, useState, useMemo } from "react";
import {
  fetchCampaigns, createCampaign, updateCampaign, archiveCampaign,
  fetchTickers, createTicker, updateTicker, deleteTicker,
} from "./marketing.api";
import {
  fetchPartnerOffers, updatePartnerOffer, archivePartnerOffer,
  fetchPartnerSelfOffers, submitPartnerSelfOffer,
} from "./marketing.api";
import type { MarketingTickerWritePayload, PartnerOfferSubmitPayload } from "./marketing.api";
import {
  fetchDeliveryAnalytics,
  fetchOrderAnalytics,
  fetchPlatformKpis,
  fetchStoreAnalytics,
  fetchSupportAnalytics,
} from "../analytics/analytics.api";
import type { DshCampaign, DshMarketingState } from "./marketing.types";
import {
  buildDeliverySignalCards,
  buildMarketingKpiMetrics,
  type DeliverySignalCardViewModel,
  type MarketingKpiMetrics,
} from "./marketing-registry";
import type {
  MarketingNewsTickerItem,
  MarketingNewsTickerAudience,
  MarketingNewsTickerStatus,
  MarketingNewsTickerKind,
  MarketingNewsTickerSource,
  MarketingNewsTickerDeliveryMode,
  MarketingNewsTickerPriority,
  MarketingTickerPlan,
  MarketingNewsTickerLocale,
  MarketingNewsTickerPreview,
  MarketingTickerPlanReason,
  MarketingTickerPlanEntry,
  MarketingVideoRecord,
  MarketingVideoStatus,
  MarketingVideoAudience,
  MarketingVideoSource,
  MarketingVideoTargetType,
  MarketingGrowthRecord,
  MarketingGrowthStatus,
  MarketingGrowthAudience,
  MarketingGrowthSource,
  MarketingGrowthFamily,
  MarketingGrowthRouteTarget,
} from "./marketing.types";
import type { PartnerOfferRecord, PartnerOfferStatus } from "../partner/dsh-partner-offer-types";

function resolveMsg(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "network") return "لا يوجد اتصال";
  if (e?.status === 401) return "الجلسة منتهية";
  return "تعذّر تحميل البيانات";
}

// --- Draft Builders ---

export function createMarketingTickerDraft(overrides: Partial<MarketingNewsTickerItem> = {}): MarketingNewsTickerItem {
  return {
    id: `ticker-temp-${Date.now()}`,
    message: "",
    kind: "news",
    status: "draft",
    source: "ops",
    audience: "all",
    deliveryMode: "scroll",
    priority: "normal",
    pinned: false,
    actionType: "none",
    actionTarget: "",
    clicks: 0,
    impressions: 0,
    openHour: 0,
    closeHour: 23,
    cooldownMinutes: 0,
    repeatGapMinutes: 15,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createVideoDraft(overrides: Partial<MarketingVideoRecord> = {}): MarketingVideoRecord {
  return {
    id: `vid-temp-${Date.now()}`,
    title: "",
    subtitle: "",
    status: "draft",
    audience: "all",
    source: "marketing",
    videoUrl: "",
    posterUrl: "",
    durationSeconds: 30,
    mute: true,
    autoplay: false,
    loop: true,
    ctaLabel: "اطلب الآن",
    highlight: "",
    targetType: "home",
    targetId: "",
    order: 1,
    impressions: 0,
    clicks: 0,
    reviewState: "none",
    ...overrides,
  };
}


export function createGrowthDraft(overrides: Partial<MarketingGrowthRecord> = {}): MarketingGrowthRecord {
  return {
    id: `grow-temp-${Date.now()}`,
    title: "",
    subtitle: "",
    family: "campaign",
    status: "draft",
    audience: "all",
    source: "marketing",
    routeTarget: "home",
    ctaLabel: "",
    highlight: "",
    metricValue: "",
    accentColor: "brand",
    impressions: 0,
    clicks: 0,
    ...overrides,
  };
}

// --- News Ticker Evaluation Helpers ---

export function buildMarketingTickerPlan(
  audience: MarketingNewsTickerAudience = "all",
  items: ReadonlyArray<MarketingNewsTickerItem> = []
): MarketingTickerPlan {
  const planEntries: MarketingTickerPlanEntry[] = items.map(item => {
    let active = item.status === "published";
    let reason: MarketingTickerPlanReason | undefined = active ? "scheduled_active" : "paused_by_user";
    let score = item.pinned ? 100 : 50;

    if (item.status === "published") {
      const now = new Date();
      const currentHour = now.getHours();
      if (item.openHour !== undefined && item.closeHour !== undefined) {
        if (currentHour < item.openHour || currentHour > item.closeHour) {
          active = false;
          reason = "not_in_hours";
          score = 0;
        }
      }
    }

    return {
      item,
      lane: active ? "active" : "scheduled",
      reason,
      active,
      score,
    };
  });

  const activeEntry = planEntries.find(e => e.active) || null;

  return {
    activeTicker: activeEntry ? activeEntry.item : null,
    planEntries,
  };
}

// --- Extended Controllers using transient React state (NO global seed/mock file) ---

export function useTickersController(authKind: string) {
  const [items, setItems] = useState<ReadonlyArray<MarketingNewsTickerItem>>([]);
  const [selected, setSelected] = useState<MarketingNewsTickerItem | null>(null);
  const [draft, setDraft] = useState<MarketingNewsTickerItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { tickers } = await fetchTickers();
      setItems(tickers);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") { setItems([]); return; }
    void load();
  }, [authKind, load]);

  const select = useCallback((item: MarketingNewsTickerItem | null) => {
    setSelected(item);
    setDraft(item === null ? createMarketingTickerDraft() : { ...item });
  }, []);

  const toWritePayload = (input: MarketingNewsTickerItem): MarketingTickerWritePayload & { message: string } => ({
    message: input.message,
    kind: input.kind,
    status: input.status,
    source: input.source,
    audience: input.audience,
    deliveryMode: input.deliveryMode,
    priority: input.priority,
    pinned: input.pinned,
    actionType: input.actionType,
    actionTarget: input.actionTarget,
    ...(input.openHour !== undefined ? { openHour: input.openHour } : {}),
    ...(input.closeHour !== undefined ? { closeHour: input.closeHour } : {}),
    ...(input.cooldownMinutes !== undefined ? { cooldownMinutes: input.cooldownMinutes } : {}),
    ...(input.repeatGapMinutes !== undefined ? { repeatGapMinutes: input.repeatGapMinutes } : {}),
  });

  const save = useCallback(async (input: MarketingNewsTickerItem) => {
    try {
      if (input.id.startsWith("ticker-temp-")) {
        await createTicker(toWritePayload(input));
      } else {
        await updateTicker(input.id, toWritePayload(input));
      }
      setErrorMessage(null);
      await load();
      select(null);
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, [load, select]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteTicker(id);
      setErrorMessage(null);
      await load();
      if (selected?.id === id) select(null);
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, [load, selected, select]);

  const toggleStatus = useCallback(async (id: string) => {
    const current = items.find(t => t.id === id);
    if (!current) return;
    try {
      await updateTicker(id, { status: current.status === "published" ? "paused" : "published" });
      setErrorMessage(null);
      await load();
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, [items, load]);

  const togglePinned = useCallback(async (id: string) => {
    const current = items.find(t => t.id === id);
    if (!current) return;
    try {
      await updateTicker(id, { pinned: !current.pinned });
      setErrorMessage(null);
      await load();
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, [items, load]);

  const plan = useMemo(() => buildMarketingTickerPlan("all", items), [items]);

  return {
    items, selected, draft, setDraft, select, save, remove, toggleStatus, togglePinned, plan,
    reload: load,
    errorMessage,
    isBackedByApi: true as const,
  };
}

export function useVideosController(authKind: string) {
  const [items, setItems] = useState<ReadonlyArray<MarketingVideoRecord>>([]);
  const [selected, setSelected] = useState<MarketingVideoRecord | null>(null);
  const [draft, setDraft] = useState<MarketingVideoRecord | null>(null);

  const select = useCallback((item: MarketingVideoRecord | null) => {
    setSelected(item);
    setDraft(item === null ? createVideoDraft() : { ...item });
  }, []);

  const save = useCallback((input: MarketingVideoRecord) => {
    void input;
    select(null);
  }, [select]);

  const remove = useCallback((id: string) => {
    void id;
    select(null);
  }, [select]);

  const toggleStatus = useCallback((id: string) => {
    void id;
  }, []);

  // FIX_REQUIRED: no dsh_marketing_* backend table/handler exists for videos yet.
  return {
    items, selected, draft, setDraft, select, save, remove, toggleStatus,
    reload: () => {},
    isBackedByApi: false,
    persistenceDisabledReason: "لا يوجد تكامل خلفي (backend) لاستوديو الفيديو حتى الآن — أوامر التعديل غير مفعّلة.",
  };
}

// usePartnerOffersController drives the operator review queue: it can review,
// approve, reject (with reason), and archive offers, but it never creates one
// — offers only ever originate from a partner's own submission
// (usePartnerSelfOffersController below).
export function usePartnerOffersController(authKind: string) {
  const [items, setItems] = useState<ReadonlyArray<PartnerOfferRecord>>([]);
  const [selected, setSelected] = useState<PartnerOfferRecord | null>(null);
  const [draft, setDraft] = useState<PartnerOfferRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { offers } = await fetchPartnerOffers();
      setItems(offers);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") { setItems([]); return; }
    void load();
  }, [authKind, load]);

  const select = useCallback((item: PartnerOfferRecord | null) => {
    setSelected(item);
    setDraft(item === null ? null : { ...item });
  }, []);

  const save = useCallback(async (input: PartnerOfferRecord) => {
    try {
      await updatePartnerOffer(input.id, {
        status: input.status,
        title: input.title,
        valueLabel: input.valueLabel,
        eligibility: input.eligibility,
        rejectionReason: input.rejectionReason,
        marginRiskNote: input.marginRiskNote,
      });
      setErrorMessage(null);
      await load();
      select(null);
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, [load, select]);

  const remove = useCallback(async (id: string) => {
    try {
      await archivePartnerOffer(id);
      setErrorMessage(null);
      await load();
      if (selected?.id === id) select(null);
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, [load, selected, select]);

  const toggleStatus = useCallback(async (id: string) => {
    const current = items.find(o => o.id === id);
    if (!current) return;
    const nextStatus = current.status === "published" ? "paused"
      : current.status === "review" ? "published"
      : current.status === "inbound" ? "review"
      : current.status;
    if (nextStatus === current.status) return;
    try {
      await updatePartnerOffer(id, { status: nextStatus });
      setErrorMessage(null);
      await load();
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, [items, load]);

  return {
    items, selected, draft, setDraft, select, save, remove, toggleStatus,
    reload: load,
    errorMessage,
    isBackedByApi: true as const,
  };
}

// usePartnerSelfOffersController drives an authenticated partner's own offer
// submissions (app-partner PromotionsScreen): list own offers, submit a new
// one for review. Partners can never edit or archive after submission — that
// belongs to the operator review queue above.
export function usePartnerSelfOffersController(authKind: string) {
  const [items, setItems] = useState<ReadonlyArray<PartnerOfferRecord>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { offers } = await fetchPartnerSelfOffers();
      setItems(offers);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") { setItems([]); return; }
    void load();
  }, [authKind, load]);

  const submit = useCallback(async (input: PartnerOfferSubmitPayload): Promise<boolean> => {
    setSubmitting(true);
    try {
      await submitPartnerSelfOffer(input);
      setErrorMessage(null);
      await load();
      return true;
    } catch (err) {
      setErrorMessage(resolveMsg(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [load]);

  return {
    items, submit, submitting,
    reload: load,
    errorMessage,
    isBackedByApi: true as const,
  };
}

export function useGrowthController(authKind: string) {
  const [items, setItems] = useState<ReadonlyArray<MarketingGrowthRecord>>([]);
  const [selected, setSelected] = useState<MarketingGrowthRecord | null>(null);
  const [draft, setDraft] = useState<MarketingGrowthRecord | null>(null);

  const select = useCallback((item: MarketingGrowthRecord | null) => {
    setSelected(item);
    setDraft(item === null ? createGrowthDraft() : { ...item });
  }, []);

  const save = useCallback((input: MarketingGrowthRecord) => {
    void input;
    select(null);
  }, [select]);

  const remove = useCallback((id: string) => {
    void id;
    select(null);
  }, [select]);

  const toggleStatus = useCallback((id: string) => {
    void id;
  }, []);

  // FIX_REQUIRED: no dsh_marketing_* backend table/handler exists for growth items yet.
  return {
    items, selected, draft, setDraft, select, save, remove, toggleStatus,
    reload: () => {},
    isBackedByApi: false,
    persistenceDisabledReason: "لا يوجد تكامل خلفي (backend) لعناصر النمو حتى الآن — أوامر التعديل غير مفعّلة.",
  };
}

export function useLoyaltyController() {
  const pointMultiplier = 0;
  const tiers: ReadonlyArray<{ readonly name: string; readonly minimumPoints: number; readonly multiplier: number }> = [];

  const updateMultiplier = useCallback((val: number) => {
    void val;
  }, []);

  const updateTierPoints = useCallback((name: string, points: number) => {
    void name;
    void points;
  }, []);

  // FIX_REQUIRED: no dsh_marketing_* / loyalty backend table exists.
  return {
    pointMultiplier, tiers, updateMultiplier, updateTierPoints,
    isBackedByApi: false,
    persistenceDisabledReason: "لا يوجد تكامل خلفي (backend) لبرنامج الولاء حتى الآن — أوامر التعديل غير مفعّلة.",
  };
}

export type OperationalMetrics = {
  readonly completedOrdersRate: string;
  readonly totalOrders: string;
  readonly deliveryCompletionRate: string;
  readonly declinedAssignments: string;
};

// This hook powers SignalsMeasurementCommandDeck's live operational metrics.
// It previously also exposed a client-only "gate bypass" toggle
// (bypassedGates/toggleBypass) that had no backend binding and no UI ever
// rendered it — a local-only governance override with zero enforcement
// effect. Removed rather than wired up: real visibility-gate enforcement
// already lives server-side in marketing.ValidateTarget /
// WriteVisibilityGateCheck and is fail-closed by design; a client bypass
// would only recreate the local-truth problem this slice closes.
export function useVisibilityGatesController() {
  const [metrics, setMetrics] = useState<OperationalMetrics>({
    completedOrdersRate: "0%",
    totalOrders: "0 طلب",
    deliveryCompletionRate: "0%",
    declinedAssignments: "0 رفض",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [orders, delivery] = await Promise.all([
        fetchOrderAnalytics("today"),
        fetchDeliveryAnalytics("today"),
      ]);
      const deliveredOrders = orders.byStatus.find(item => item.status === "delivered")?.count ?? 0;
      const completedOrdersRate = orders.totalOrders > 0
        ? `${Math.round((deliveredOrders / orders.totalOrders) * 100)}%`
        : "0%";
      const deliveryCompletionRate = delivery.acceptedAssignments > 0
        ? `${Math.round((delivery.completedAssignments / delivery.acceptedAssignments) * 100)}%`
        : "0%";
      setMetrics({
        completedOrdersRate,
        totalOrders: `${orders.totalOrders.toLocaleString("ar")} طلب`,
        deliveryCompletionRate,
        declinedAssignments: `${delivery.declinedAssignments.toLocaleString("ar")} رفض`,
      });
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(resolveMsg(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    metrics,
    reload: load,
    errorMessage,
    isBackedByApi: true as const,
  };
}

export function useMarketingKpiMetricsController() {
  const [metrics, setMetrics] = useState<MarketingKpiMetrics>(() => buildMarketingKpiMetrics());

  const load = useCallback(async () => {
    try {
      const [platform, stores] = await Promise.all([
        fetchPlatformKpis("today"),
        fetchStoreAnalytics(),
      ]);
      setMetrics({
        activeStoresRatio: `${stores.activeStores.toLocaleString("ar")}/${stores.totalStores.toLocaleString("ar")}`,
        deliveredOrders: platform.deliveredOrders,
        openTickets: platform.openTickets,
        openEscalations: platform.openEscalations,
        isBackedByApi: true,
      });
    } catch (err) {
      setMetrics({
        ...buildMarketingKpiMetrics(),
        disclosureReason: resolveMsg(err),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { metrics, reload: load };
}

export function useMarketingDeliverySignalsController() {
  const [items, setItems] = useState<readonly DeliverySignalCardViewModel[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const support = await fetchSupportAnalytics("today");
      setItems(buildDeliverySignalCards(support));
      setErrorMessage(null);
    } catch (err) {
      setItems([]);
      setErrorMessage(resolveMsg(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, reload: load, errorMessage };
}

export type CatalogReviewItem = {
  readonly id: string;
  readonly name: string;
  readonly hasBadImage: boolean;
  readonly reason: string;
};

export function useCatalogReviewController() {
  const [items, setItems] = useState<ReadonlyArray<CatalogReviewItem>>([]);

  const load = useCallback(() => {
    setItems([]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approveImage = useCallback((id: string) => {
    void id;
  }, []);

  // FIX_REQUIRED: no dsh_marketing_* backend table/handler exists for image/product
  // review yet; load() always resolves to an empty list and approveImage is fail-closed.
  return {
    items, approveImage, reload: load,
    isBackedByApi: false,
    persistenceDisabledReason: "لا يوجد تكامل خلفي (backend) لمراجعة صور المنتجات حتى الآن.",
  };
}

export function useCampaignsController(authKind: string) {
  const [state, setState] = useState<DshMarketingState<DshCampaign>>({ kind: "idle" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { campaigns } = await fetchCampaigns();
      setState({ kind: "success", items: campaigns });
    } catch (err) {
      setState({ kind: "error", message: resolveMsg(err) });
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") { setState({ kind: "idle" }); return; }
    load();
  }, [authKind, load]);

  return {
    state, reload: load,
    create: async (body: { title: string; description?: string; startDate?: string; endDate?: string }) => {
      await createCampaign(body); await load();
    },
    update: async (id: string, body: { status?: string; title?: string }) => {
      await updateCampaign(id, body); await load();
    },
    remove: async (id: string) => { await archiveCampaign(id); await load(); },
  };
}
