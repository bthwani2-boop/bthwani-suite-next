"use client";

import * as React from "react";
import type { DshMarketingState, MarketingNewsTickerItem } from "./marketing.types";
import type { GovernedDshCampaign } from "./campaign.types";
import {
  archiveCampaign,
  createCampaign,
  createTicker,
  deleteTicker,
  fetchCampaigns,
  fetchTickers,
  updateCampaign,
  updateTicker,
} from "./marketing.api";

export type DshMarketingAuthState =
  | { readonly kind: "loading" }
  | { readonly kind: "unauthenticated" }
  | { readonly kind: "authenticated" };

export type DshMarketingController<T> = {
  readonly state: DshMarketingState<T>;
  readonly reload: () => Promise<void>;
  readonly create: (payload: Partial<T>) => Promise<void>;
  readonly update: (id: string, payload: Partial<T>) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
};

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "تعذر تنفيذ العملية التسويقية";
}

export function useCampaignsController(authKind: DshMarketingAuthState["kind"]): DshMarketingController<GovernedDshCampaign> {
  const [state, setState] = React.useState<DshMarketingState<GovernedDshCampaign>>({ kind: "idle" });
  const enabled = authKind === "authenticated";

  const reload = React.useCallback(async () => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetchCampaigns();
      setState({ kind: "success", items: response.campaigns });
    } catch (error) {
      setState({ kind: "error", message: readErrorMessage(error) });
    }
  }, [enabled]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const create = React.useCallback(async (body: Partial<GovernedDshCampaign>) => {
    await createCampaign({
      title: body.title ?? "",
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
      targetType: body.targetType,
      targetId: body.targetId,
      targetCityCode: body.targetCityCode,
      targetServiceAreaCode: body.targetServiceAreaCode,
      audience: body.audience,
      placement: body.placement,
    });
    await reload();
  }, [reload]);

  const update = React.useCallback(async (id: string, body: Partial<GovernedDshCampaign>) => {
    const current = state.kind === "success"
      ? state.items.find((campaign) => campaign.id === id)
      : undefined;
    await updateCampaign(id, {
      ...body,
      expectedVersion: current?.version,
    });
    await reload();
  }, [reload, state]);

  const remove = React.useCallback(async (id: string) => {
    await archiveCampaign(id);
    await reload();
  }, [reload]);

  return { state, reload, create, update, remove };
}

export function useMarketingTickersController(authKind: DshMarketingAuthState["kind"]): DshMarketingController<MarketingNewsTickerItem> {
  const [state, setState] = React.useState<DshMarketingState<MarketingNewsTickerItem>>({ kind: "idle" });
  const enabled = authKind === "authenticated";

  const reload = React.useCallback(async () => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetchTickers();
      setState({ kind: "success", items: response.tickers });
    } catch (error) {
      setState({ kind: "error", message: readErrorMessage(error) });
    }
  }, [enabled]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const create = React.useCallback(async (body: Partial<MarketingNewsTickerItem>) => {
    await createTicker({
      message: body.message ?? "",
      ...body,
    });
    await reload();
  }, [reload]);

  const update = React.useCallback(async (id: string, body: Partial<MarketingNewsTickerItem>) => {
    await updateTicker(id, body);
    await reload();
  }, [reload]);

  const remove = React.useCallback(async (id: string) => {
    await deleteTicker(id);
    await reload();
  }, [reload]);

  return { state, reload, create, update, remove };
}
