"use client";

import { useCallback, useEffect, useState } from "react";
import {
  archiveCampaign,
  createCampaign,
  fetchCampaigns,
  updateCampaign,
  type CampaignCreatePayload,
} from "./marketing.api";
import type { GovernedCampaignWritePayload, GovernedDshCampaign } from "./campaign.types";
import type { DshMarketingState } from "./marketing.types";

type GovernedCampaignCreatePayload = CampaignCreatePayload & {
  readonly targetCityCode?: string | undefined;
  readonly targetServiceAreaCode?: string | undefined;
};

function resolveCampaignError(error: unknown): string {
  const candidate = error as { readonly status?: number; readonly message?: string; readonly kind?: string } | undefined;
  if (candidate?.kind === "network") return "لا يوجد اتصال. تحقق من الشبكة ثم أعد المحاولة.";
  if (candidate?.status === 401) return "انتهت الجلسة. سجّل الدخول ثم أعد المحاولة.";
  if (candidate?.status === 403) return "لا تملك صلاحية إدارة الحملات.";
  if (candidate?.status === 409) return candidate.message || "تغيرت الحملة. أعد التحميل قبل تكرار الإجراء.";
  if (candidate?.status === 400) return candidate.message || "بيانات الحملة أو الجدولة أو المنطقة غير صالحة.";
  return candidate?.message || "تعذر تنفيذ إجراء الحملة.";
}

export function useGovernedCampaignsController(authKind: string) {
  const [state, setState] = useState<DshMarketingState<GovernedDshCampaign>>({ kind: "idle" });
  const isAuthenticated = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setState({ kind: "idle" });
      return false;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetchCampaigns();
      setState({ kind: "success", items: response.campaigns });
      return true;
    } catch (error) {
      setState({ kind: "error", message: resolveCampaignError(error) });
      return false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (body: GovernedCampaignCreatePayload) => {
    try {
      await createCampaign(body);
      await load();
    } catch (error) {
      throw new Error(resolveCampaignError(error));
    }
  }, [load]);

  const update = useCallback(async (
    campaign: GovernedDshCampaign,
    patch: Omit<GovernedCampaignWritePayload, "expectedVersion">,
  ) => {
    try {
      await updateCampaign(campaign.id, {
        ...patch,
        expectedVersion: campaign.version,
      });
      await load();
    } catch (error) {
      throw new Error(resolveCampaignError(error));
    }
  }, [load]);

  const remove = useCallback(async (campaignId: string) => {
    try {
      await archiveCampaign(campaignId);
      await load();
    } catch (error) {
      throw new Error(resolveCampaignError(error));
    }
  }, [load]);

  return {
    state,
    reload: load,
    create,
    update,
    remove,
  };
}
