import { useCallback, useEffect, useState, useMemo } from "react";
import {
  fetchCampaigns, createCampaign, updateCampaign, archiveCampaign,
  fetchTickers, createTicker, updateTicker, deleteTicker,
} from "./marketing.api";
import type { DshCampaign, DshMarketingState } from "./marketing.types";
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

export function createPartnerOfferDraft(overrides: Partial<PartnerOfferRecord> = {}): PartnerOfferRecord {
  return {
    id: `off-temp-${Date.now()}`,
    partnerName: "",
    storeId: "",
    storeLabel: "",
    productId: "",
    productLabel: "",
    category: "restaurants",
    offerType: "discount",
    status: "inbound",
    source: "partner",
    title: "",
    valueLabel: "",
    eligibility: "all",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

  const toWritePayload = (input: MarketingNewsTickerItem) => ({
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
    openHour: input.openHour,
    closeHour: input.closeHour,
    cooldownMinutes: input.cooldownMinutes,
    repeatGapMinutes: input.repeatGapMinutes,
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
    const normalized = { ...input };
    if (normalized.id.startsWith("vid-temp-")) {
      normalized.id = `vid-${Date.now()}`;
    }
    setItems(prev => {
      const idx = prev.findIndex(v => v.id === normalized.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = normalized;
        return next;
      }
      return [...prev, normalized];
    });
    select(null);
  }, [select]);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(v => v.id !== id));
    if (selected?.id === id) select(null);
  }, [selected, select]);

  const toggleStatus = useCallback((id: string) => {
    setItems(prev => prev.map(v => {
      if (v.id !== id) return v;
      const nextStatus: MarketingVideoStatus = v.status === "published" ? "paused" : "published";
      return { ...v, status: nextStatus };
    }));
  }, []);

  // FIX_REQUIRED: no dsh_marketing_* backend table/handler exists for videos yet.
  return {
    items, selected, draft, setDraft, select, save, remove, toggleStatus,
    reload: () => {},
    isBackedByApi: false,
    persistenceDisabledReason: "لا يوجد تكامل خلفي (backend) لاستوديو الفيديو حتى الآن — التعديلات هنا محلية ولا تُحفظ.",
  };
}

export function usePartnerOffersController(authKind: string) {
  const [items, setItems] = useState<ReadonlyArray<PartnerOfferRecord>>([]);
  const [selected, setSelected] = useState<PartnerOfferRecord | null>(null);
  const [draft, setDraft] = useState<PartnerOfferRecord | null>(null);

  const select = useCallback((item: PartnerOfferRecord | null) => {
    setSelected(item);
    setDraft(item === null ? createPartnerOfferDraft() : { ...item });
  }, []);

  const save = useCallback((input: PartnerOfferRecord) => {
    const normalized = { ...input };
    if (normalized.id.startsWith("off-temp-")) {
      normalized.id = `off-${Date.now()}`;
    }
    setItems(prev => {
      const idx = prev.findIndex(o => o.id === normalized.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = normalized;
        return next;
      }
      return [...prev, normalized];
    });
    select(null);
  }, [select]);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(o => o.id !== id));
    if (selected?.id === id) select(null);
  }, [selected, select]);

  const toggleStatus = useCallback((id: string) => {
    setItems(prev => prev.map(o => {
      if (o.id !== id) return o;
      const nextStatus: PartnerOfferStatus = o.status === "published" ? "paused" : "published";
      return { ...o, status: nextStatus };
    }));
  }, []);

  // FIX_REQUIRED: no dsh_partner_offers backend table/handler exists yet — see
  // marketing_partner_offer_matrix.md. Partner-side submission already correctly
  // targets a review queue (not self-publish); the operator review side here is
  // still local-state only.
  return {
    items, selected, draft, setDraft, select, save, remove, toggleStatus,
    reload: () => {},
    isBackedByApi: false,
    persistenceDisabledReason: "لا يوجد تكامل خلفي (backend) لعروض الشركاء حتى الآن — التعديلات هنا محلية ولا تُحفظ.",
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
    const normalized = { ...input };
    if (normalized.id.startsWith("grow-temp-")) {
      normalized.id = `grow-${Date.now()}`;
    }
    setItems(prev => {
      const idx = prev.findIndex(g => g.id === normalized.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = normalized;
        return next;
      }
      return [...prev, normalized];
    });
    select(null);
  }, [select]);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(g => g.id !== id));
    if (selected?.id === id) select(null);
  }, [selected, select]);

  const toggleStatus = useCallback((id: string) => {
    setItems(prev => prev.map(g => {
      if (g.id !== id) return g;
      const nextStatus: MarketingGrowthStatus = g.status === "published" ? "paused" : "published";
      return { ...g, status: nextStatus };
    }));
  }, []);

  // FIX_REQUIRED: no dsh_marketing_* backend table/handler exists for growth items yet.
  return {
    items, selected, draft, setDraft, select, save, remove, toggleStatus,
    reload: () => {},
    isBackedByApi: false,
    persistenceDisabledReason: "لا يوجد تكامل خلفي (backend) لعناصر النمو حتى الآن — التعديلات هنا محلية ولا تُحفظ.",
  };
}

