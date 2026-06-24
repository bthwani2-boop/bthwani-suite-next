import { useCallback, useEffect, useState } from "react";
import {
  fetchCampaigns, createCampaign, updateCampaign, deleteCampaign,
  fetchBanners, createBanner, updateBanner, deleteBanner,
  fetchPromos, createPromo, updatePromo,
} from "./marketing.api";
import type { DshCampaign, DshBanner, DshPromo, DshMarketingState } from "./marketing.types";

function resolveMsg(err: unknown): string {
  const e = err as { kind?: string; status?: number } | undefined;
  if (e?.kind === "network") return "لا يوجد اتصال";
  if (e?.status === 401) return "الجلسة منتهية";
  return "تعذّر تحميل البيانات";
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
    remove: async (id: string) => { await deleteCampaign(id); await load(); },
  };
}

export function useBannersController(authKind: string) {
  const [state, setState] = useState<DshMarketingState<DshBanner>>({ kind: "idle" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { banners } = await fetchBanners();
      setState({ kind: "success", items: banners });
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
    create: async (body: { title: string; imageUrl?: string; position?: number }) => {
      await createBanner(body); await load();
    },
    toggle: async (id: string, isActive: boolean) => { await updateBanner(id, { isActive }); await load(); },
    remove: async (id: string) => { await deleteBanner(id); await load(); },
  };
}

export function usePromosController(authKind: string) {
  const [state, setState] = useState<DshMarketingState<DshPromo>>({ kind: "idle" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { promos } = await fetchPromos();
      setState({ kind: "success", items: promos });
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
    create: async (body: { code: string; description?: string; expiresAt?: string }) => {
      await createPromo(body); await load();
    },
    updateStatus: async (id: string, status: string) => { await updatePromo(id, { status }); await load(); },
  };
}
