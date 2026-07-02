// Field partner drafts list controller — used by the app-field home/tasks screen.
// Scoped to the calling field actor's own submissions via GET /dsh/field/partners.
"use client";

import { useCallback, useEffect, useState } from "react";
import { fieldListDrafts, type DshPartnerListState } from "../partner";

function resolveErrorMessage(err: unknown): string {
  const e = err as { status?: number };
  if (e?.status === 401) return "جلسة منتهية — يرجى تسجيل الدخول مجدداً";
  if (e?.status === 403) return "غير مصرح لك بهذه العملية";
  return "تعذر تحميل القائمة، يرجى المحاولة مجدداً";
}

export type FieldPartnerDraftsController = {
  listState: DshPartnerListState;
  retry: () => void;
};

export function useFieldPartnerDraftsController(): FieldPartnerDraftsController {
  const [listState, setListState] = useState<DshPartnerListState>({ kind: "idle" });

  const retry = useCallback(() => {
    setListState({ kind: "loading" });
    fieldListDrafts({ limit: 50, offset: 0 })
      .then((res) => {
        if (res.partners.length === 0) {
          setListState({ kind: "empty" });
        } else {
          setListState({ kind: "success", partners: res.partners, total: res.pagination.total, page: 0 });
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
