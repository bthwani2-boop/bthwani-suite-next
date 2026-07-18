import { useCallback, useEffect, useState } from "react";
import {
  checkServiceability,
  clearCart,
  fetchCart,
  fetchOperatorCarts,
  removeCartItem,
  upsertCartItem,
} from "./cart.api";
import {
  resolveCartLoadError,
  resolveCartLoadState,
  resolveQuantityRemoval,
  resolveServiceabilityError,
  resolveServiceabilityState,
  shouldLoadCart,
} from "./cart.controller-core";
import { loadingState, serviceabilityIdleState } from "./cart.states";
import type {
  DshCart,
  DshCartActionState,
  DshCartState,
  DshFulfillmentMode,
  DshServiceabilityState,
} from "./cart.types";

type CartMutationError = {
  readonly kind?: string;
  readonly status?: number;
};

function mutationErrorMessage(error: unknown): string {
  const typed: CartMutationError =
    typeof error === "object" && error !== null ? error : {};
  if (typed.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return "سجّل الدخول بحساب العميل لتنفيذ عملية السلة.";
  }
  if (typed.kind === "network") {
    return "تعذر الوصول إلى DSH. تحقق من الشبكة ثم أعد المحاولة.";
  }
  return "رفض DSH عملية السلة أو تعذر إكمالها.";
}

export function useCartController(
  storeId: string | undefined,
  authKind = "unauthenticated",
) {
  const [state, setState] = useState<DshCartState>(loadingState());
  const [action, setAction] = useState<DshCartActionState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) {
      setState({ kind: "empty" });
      return;
    }
    setState(loadingState());
    try {
      const cart = await fetchCart(storeId);
      setState(resolveCartLoadState(cart));
    } catch (error) {
      const typed: CartMutationError =
        typeof error === "object" && error !== null ? error : {};
      setState(resolveCartLoadError(typed));
    }
  }, [storeId]);

  useEffect(() => {
    if (shouldLoadCart(authKind, storeId)) void load();
  }, [authKind, load, storeId]);

  const addItem = useCallback(
    async (input: {
      masterProductId: string;
      productName: string;
      priceReference?: string;
      quantity: number;
      fulfillmentMode?: DshFulfillmentMode;
    }): Promise<boolean> => {
      if (!storeId) return false;
      setAction("submitting");
      setActionError(null);
      try {
        await upsertCartItem({ storeId, ...input });
        await load();
        setAction("success");
        return true;
      } catch (error) {
        setAction("error");
        setActionError(mutationErrorMessage(error));
        return false;
      }
    },
    [storeId, load],
  );

  const removeItem = useCallback(
    async (cartId: string, itemId: string): Promise<boolean> => {
      setAction("submitting");
      setActionError(null);
      try {
        await removeCartItem(cartId, itemId);
        await load();
        setAction("success");
        return true;
      } catch (error) {
        setAction("error");
        setActionError(mutationErrorMessage(error));
        return false;
      }
    },
    [load],
  );

  const updateItemQuantity = useCallback(
    async (
      masterProductId: string,
      productName: string,
      quantity: number,
      priceReference?: string,
    ): Promise<boolean> => {
      if (!storeId) return false;
      const cart = state.kind === "success" ? state.cart : null;
      if (
        resolveQuantityRemoval(
          cart?.items.find((item) => item.masterProductId === masterProductId)
            ?.quantity ?? 1,
          quantity,
        ) === "remove"
      ) {
        const item = cart?.items.find(
          (candidate) => candidate.masterProductId === masterProductId,
        );
        if (item && cart) return removeItem(cart.id, item.id);
        return false;
      }

      setAction("submitting");
      setActionError(null);
      try {
        await upsertCartItem({
          storeId,
          masterProductId,
          productName,
          quantity,
          ...(priceReference !== undefined ? { priceReference } : {}),
        });
        await load();
        setAction("success");
        return true;
      } catch (error) {
        setAction("error");
        setActionError(mutationErrorMessage(error));
        return false;
      }
    },
    [storeId, state, load, removeItem],
  );

  const clear = useCallback(async (cart: DshCart): Promise<boolean> => {
    setAction("submitting");
    setActionError(null);
    try {
      await clearCart(cart.id);
      setState({ kind: "empty" });
      setAction("success");
      return true;
    } catch (error) {
      setAction("error");
      setActionError(mutationErrorMessage(error));
      return false;
    }
  }, []);

  return {
    state,
    action,
    actionError,
    retry: () => void load(),
    addItem,
    updateItemQuantity,
    removeItem,
    clear,
  };
}

export function useServiceabilityController() {
  const [serviceability, setServiceability] =
    useState<DshServiceabilityState>(serviceabilityIdleState());

  const check = useCallback(
    async (
      storeId: string,
      serviceAreaCode: string,
      latitude?: number,
      longitude?: number,
    ) => {
      setServiceability({ kind: "checking" });
      try {
        const result = await checkServiceability(
          storeId,
          serviceAreaCode,
          latitude,
          longitude,
        );
        setServiceability(resolveServiceabilityState(result));
      } catch {
        setServiceability(resolveServiceabilityError());
      }
    },
    [],
  );

  const reset = useCallback(
    () => setServiceability(serviceabilityIdleState()),
    [],
  );

  return { serviceability, check, reset };
}

export function useOperatorCartsController(authKind = "unauthenticated") {
  const [carts, setCarts] = useState<readonly DshCart[]>([]);
  const [loadState, setLoadState] = useState<
    "loading" | "success" | "empty" | "error"
  >("loading");

  const load = useCallback(async (stateFilter?: string) => {
    setLoadState("loading");
    try {
      const result = await fetchOperatorCarts(stateFilter);
      setCarts(result);
      setLoadState(result.length === 0 ? "empty" : "success");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  return {
    carts,
    loadState,
    reload: (stateFilter?: string) => void load(stateFilter),
  };
}
