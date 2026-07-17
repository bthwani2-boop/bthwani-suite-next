import { useCallback, useEffect, useState } from "react";
import {
  createLoyaltyTier,
  createSubscriptionPlan,
  fetchClientBenefits,
  fetchLoyaltyTiers,
  fetchSubscriptionPlans,
  updateLoyaltyTier,
  updateSubscriptionPlan,
  type LoyaltyTierCreatePayload,
  type LoyaltyTierUpdatePayload,
  type SubscriptionPlanCreatePayload,
  type SubscriptionPlanUpdatePayload,
} from "./marketing.api";
import type {
  ClientBenefitsPayload,
  LoyaltyProgramSummary,
  LoyaltyTierRecord,
  SubscriptionPlanRecord,
  SubscriptionsSummary,
} from "./loyalty-subscriptions.types";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "UNKNOWN_ERROR";
}

type CollectionState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly items: readonly T[] }
  | { readonly kind: "error"; readonly message: string };

const EMPTY_LOYALTY_SUMMARY: LoyaltyProgramSummary = {
  activeTiers: 0,
  totalEnrolledClients: 0,
  pointsIssuedThisMonth: 0,
  isBackedByApi: false,
};

const EMPTY_SUBSCRIPTIONS_SUMMARY: SubscriptionsSummary = {
  activePlans: 0,
  totalActiveSubscribers: 0,
  mrr: 0,
  isBackedByApi: false,
};

export function useLoyaltyTiersController(authKind: string) {
  const [state, setState] = useState<CollectionState<LoyaltyTierRecord>>({ kind: "idle" });
  const [summary, setSummary] = useState<LoyaltyProgramSummary>(EMPTY_LOYALTY_SUMMARY);
  const [selected, setSelected] = useState<LoyaltyTierRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetchLoyaltyTiers();
      setSummary(response.summary);
      setState({ kind: "success", items: response.tiers });
      setActionError(null);
    } catch (error) {
      setSummary(EMPTY_LOYALTY_SUMMARY);
      setState({ kind: "error", message: messageOf(error) });
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      setSummary(EMPTY_LOYALTY_SUMMARY);
      return;
    }
    void load();
  }, [authKind, load]);

  const create = useCallback(async (payload: LoyaltyTierCreatePayload) => {
    setActionError(null);
    try {
      await createLoyaltyTier(payload);
      await load();
    } catch (error) {
      const message = messageOf(error);
      setActionError(message);
      throw error;
    }
  }, [load]);

  const update = useCallback(async (tier: LoyaltyTierRecord, payload: Omit<LoyaltyTierUpdatePayload, "expectedVersion">) => {
    setActionError(null);
    try {
      await updateLoyaltyTier(tier.id, { ...payload, expectedVersion: tier.version });
      setSelected(null);
      await load();
    } catch (error) {
      const message = messageOf(error);
      setActionError(message);
      throw error;
    }
  }, [load]);

  return { state, summary, selected, select: setSelected, actionError, reload: load, create, update };
}

export function useSubscriptionPlansController(authKind: string) {
  const [state, setState] = useState<CollectionState<SubscriptionPlanRecord>>({ kind: "idle" });
  const [summary, setSummary] = useState<SubscriptionsSummary>(EMPTY_SUBSCRIPTIONS_SUMMARY);
  const [selected, setSelected] = useState<SubscriptionPlanRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetchSubscriptionPlans();
      setSummary(response.summary);
      setState({ kind: "success", items: response.plans });
      setActionError(null);
    } catch (error) {
      setSummary(EMPTY_SUBSCRIPTIONS_SUMMARY);
      setState({ kind: "error", message: messageOf(error) });
    }
  }, []);

  useEffect(() => {
    if (authKind !== "authenticated") {
      setState({ kind: "idle" });
      setSummary(EMPTY_SUBSCRIPTIONS_SUMMARY);
      return;
    }
    void load();
  }, [authKind, load]);

  const create = useCallback(async (payload: SubscriptionPlanCreatePayload) => {
    setActionError(null);
    try {
      await createSubscriptionPlan(payload);
      await load();
    } catch (error) {
      const message = messageOf(error);
      setActionError(message);
      throw error;
    }
  }, [load]);

  const update = useCallback(async (plan: SubscriptionPlanRecord, payload: Omit<SubscriptionPlanUpdatePayload, "expectedVersion">) => {
    setActionError(null);
    try {
      await updateSubscriptionPlan(plan.id, { ...payload, expectedVersion: plan.version });
      setSelected(null);
      await load();
    } catch (error) {
      const message = messageOf(error);
      setActionError(message);
      throw error;
    }
  }, [load]);

  return { state, summary, selected, select: setSelected, actionError, reload: load, create, update };
}

type ClientBenefitsState =
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly benefits: ClientBenefitsPayload }
  | { readonly kind: "error"; readonly message: string };

export function useClientBenefitsController() {
  const [state, setState] = useState<ClientBenefitsState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetchClientBenefits();
      setState({ kind: "success", benefits: response.benefits });
    } catch (error) {
      setState({ kind: "error", message: messageOf(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
