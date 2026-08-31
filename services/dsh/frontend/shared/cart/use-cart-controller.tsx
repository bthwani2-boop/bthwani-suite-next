import { useCallback, useEffect, useRef, useState } from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import { subscribeBthwaniConnectivity } from "@bthwani/data-runtime/connectivity-adapter";
import {
  checkServiceability,
  clearCart,
  fetchCart,
  fetchOperatorCarts,
  getCartMutationReceipt,
  removeCartItem,
  upsertCartItem,
} from "./cart.api";
import {
  discardCartSyncQueue,
  enqueueCartSyncCommand,
  getCartSyncQueue,
  quarantineLegacyCartSyncQueue,
  removeCartSyncCommand,
  updateCartSyncCommand,
  type CartMutationCommand,
  type QueuedCartMutation,
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

function isNetworkError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "kind" in error
    && (error as { readonly kind?: unknown }).kind === "network";
}

function isConflictError(error: unknown): boolean {
  const typed = typeof error === "object" && error !== null
    ? error as { readonly status?: number; readonly code?: string }
    : {};
  return typed.status === 412 || typed.code === "VERSION_CONFLICT";
}

type CartMutationReconciliation = "committed" | "not_applied" | "unknown";

async function reconcileCartMutation(
  mutation: QueuedCartMutation,
): Promise<CartMutationReconciliation> {
  const receipt = await getCartMutationReceipt(mutation.context.idempotencyKey);
  return receipt ? "committed" : "not_applied";
}

async function executeCartMutation(mutation: QueuedCartMutation): Promise<void> {
  switch (mutation.command.kind) {
    case "add":
      await upsertCartItem({
        storeId: mutation.command.storeId,
        masterProductId: mutation.command.masterProductId,
        quantity: mutation.command.quantity,
        options: mutation.command.options,
        note: mutation.command.note,
        ...(mutation.command.fulfillmentMode ? { fulfillmentMode: mutation.command.fulfillmentMode } : {}),
        ...(mutation.expectedVersion !== undefined ? { expectedVersion: mutation.expectedVersion } : {}),
        mutation: mutation.context,
      });
      return;
    case "remove":
      await removeCartItem(
        mutation.command.cartId,
        mutation.command.itemId,
        mutation.expectedVersion ?? 1,
        mutation.context,
      );
      return;
    case "clear":
      await clearCart(
        mutation.command.cartId,
        mutation.command.storeId,
        mutation.expectedVersion,
        mutation.context,
      );
      return;
  }
}

