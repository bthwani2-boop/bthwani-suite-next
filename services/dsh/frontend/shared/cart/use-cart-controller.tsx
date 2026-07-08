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
import type { DshCart, DshCartActionState, DshCartState, DshFulfillmentMode, DshServiceabilityState } from "./cart.types";

export function useCartController(storeId: string | undefined, authKind = "unauthenticated") {
  const [state, setState] = useState<DshCartState>(loadingState());
  const [action, setAction] = useState<DshCartActionState>("idle");

  const load = useCallback(async () => {
    if (!storeId) { setState({ kind: "empty" }); return; }
    setState(loadingState());
    try {
      const cart = await fetchCart(storeId);
      setState(resolveCartLoadState(cart));
    } catch (error) {
      setState(resolveCartLoadError(error as { kind?: string; status?: number }));
    }
  }, [storeId]);

  useEffect(() => {
    if (shouldLoadCart(authKind, storeId)) void load();
  }, [authKind, load, storeId]);

  const addItem = useCallback(
    async (input: { masterProductId: string; productName: string; priceReference?: string; quantity: number; fulfillmentMode?: DshFulfillmentMode }) => {
      if (!storeId) return;
      setAction("submitting");
      try { await upsertCartItem({ storeId, ...input }); setAction("success"); await load(); }
      catch { setAction("error"); }
    },
    [storeId, load],
  );

  const updateItemQuantity = useCallback(
    async (masterProductId: string, productName: string, quantity: number, priceReference?: string) => {
      if (!storeId) return;
      const cart = state.kind === "success" ? state.cart : null;
      if (resolveQuantityRemoval(cart?.items.find((i) => i.masterProductId === masterProductId)?.quantity ?? 1, quantity) === "remove") {
        const item = cart?.items.find((i) => i.masterProductId === masterProductId);
        if (item) await removeItem(cart!.id, item.id);
        return;
      }
      setAction("submitting");
      try {
        await upsertCartItem({ storeId, masterProductId, productName, quantity, ...(priceReference !== undefined ? { priceReference } : {}) });
        setAction("success"); await load();
      } catch { setAction("error"); }
    },
    [storeId, state, load],
  );

  const removeItem = useCallback(
    async (cartId: string, itemId: string) => {
      setAction("submitting");
      try { await removeCartItem(cartId, itemId); setAction("success"); await load(); }
      catch { setAction("error"); }
    },
    [load],
  );

  const clear = useCallback(async (cart: DshCart) => {
    setAction("submitting");
    try { await clearCart(cart.id); setAction("success"); setState({ kind: "empty" }); }
    catch { setAction("error"); }
  }, []);

  return { state, action, retry: () => void load(), addItem, updateItemQuantity, removeItem, clear };
}

export function useServiceabilityController() {
  const [serviceability, setServiceability] = useState<DshServiceabilityState>(serviceabilityIdleState());

  const check = useCallback(async (storeId: string, serviceAreaCode: string, latitude?: number, longitude?: number) => {
    setServiceability({ kind: "checking" });
    try {
      const result = await checkServiceability(storeId, serviceAreaCode, latitude, longitude);
      setServiceability(resolveServiceabilityState(result));
    } catch (error) {
      console.error("[useServiceabilityController] check error:", error);
      setServiceability(resolveServiceabilityError());
    }
  }, []);

  const reset = useCallback(() => setServiceability(serviceabilityIdleState()), []);

  return { serviceability, check, reset };
}

export function useOperatorCartsController(authKind = "unauthenticated") {
  const [carts, setCarts] = useState<readonly DshCart[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "success" | "empty" | "error">("loading");

  const load = useCallback(async (stateFilter?: string) => {
    setLoadState("loading");
    try {
      const result = await fetchOperatorCarts(stateFilter);
      setCarts(result);
      setLoadState(result.length === 0 ? "empty" : "success");
    } catch { setLoadState("error"); }
  }, []);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  return { carts, loadState, reload: (stateFilter?: string) => void load(stateFilter) };
}
