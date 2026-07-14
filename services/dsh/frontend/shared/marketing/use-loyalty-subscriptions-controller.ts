"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  LoyaltyTierRecord,
  LoyaltyTierStatus,
  LoyaltyProgramSummary,
  SubscriptionPlanRecord,
  SubscriptionPlanStatus,
  SubscriptionBillingCycle,
  SubscriptionsSummary,
} from "./loyalty-subscriptions.types";

// ─── Seed data ─────────────────────────────────────────────────────────────
// Phase 7: control panel is real and connected to this registry.
// When the real API is ready, replace the seed with HTTP calls.

const SEED_TIERS: LoyaltyTierRecord[] = [
  {
    id: "tier-bronze",
    nameAr: "برونزي",
    nameEn: "Bronze",
    minPoints: 0,
    discountPercent: 3,
    freeDeliveryThreshold: 0,
    badge: "🥉",
    status: "active",
    createdAt: "2026-01-01",
    updatedAt: "2026-07-01",
  },
  {
    id: "tier-silver",
    nameAr: "فضي",
    nameEn: "Silver",
    minPoints: 500,
    discountPercent: 7,
    freeDeliveryThreshold: 0,
    badge: "🥈",
    status: "active",
    createdAt: "2026-01-01",
    updatedAt: "2026-07-01",
  },
  {
    id: "tier-gold",
    nameAr: "ذهبي",
    nameEn: "Gold",
    minPoints: 1500,
    discountPercent: 12,
    freeDeliveryThreshold: 3000,
    badge: "🥇",
    status: "active",
    createdAt: "2026-01-01",
    updatedAt: "2026-07-01",
  },
];

const SEED_PLANS: SubscriptionPlanRecord[] = [
  {
    id: "plan-basic",
    nameAr: "اشتراك أساسي",
    nameEn: "Basic",
    priceYer: 990,
    billingCycle: "monthly",
    includeFreeDelivery: false,
    pointsMultiplier: 1,
    orderCap: 10,
    badge: "🎟",
    status: "active",
    subscriberCount: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-07-01",
  },
  {
    id: "plan-pro",
    nameAr: "اشتراك برو",
    nameEn: "Pro",
    priceYer: 1990,
    billingCycle: "monthly",
    includeFreeDelivery: true,
    pointsMultiplier: 2,
    orderCap: 0,
    badge: "🚀",
    status: "active",
    subscriberCount: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-07-01",
  },
];

// In-memory store so edits survive within a session.
let _tiers: LoyaltyTierRecord[] = [...SEED_TIERS];
let _plans: SubscriptionPlanRecord[] = [...SEED_PLANS];

// ─── Loyalty Controller ──────────────────────────────────────────────────

export function useLoyaltyController(authKind: "authenticated" | string) {
  const [tiers, setTiers] = useState<readonly LoyaltyTierRecord[]>(_tiers);
  const [selected, setSelected] = useState<LoyaltyTierRecord | null>(null);
  const [draft, setDraft] = useState<LoyaltyTierRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authKind !== "authenticated") return;
    setTiers([..._tiers]);
  }, [authKind]);

  const select = useCallback((tier: LoyaltyTierRecord | null) => {
    setSelected(tier);
    setDraft(tier ? { ...tier } : null);
    setErrorMessage(null);
  }, []);

  const save = useCallback((updated: LoyaltyTierRecord) => {
    _tiers = _tiers.map((t) => (t.id === updated.id ? updated : t));
    setTiers([..._tiers]);
    setSelected(null);
    setDraft(null);
  }, []);

  const create = useCallback((input: {
    nameAr: string;
    nameEn: string;
    minPoints: number;
    discountPercent: number;
    freeDeliveryThreshold: number;
    badge: string;
  }) => {
    const newTier: LoyaltyTierRecord = {
      id: `tier-${Date.now()}`,
      ...input,
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    _tiers = [..._tiers, newTier];
    setTiers([..._tiers]);
  }, []);

  const toggleStatus = useCallback((id: string) => {
    _tiers = _tiers.map((t) =>
      t.id === id
        ? { ...t, status: (t.status === "active" ? "paused" : "active") as LoyaltyTierStatus }
        : t,
    );
    setTiers([..._tiers]);
  }, []);

  const summary: LoyaltyProgramSummary = {
    activeTiers: tiers.filter((t) => t.status === "active").length,
    totalEnrolledClients: 0,
    pointsIssuedThisMonth: 0,
    isBackedByApi: false,
  };

  return { tiers, selected, draft, setDraft, errorMessage, setErrorMessage, select, save, create, toggleStatus, summary };
}

// ─── Subscriptions Controller ────────────────────────────────────────────

export function useSubscriptionsController(authKind: "authenticated" | string) {
  const [plans, setPlans] = useState<readonly SubscriptionPlanRecord[]>(_plans);
  const [selected, setSelected] = useState<SubscriptionPlanRecord | null>(null);
  const [draft, setDraft] = useState<SubscriptionPlanRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authKind !== "authenticated") return;
    setPlans([..._plans]);
  }, [authKind]);

  const select = useCallback((plan: SubscriptionPlanRecord | null) => {
    setSelected(plan);
    setDraft(plan ? { ...plan } : null);
    setErrorMessage(null);
  }, []);

  const save = useCallback((updated: SubscriptionPlanRecord) => {
    _plans = _plans.map((p) => (p.id === updated.id ? updated : p));
    setPlans([..._plans]);
    setSelected(null);
    setDraft(null);
  }, []);

  const create = useCallback((input: {
    nameAr: string;
    nameEn: string;
    priceYer: number;
    billingCycle: SubscriptionBillingCycle;
    includeFreeDelivery: boolean;
    pointsMultiplier: number;
    orderCap: number;
    badge: string;
  }) => {
    const newPlan: SubscriptionPlanRecord = {
      id: `plan-${Date.now()}`,
      ...input,
      status: "draft",
      subscriberCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    _plans = [..._plans, newPlan];
    setPlans([..._plans]);
  }, []);

  const toggleStatus = useCallback((id: string) => {
    _plans = _plans.map((p) =>
      p.id === id
        ? { ...p, status: (p.status === "active" ? "paused" : "active") as SubscriptionPlanStatus }
        : p,
    );
    setPlans([..._plans]);
  }, []);

  const summary: SubscriptionsSummary = {
    activePlans: plans.filter((p) => p.status === "active").length,
    totalActiveSubscribers: plans.reduce((sum, p) => sum + p.subscriberCount, 0),
    mrr: plans
      .filter((p) => p.status === "active")
      .reduce((sum, p) => sum + p.priceYer * p.subscriberCount, 0),
    isBackedByApi: false,
  };

  return { plans, selected, draft, setDraft, errorMessage, setErrorMessage, select, save, create, toggleStatus, summary };
}

// ─── Public accessors for Client App benefits hub ────────────────────────

export function getLoyaltyTiers(): readonly LoyaltyTierRecord[] {
  return _tiers.filter((t) => t.status === "active");
}

export function getSubscriptionPlans(): readonly SubscriptionPlanRecord[] {
  return _plans.filter((p) => p.status === "active");
}
