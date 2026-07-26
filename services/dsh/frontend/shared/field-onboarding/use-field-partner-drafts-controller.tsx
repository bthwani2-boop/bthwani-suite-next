// Field partner drafts list controller — used by the app-field home/tasks screen.
// Scoped to the calling field actor's own submissions via GET /dsh/field/partners.
"use client";

import { useCallback, useEffect, useState } from "react";
import { fieldListDrafts, type DshPartnerListState, type DshPartnerSummary } from "../partner";

const PAGE_SIZE = 100;
const MAX_PARTNERS = 10_000;

function resolveErrorMessage(err: unknown): string {
  const e = err as { status?: number };
  if (e?.status === 401) return "جلسة منتهية — يرجى تسجيل الدخول مجدداً";
  if (e?.status === 403) return "غير مصرح لك بهذه العملية";
  return "تعذر تحميل القائمة، يرجى المحاولة مجدداً";
}

async function loadAllFieldPartners(): Promise<{
  partners: DshPartnerSummary[];
  total: number;
}> {
  const partners: DshPartnerSummary[] = [];
  let total = 0;
  let offset = 0;

  do {
    const response = await fieldListDrafts({ limit: PAGE_SIZE, offset });
    total = response.pagination.total;
    partners.push(...response.partners);
    offset += response.partners.length;

    if (response.partners.length === 0) break;
    if (partners.length >= MAX_PARTNERS && partners.length < total) {
      throw new Error("FIELD_PARTNER_LIST_LIMIT_EXCEEDED");
    }
  } while (partners.length < total);

  return { partners, total };
}

export type FieldPartnerDraftsController = {
  listState: DshPartnerListState;
  retry: () => void;
};

export function useFieldPartnerDraftsController(): FieldPartnerDraftsController {
  const [listState, setListState] = useState<DshPartnerListState>({ kind: "idle" });

  const retry = useCallback(() => {
    setListState({ kind: "loading" });
    loadAllFieldPartners()
      .then(({ partners, total }) => {
        if (partners.length === 0) {
          setListState({ kind: "empty" });
        } else {
          setListState({ kind: "success", partners, total, page: 0 });
        }
      })
      .catch((err) => {
        setListState({ kind: "error", message: resolveErrorMessage(err) });
      });
  }, []);

  useEffect(() => {
    retry();
  }, [retry]);

  return { listState, retry };
}