export function useCartController(
  storeId: string | undefined,
  authKind = "unauthenticated",
) {
  const identity = useIdentitySession();
  const actorId = authKind === "authenticated" && identity.state.kind === "authenticated"
    ? identity.state.identity.subject
    : "";
  const [state, setState] = useState<DshCartState>(loadingState());
  const [action, setAction] = useState<DshCartActionState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const syncing = useRef(false);

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
    if (shouldLoadCart(authKind, storeId) && actorId) void load();
  }, [actorId, authKind, load, storeId]);

  const syncQueue = useCallback(async () => {
    if (!actorId || syncing.current) return;
    syncing.current = true;
    try {
      const queue = await getCartSyncQueue(actorId);
      if (queue.length === 0) return;

      let committed = false;
      let unresolved = false;
      let conflict = false;
      let permanentFailure = false;

      for (const mutation of queue) {
        if (mutation.status === "conflict" || mutation.status === "permanent_failure") {
          unresolved = true;
          if (mutation.status === "conflict") conflict = true;
          else permanentFailure = true;
          if (mutation.lastError) setActionError(mutation.lastError);
          continue;
        }

        try {
          // Every persisted command is reconciled before a send. This also
          // protects the crash window between durable enqueue and network send.
          const beforeSend = await reconcileCartMutation(mutation);
          if (beforeSend === "committed") {
            await removeCartSyncCommand(actorId, mutation.id);
            committed = true;
            continue;
          }
          if (beforeSend === "unknown") {
            await updateCartSyncCommand(actorId, mutation.id, "submitted_unknown", "لا يمكن تحديد نتيجة تعديل السلة حاليًا.");
            unresolved = true;
            continue;
          }

          setAction("submitting");
          await executeCartMutation(mutation);
          const afterSend = await reconcileCartMutation(mutation);
          if (afterSend === "committed") {
            await removeCartSyncCommand(actorId, mutation.id);
            committed = true;
          } else {
            await updateCartSyncCommand(actorId, mutation.id, "submitted_unknown", "تم إرسال تعديل السلة دون readback مؤكد؛ لن نعيد إرساله قبل التحقق.");
            unresolved = true;
          }
        } catch (error) {
          unresolved = true;
          if (isConflictError(error)) {
            await updateCartSyncCommand(actorId, mutation.id, "conflict", mutationErrorMessage(error));
            conflict = true;
            break;
          }
          if (isNetworkError(error)) {
            await updateCartSyncCommand(actorId, mutation.id, "submitted_unknown", mutationErrorMessage(error));
            continue;
          }
          const message = mutationErrorMessage(error);
          await updateCartSyncCommand(actorId, mutation.id, "permanent_failure", message);
          setActionError(message);
          permanentFailure = true;
        }
      }

      if (committed) await load();
      if (conflict) setAction("conflict");
      else if (unresolved) {
        setAction(permanentFailure ? "error" : "offline_pending");
      } else {
        setAction("success");
      }
    } catch (error) {
      setAction("error");
      setActionError(mutationErrorMessage(error));
    } finally {
      syncing.current = false;
    }
  }, [actorId, load]);

  useEffect(() => {
    void quarantineLegacyCartSyncQueue().catch((error: unknown) => {
      setAction("error");
      setActionError(mutationErrorMessage(error));
    });
    return subscribeBthwaniConnectivity((networkState) => {
      if (networkState.isConnected === true && networkState.isInternetReachable !== false) {
        void syncQueue();
      }
    });
  }, [syncQueue]);

  const submitCartMutation = useCallback(async (
    command: CartMutationCommand,
    expectedVersion: number | undefined,
  ): Promise<boolean> => {
    if (!actorId) {
      setAction("error");
      setActionError("سجّل الدخول بحساب العميل لتنفيذ عملية السلة.");
      return false;
    }
    setAction("submitting");
    setActionError(null);

    let mutation: QueuedCartMutation | undefined;
    try {
      // Persist identity and intent before the first network attempt. A
      // durable-write failure therefore prevents an unsafe mutation send.
      mutation = await enqueueCartSyncCommand({ actorId, expectedVersion, command });
      const beforeSend = await reconcileCartMutation(mutation);
      if (beforeSend === "committed") {
        await removeCartSyncCommand(actorId, mutation.id);
        await load();
        setAction("success");
        return true;
      }
      if (beforeSend === "unknown") {
        await updateCartSyncCommand(actorId, mutation.id, "submitted_unknown", "لا يمكن تحديد نتيجة تعديل السلة حاليًا.");
        setAction("offline_pending");
        setActionError("حُفظ التعديل وننتظر التحقق من الخادم قبل إعادة إرساله.");
        return false;
      }

      await executeCartMutation(mutation);
      const afterSend = await reconcileCartMutation(mutation);
      if (afterSend === "committed") {
        await removeCartSyncCommand(actorId, mutation.id);
        await load();
        setAction("success");
        return true;
      }

      await updateCartSyncCommand(actorId, mutation.id, "submitted_unknown", "تم إرسال تعديل السلة دون readback مؤكد؛ لن نعيد إرساله قبل التحقق.");
      setAction("offline_pending");
      setActionError("تم الإرسال دون تأكيد القراءة المعتمدة؛ لن نكرر التعديل تلقائيًا.");
      return false;
    } catch (error) {
      if (mutation) {
        const status = isConflictError(error)
          ? "conflict"
          : isNetworkError(error) ? "submitted_unknown" : "permanent_failure";
        await updateCartSyncCommand(actorId, mutation.id, status, mutationErrorMessage(error)).catch(() => undefined);
      }
      if (isConflictError(error)) {
        setAction("conflict");
      } else if (isNetworkError(error)) {
        setAction("offline_pending");
      } else {
        setAction("error");
      }
      setActionError(mutationErrorMessage(error));
      return false;
    }
  }, [actorId, load]);

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
      const expectedVersion = state.kind === "success" ? state.cart.version : undefined;
      return submitCartMutation({
        kind: "add",
        storeId,
        masterProductId: input.masterProductId,
        quantity: input.quantity,
        options: input.options ? [...input.options] : [],
        note: input.note ?? "",
        ...(input.fulfillmentMode ? { fulfillmentMode: input.fulfillmentMode } : {}),
      }, expectedVersion);
    }, [state, storeId, submitCartMutation]);

  const removeItem = useCallback(
    async (cartId: string, itemId: string): Promise<boolean> => {
      if (state.kind !== "success") return false;
      return submitCartMutation({ kind: "remove", cartId, itemId }, state.cart.version);
    },
    [state, submitCartMutation],
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
      return submitCartMutation({
        kind: "add",
        storeId,
        masterProductId,
        quantity,
        options: options ? [...options] : [],
        note: note ?? "",
        ...(cart?.fulfillmentMode ? { fulfillmentMode: cart.fulfillmentMode } : {}),
      }, cart?.version);
    }, [removeItem, state, storeId, submitCartMutation]);

  const clear = useCallback(async (cart: DshCart): Promise<boolean> => {
    return submitCartMutation({ kind: "clear", cartId: cart.id, storeId: cart.storeId }, cart.version);
  }, [submitCartMutation]);

  const reviewConflict = useCallback(async () => {
    await load();
    // Refresh the canonical cart without hiding the unresolved local command.
    // The user must make an explicit keep-server decision before the durable
    // queue can be discarded.
    setAction("conflict");
  }, [load]);

  const discardOfflineQueue = useCallback(async (reason: string) => {
    if (!actorId) return;
    await discardCartSyncQueue(actorId, reason);
    await load();
    setAction("idle");
    setActionError(null);
  }, [actorId, load]);

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
    reviewConflict,
    discardOfflineQueue,
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
