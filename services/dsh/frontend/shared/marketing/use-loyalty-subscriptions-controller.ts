"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createLoyaltyTier,
  createSubscriptionPlan,
  fetchClientBenefits,
  fetchLoyaltyTiers,
  fetchSubscriptionPlans,
  updateLoyaltyTier,
  updateSubscriptionPlan,
} from "./marketing.api";
import type {
  ClientBenefitsPayload,
  LoyaltyProgramSummary,
  LoyaltyTierRecord,
  SubscriptionBillingCycle,
  SubscriptionPlanRecord,
  SubscriptionsSummary,
} from "./loyalty-subscriptions.types";

const EMPTY_LOYALTY_SUMMARY: LoyaltyProgramSummary = {
  activeTiers: 0,
  totalEnrolledClients: 0,
  pointsIssuedThisMonth: 0,
  isBackedByApi: true,
};

const EMPTY_SUBSCRIPTIONS_SUMMARY: SubscriptionsSummary = {
  activePlans: 0,
  totalActiveSubscribers: 0,
  mrr: 0,
  isBackedByApi: true,
};

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "تعذر إتمام العملية. أعد تحميل البيانات ثم حاول مرة أخرى.";
}

export function useLoyaltyController(authKind: "authenticated" | string) {
  const [tiers, setTiers] = useState<readonly LoyaltyTierRecord[]>([]);
  const [summary, setSummary] = useState<LoyaltyProgramSummary>(EMPTY_LOYALTY_SUMMARY);
  const [selected, setSelected] = useState<LoyaltyTierRecord | null>(null);
  const [draft, setDraft] = useState<LoyaltyTierRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isAuthenticated = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuthenticated) return false;
    setLoading(true);
    try {
      const response = await fetchLoyaltyTiers();
      setTiers(response.tiers);
      setSummary(response.summary);
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { void load(); }, [load]);

  const select = useCallback((tier: LoyaltyTierRecord | null) => {
    setSelected(tier);
    setDraft(tier ? { ...tier } : null);
    setErrorMessage(null);
  }, []);

  const save = useCallback(async (updated: LoyaltyTierRecord) => {
    setLoading(true);
    try {
      await updateLoyaltyTier(updated.id, {
        nameAr: updated.nameAr,
        nameEn: updated.nameEn,
        minPoints: updated.minPoints,
        discountPercent: updated.discountPercent,
        freeDeliveryThreshold: updated.freeDeliveryThreshold,
        badge: updated.badge,
        expectedVersion: updated.version,
      });
      await load();
      setSelected(null);
      setDraft(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [load]);

  const create = useCallback(async (input: {
    nameAr: string;
    nameEn: string;
    minPoints: number;
    discountPercent: number;
    freeDeliveryThreshold: number;
    badge: string;
  }) => {
    setLoading(true);
    try {
      await createLoyaltyTier(input);
      await load();
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [load]);

  const toggleStatus = useCallback(async (id: string) => {
    const tier = tiers.find((candidate) => candidate.id === id);
    if (!tier) return false;
    setLoading(true);
    try {
      await updateLoyaltyTier(id, {
        status: tier.status === "active" ? "paused" : "active",
        expectedVersion: tier.version,
      });
      await load();
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [load, tiers]);

  return {
    tiers,
    selected,
    draft,
    setDraft,
    errorMessage,
    setErrorMessage,
    select,
    save,
    create,
    toggleStatus,
    summary,
    loading,
    reload: load,
  };
}

export function useSubscriptionsController(authKind: "authenticated" | string) {
  const [plans, setPlans] = useState<readonly SubscriptionPlanRecord[]>([]);
  const [summary, setSummary] = useState<SubscriptionsSummary>(EMPTY_SUBSCRIPTIONS_SUMMARY);
  const [selected, setSelected] = useState<SubscriptionPlanRecord | null>(null);
  const [draft, setDraft] = useState<SubscriptionPlanRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isAuthenticated = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuthenticated) return false;
    setLoading(true);
    try {
      const response = await fetchSubscriptionPlans();
      setPlans(response.plans);
      setSummary(response.summary);
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { void load(); }, [load]);

  const select = useCallback((plan: SubscriptionPlanRecord | null) => {
    setSelected(plan);
    setDraft(plan ? { ...plan } : null);
    setErrorMessage(null);
  }, []);

  const save = useCallback(async (updated: SubscriptionPlanRecord) => {
    setLoading(true);
    try {
      await updateSubscriptionPlan(updated.id, {
        nameAr: updated.nameAr,
        nameEn: updated.nameEn,
        priceYer: updated.priceYer,
        billingCycle: updated.billingCycle,
        includeFreeDelivery: updated.includeFreeDelivery,
        pointsMultiplier: updated.pointsMultiplier,
        orderCap: updated.orderCap,
        badge: updated.badge,
        wltProductReference: updated.wltProductReference,
        expectedVersion: updated.version,
      });
      await load();
      setSelected(null);
      setDraft(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [load]);

  const create = useCallback(async (input: {
    nameAr: string;
    nameEn: string;
    priceYer: number;
    billingCycle: SubscriptionBillingCycle;
    includeFreeDelivery: boolean;
    pointsMultiplier: number;
    orderCap: number;
    badge: string;
  }) => {
    setLoading(true);
    try {
      await createSubscriptionPlan(input);
      await load();
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [load]);

  const toggleStatus = useCallback(async (id: string) => {
    const plan = plans.find((candidate) => candidate.id === id);
    if (!plan) return false;
    setLoading(true);
    try {
      await updateSubscriptionPlan(id, {
        status: plan.status === "active" ? "paused" : "active",
        expectedVersion: plan.version,
      });
      await load();
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [load, plans]);

  return {
    plans,
    selected,
    draft,
    setDraft,
    errorMessage,
    setErrorMessage,
    select,
    save,
    create,
    toggleStatus,
    summary,
    loading,
    reload: load,
  };
}

export type ClientBenefitsState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "empty" }
  | { readonly kind: "success"; readonly benefits: ClientBenefitsPayload };

export function useClientBenefitsController(authKind: "authenticated" | string = "authenticated") {
  const [state, setState] = useState<ClientBenefitsState>({ kind: "loading" });
  const isAuthenticated = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ kind: "error", message: "يلزم تسجيل الدخول لعرض المزايا." });
      return false;
    }
    setState({ kind: "loading" });
    try {
      const { benefits } = await fetchClientBenefits();
      const hasData = Boolean(
        benefits.loyaltyAccount
        || benefits.activeSubscription
        || benefits.availableTiers.length
        || benefits.availablePlans.length
        || benefits.offers.length,
      );
      setState(hasData ? { kind: "success", benefits } : { kind: "empty" });
      return true;
    } catch (error) {
      setState({ kind: "error", message: resolveErrorMessage(error) });
      return false;
    }
  }, [isAuthenticated]);

  useEffect(() => { void load(); }, [load]);

  const benefits = useMemo(
    () => state.kind === "success" ? state.benefits : null,
    [state],
  );

  return { state, benefits, reload: load };
}