export function useLoyaltyController() {
  const [pointMultiplier, setPointMultiplier] = useState(1.5);
  const [tiers, setTiers] = useState([
    { name: "برونزي", minimumPoints: 0, multiplier: 1.0 },
    { name: "فضي", minimumPoints: 500, multiplier: 1.2 },
    { name: "ذهبي", minimumPoints: 1500, multiplier: 1.5 },
  ]);

  const updateMultiplier = useCallback((val: number) => {
    setPointMultiplier(val);
  }, []);

  const updateTierPoints = useCallback((name: string, points: number) => {
    setTiers(prev => prev.map(t => t.name === name ? { ...t, minimumPoints: points } : t));
  }, []);

  // FIX_REQUIRED: no dsh_marketing_* / loyalty backend table exists — this whole
  // controller is a local-state simulation with hardcoded default tiers.
  return {
    pointMultiplier, tiers, updateMultiplier, updateTierPoints,
    isBackedByApi: false,
    persistenceDisabledReason: "لا يوجد تكامل خلفي (backend) لبرنامج الولاء حتى الآن — القيم هنا افتراضية ومحلية ولا تُحفظ.",
  };
}

export type OperationalMetrics = {
  readonly averageRating: string;
  readonly ratedOrdersCount: string;
  readonly onTimeDeliveryRate: string;
  readonly delayedOrdersCount: string;
};

export function useVisibilityGatesController() {
  const [bypassedGates, setBypassedGates] = useState<Set<string>>(new Set());
  const metrics = useMemo<OperationalMetrics>(() => ({
    averageRating: "4.85★",
    ratedOrdersCount: "2,450 طلب",
    onTimeDeliveryRate: "94.2%",
    delayedOrdersCount: "2 طلب",
  }), []);

  const toggleBypass = useCallback((gateId: string) => {
    setBypassedGates(prev => {
      const next = new Set(prev);
      if (next.has(gateId)) next.delete(gateId);
      else next.add(gateId);
      return next;
    });
  }, []);

  // FIX_REQUIRED: `metrics` are hardcoded placeholder numbers, not runtime data
  // (no delivery/rating backend query is wired here). toggleBypass is a local-only
  // UI toggle and does not call any governance API.
  return {
    bypassedGates, toggleBypass, metrics,
    isBackedByApi: false,
    persistenceDisabledReason: "المقاييس هنا ثابتة (placeholder) وبوابة التجاوز محلية فقط — لا يوجد تكامل خلفي حتى الآن.",
  };
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
    setItems(prev => prev.map(item => item.id === id ? { ...item, hasBadImage: false } : item));
  }, []);

  // FIX_REQUIRED: no dsh_marketing_* backend table/handler exists for image/product
  // review yet; load() always resolves to an empty list and approveImage is local-only.
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
