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
  clearCartSyncQueue,
  generateIdempotencyKey,
  getCartSyncQueue,
  getDeviceId,
  getSessionId,
  pushToCartSyncQueue,
  removeCartSyncCommand,
} from "./cart-sync.queue";
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
  readonly code?: string;
  readonly message?: string;
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
  if (typed.code === "CART_STORE_CONFLICT") {
    return "لديك سلة نشطة لمتجر آخر. أفرغها أولًا قبل إضافة منتجات من هذا المتجر.";
  }
  if (typed.code === "CART_ITEM_UNAVAILABLE") {
    return "المنتج غير متاح حاليًا أو لا يملك سعرًا صالحًا في تشكيلة المتجر.";
  }
  return typed.message?.trim() || "رفض DSH عملية السلة أو تعذر إكمالها.";
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

  const syncQueue = useCallback(async () => {
    const queue = getCartSyncQueue();
    if (queue.length === 0) return;
    
    setAction("submitting");
    let hasConflict = false;
    let anySuccess = false;
    
    for (const q of queue) {
      try {
        const deviceId = getDeviceId();
        const sessionId = getSessionId();
        
        if (q.command.kind === "add") {
          await upsertCartItem({
            storeId: q.command.storeId,
            masterProductId: q.command.masterProductId,
            quantity: q.command.quantity,
            options: q.command.options,
            note: q.command.note,
            idempotencyKey: q.id,
            deviceId,
            sessionId,
            ...(q.expectedVersion !== undefined ? { expectedVersion: q.expectedVersion } : {})
          });
        } else if (q.command.kind === "remove") {
          await removeCartItem(q.command.cartId, q.command.itemId, q.id, q.expectedVersion ?? 0, deviceId, sessionId);
        } else if (q.command.kind === "clear") {
          await clearCart(q.id, q.command.cartId, q.command.storeId, q.expectedVersion, deviceId, sessionId);
        }
        
        removeCartSyncCommand(q.id);
        anySuccess = true;
      } catch (error) {
        const typed: CartMutationError = typeof error === "object" && error !== null ? error : {};
        if (typed.kind === "network") {
          setAction("offline_pending");
          return;
        }
        if (typed.status === 412 || typed.code === "VERSION_CONFLICT") {
          hasConflict = true;
          setAction("conflict");
          setActionError("تضارب في نسخة السلة. يرجى مراجعة التغييرات أو مزامنتها مع الخادم.");
          break; // Stop processing further queued items on conflict
        }
        // For other errors, we just discard the bad queued command
        removeCartSyncCommand(q.id);
      }
    }
    
    if (anySuccess && !hasConflict) {
      await load();
      setAction("success");
    }
  }, [load]);

  useEffect(() => {
    const handleOnline = () => { void syncQueue(); };
    window.addEventListener("online", handleOnline);
    // Try to sync on mount if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncQueue();
    }
    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  const addItem = useCallback(
    async (input: {
      masterProductId: string;
      productName: string;
      priceReference?: string;
      quantity: number;
      options?: readonly string[];
      note?: string;
      fulfillmentMode?: DshFulfillmentMode;
    }): Promise<boolean> => {
      if (!storeId) return false;
      setAction("submitting");
      setActionError(null);
      const idempotencyKey = generateIdempotencyKey();
      const expectedVersion = state.kind === "success" ? state.cart.version : undefined;
      const deviceId = getDeviceId();
      const sessionId = getSessionId();
      
      try {
        await upsertCartItem({
          storeId,
          idempotencyKey,
          deviceId,
          sessionId,
          ...(expectedVersion !== undefined ? { expectedVersion } : {}),
          ...input,
        });
        await load();
        setAction("success");
        return true;
      } catch (error) {
        const typed: CartMutationError = typeof error === "object" && error !== null ? error : {};
        if (typed.kind === "network") {
          pushToCartSyncQueue({
            id: idempotencyKey,
            expectedVersion,
            createdAt: Date.now(),
            command: { kind: "add", storeId, masterProductId: input.masterProductId, quantity: input.quantity, options: input.options ? [...input.options] : [], note: input.note ?? "" }
          });
          setAction("offline_pending");
          return true;
        }
        if (typed.status === 412 || typed.code === "VERSION_CONFLICT") {
          setAction("conflict");
          setActionError(mutationErrorMessage(error));
          return false;
        }
        setAction("error");
        setActionError(mutationErrorMessage(error));
        return false;
      }
    },
    [storeId, load, state],
  );

  const removeItem = useCallback(
    async (cartId: string, itemId: string): Promise<boolean> => {
      setAction("submitting");
      setActionError(null);
      const idempotencyKey = generateIdempotencyKey();
      const expectedVersion = state.kind === "success" ? state.cart.version : 0;
      const deviceId = getDeviceId();
      const sessionId = getSessionId();
      try {
        await removeCartItem(cartId, itemId, idempotencyKey, expectedVersion, deviceId, sessionId);
        await load();
        setAction("success");
        return true;
      } catch (error) {
        const typed: CartMutationError = typeof error === "object" && error !== null ? error : {};
        if (typed.kind === "network") {
          pushToCartSyncQueue({
            id: idempotencyKey,
            expectedVersion,
            createdAt: Date.now(),
            command: { kind: "remove", cartId, itemId }
          });
          setAction("offline_pending");
          return true;
        }
        if (typed.status === 412 || typed.code === "VERSION_CONFLICT") {
          setAction("conflict");
          setActionError(mutationErrorMessage(error));
          return false;
        }
        setAction("error");
        setActionError(mutationErrorMessage(error));
        return false;
      }
    },
    [load, state],
  );

  const updateItemQuantity = useCallback(
    async (
      masterProductId: string,
      productName: string,
      quantity: number,
      priceReference?: string,
      options?: readonly string[],
      note?: string,
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
      const idempotencyKey = generateIdempotencyKey();
      const expectedVersion = cart ? cart.version : undefined;
      const deviceId = getDeviceId();
      const sessionId = getSessionId();
      try {
        await upsertCartItem({
          storeId,
          masterProductId,
          productName,
          quantity,
          ...(options ? { options: [...options] } : {}),
          ...(note !== undefined ? { note } : {}),
          idempotencyKey,
          deviceId,
          sessionId,
          ...(expectedVersion !== undefined ? { expectedVersion } : {}),
          ...(priceReference !== undefined ? { priceReference } : {}),
        });
        await load();
        setAction("success");
        return true;
      } catch (error) {
        const typed: CartMutationError = typeof error === "object" && error !== null ? error : {};
        if (typed.kind === "network") {
          pushToCartSyncQueue({
            id: idempotencyKey,
            expectedVersion,
            createdAt: Date.now(),
            command: { kind: "add", storeId, masterProductId, quantity, options: options ? [...options] : [], note: note ?? "" }
          });
          setAction("offline_pending");
          return true;
        }
        if (typed.status === 412 || typed.code === "VERSION_CONFLICT") {
          setAction("conflict");
          setActionError(mutationErrorMessage(error));
          return false;
        }
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
    const idempotencyKey = generateIdempotencyKey();
    const deviceId = getDeviceId();
    const sessionId = getSessionId();
    try {
      await clearCart(idempotencyKey, cart.id, undefined, cart.version, deviceId, sessionId);
      await load();
      setAction("success");
      return true;
    } catch (error) {
      const typed: CartMutationError = typeof error === "object" && error !== null ? error : {};
      if (typed.kind === "network") {
        pushToCartSyncQueue({
          id: idempotencyKey,
          expectedVersion: cart.version,
          createdAt: Date.now(),
          command: { kind: "clear", cartId: cart.id, storeId: cart.storeId }
        });
        setAction("offline_pending");
        return true;
      }
      if (typed.status === 412 || typed.code === "VERSION_CONFLICT") {
        setAction("conflict");
        setActionError(mutationErrorMessage(error));
        return false;
      }
      setAction("error");
      setActionError(mutationErrorMessage(error));
      return false;
    }
  }, [load]);

  return {
    state,
    action,
    actionError,
    retry: () => void load(),
    addItem,
    updateItemQuantity,
    removeItem,
    clear,
    syncQueue,
    clearOfflineQueue: () => clearCartSyncQueue(),
  };
}

export function useServiceabilityController() {
  const [serviceability, setServiceability] =
    useState<DshServiceabilityState>(serviceabilityIdleState());

  const check = useCallback(
    async (
      storeId: string,
      addressId: string,
      fulfillmentMode: DshFulfillmentMode,
    ) => {
      setServiceability({ kind: "checking" });
      try {
        const result = await checkServiceability(storeId, addressId, fulfillmentMode);
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
