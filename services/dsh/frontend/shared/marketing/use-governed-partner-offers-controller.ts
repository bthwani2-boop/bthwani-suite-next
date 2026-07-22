"use client";

import { useCallback, useEffect, useState } from "react";
import {
  archivePartnerOffer,
  fetchPartnerOffers,
  updatePartnerOffer,
} from "./marketing.api";
import type { PartnerOfferRecord } from "../partner/dsh-partner-offer-types";

function resolveError(error: unknown): string {
  const candidate = error as { readonly status?: number; readonly message?: string; readonly kind?: string } | undefined;
  if (candidate?.kind === "network") return "لا يوجد اتصال. تحقق من الشبكة ثم أعد المحاولة.";
  if (candidate?.status === 409) return candidate.message || "تعارض في الإصدار أو انتقال غير مسموح. أعد التحميل ثم راجع القرار.";
  if (candidate?.status === 400) return candidate.message || "العرض أو الجدولة غير صالحين.";
  if (candidate?.status === 422) return candidate.message || "العرض غير مؤهل للنشر.";
  if (candidate?.status === 403) return "لا تملك صلاحية إدارة العرض.";
  return candidate?.message || "تعذر تنفيذ قرار العرض.";
}

function nextOperationalStatus(status: PartnerOfferRecord["status"]): PartnerOfferRecord["status"] | null {
  switch (status) {
    case "inbound":
      return "review";
    case "review":
      return "marketing-ready";
    case "marketing-ready":
      return "published";
    case "published":
      return "paused";
    case "paused":
      return "published";
    default:
      return null;
  }
}

export function useGovernedPartnerOffersController(authKind: string) {
  const [items, setItems] = useState<readonly PartnerOfferRecord[]>([]);
  const [selected, setSelected] = useState<PartnerOfferRecord | null>(null);
  const [draft, setDraft] = useState<PartnerOfferRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isAuthenticated = authKind === "authenticated";

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return false;
    }
    setLoading(true);
    try {
      const response = await fetchPartnerOffers();
      setItems(response.offers);
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveError(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  const select = useCallback((offer: PartnerOfferRecord | null) => {
    setSelected(offer);
    setDraft(offer ? { ...offer } : null);
    setErrorMessage(null);
  }, []);

  const save = useCallback(async (offer: PartnerOfferRecord): Promise<boolean> => {
    setLoading(true);
    try {
      await updatePartnerOffer(offer.id, {
        status: offer.status,
        title: offer.title,
        valueLabel: offer.valueLabel,
        eligibility: offer.eligibility,
        activeFromDate: offer.activeFromDate,
        activeToDate: offer.activeToDate,
        rejectionReason: offer.rejectionReason,
        marginRiskNote: offer.marginRiskNote,
        couponId: offer.couponId,
        expectedVersion: offer.version,
      });
      await load();
      setSelected(null);
      setDraft(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveError(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [load]);

  const toggleStatus = useCallback(async (id: string): Promise<boolean> => {
    const current = items.find((offer) => offer.id === id);
    if (!current) return false;
    const nextStatus = nextOperationalStatus(current.status);
    if (!nextStatus) return false;
    if ((nextStatus === "marketing-ready" || nextStatus === "published") &&
      (!current.activeFromDate || !current.activeToDate)) {
      setErrorMessage("حدد تاريخ بداية ونهاية من شاشة المراجعة قبل اعتماد العرض.");
      return false;
    }
    if (current.offerType === "coupon" && nextStatus === "published" && !current.couponId) {
      setErrorMessage("اختر كوبون checkout نشطًا من شاشة المراجعة قبل النشر.");
      return false;
    }
    setLoading(true);
    try {
      await updatePartnerOffer(current.id, {
        status: nextStatus,
        couponId: current.couponId,
        expectedVersion: current.version,
      });
      await load();
      return true;
    } catch (error) {
      setErrorMessage(resolveError(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [items, load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      await archivePartnerOffer(id);
      await load();
      if (selected?.id === id) select(null);
      return true;
    } catch (error) {
      setErrorMessage(resolveError(error));
      return false;
    } finally {
      setLoading(false);
    }
  }, [load, select, selected]);

  return {
    items,
    selected,
    draft,
    setDraft,
    errorMessage,
    loading,
    reload: load,
    select,
    save,
    toggleStatus,
    remove,
  };
}
