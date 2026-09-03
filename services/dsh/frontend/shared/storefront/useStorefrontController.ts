import { useEffect, useState } from "react";
import { fetchStorefront } from "./storefront.api";
import { DshRequestError } from "../_kernel/dsh-request-error";
import type { ClientStorefront } from "./storefront.api";

export type StorefrontState =
  | { kind: "loading" }
  | { kind: "success"; payload: ClientStorefront }
  | { kind: "error"; message: string }
  | { kind: "not_found"; message: string };

export function useStorefrontController(storeId: string) {
  const [state, setState] = useState<StorefrontState>({ kind: "loading" });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });

    fetchStorefront(storeId)
      .then((payload) => {
        if (!active) return;
        setState({ kind: "success", payload });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof DshRequestError && error.status === 404) {
          setState({
            kind: "not_found",
            message: "المتجر أو الكتالوج غير متوفر حالياً.",
          });
          return;
        }
        setState({
          kind: "error",
          message: error instanceof Error && error.message
            ? error.message
            : "حدث خطأ أثناء تحميل بيانات المتجر.",
        });
      });

    return () => {
      active = false;
    };
  }, [storeId, retryCount]);

  return {
    state,
    retry: () => setRetryCount((c) => c + 1),
  };
}
