import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDshClientAddress,
  deleteDshClientAddress,
  listDshClientAddresses,
  setDshClientDefaultAddress,
  updateDshClientAddress,
} from "./client-address.api";
import {
  clearClientAddressAttempt,
  getOrCreateClientAddressAttempt,
} from "./client-address-create-attempt";
import type {
  DshAddressMutationContext,
  DshAddressTransportError,
  DshClientAddress,
  DshClientAddressDraft,
} from "./client-address.types";

export type ClientAddressState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly addresses: readonly DshClientAddress[] };

let fallbackSequence = 0;
function uniquePart(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
}

function mutationContext(prefix: string): DshAddressMutationContext {
  const part = uniquePart();
  return {
    idempotencyKey: `${prefix}:${part}`,
    correlationId: `client-address:${part}`,
  };
}

function messageOf(error: unknown): string {
  const typed = error as Partial<DshAddressTransportError>;
  if (typed.code === "ADDRESS_CONFLICT") return "تم تعديل العنوان من جلسة أخرى. حدّث القائمة ثم أعد المحاولة.";
  if (typed.status === 401) return "انتهت الجلسة. سجّل الدخول مجددًا.";
  if (typed.status === 404) return "العنوان غير موجود أو لم يعد متاحًا.";
  if (typed.kind === "network") return "تعذر الاتصال. ستُستخدم نفس هوية العملية عند إعادة المحاولة.";
  return typeof typed.message === "string" && typed.message.length > 0
    ? typed.message
    : "تعذر تنفيذ عملية العنوان.";
}

export function useClientAddressController() {
  const [state, setState] = useState<ClientAddressState>({ kind: "loading" });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const mutationLock = useMemo(() => ({ current: false }), []);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const addresses = await listDshClientAddresses();
      setState({ kind: "ready", addresses });
      setSelectedAddressId((current) => {
        if (current && addresses.some((address) => address.id === current)) return current;
        return addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? null;
      });
    } catch (error) {
      setState({ kind: "error", message: messageOf(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runMutation = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    if (mutationLock.current) return null;
    mutationLock.current = true;
    setMutating(true);
    setMutationError(null);
    try {
      return await operation();
    } catch (error) {
      setMutationError(messageOf(error));
      return null;
    } finally {
      mutationLock.current = false;
      setMutating(false);
    }
  }, [mutationLock]);

  const createAddress = useCallback(async (input: DshClientAddressDraft): Promise<boolean> => {
    let attempt;
    try {
      attempt = await getOrCreateClientAddressAttempt(input);
    } catch (error) {
      setMutationError(messageOf(error));
      return false;
    }

    const address = await runMutation(() => createDshClientAddress(input, attempt.context));
    if (!address) return false;

    try {
      await clearClientAddressAttempt(attempt.fingerprint);
    } catch {
      // The server already accepted the idempotent mutation; a later replay remains safe.
    }
    setSelectedAddressId(address.id);
    await load();
    return true;
  }, [load, runMutation]);

  const updateAddress = useCallback(async (
    address: DshClientAddress,
    input: DshClientAddressDraft,
  ): Promise<boolean> => {
    const updated = await runMutation(() => updateDshClientAddress(
      address.id,
      { ...input, expectedVersion: address.version },
      mutationContext("address-update").correlationId,
    ));
    if (!updated) return false;
    await load();
    return true;
  }, [load, runMutation]);

  const deleteAddress = useCallback(async (address: DshClientAddress): Promise<boolean> => {
    const deleted = await runMutation(async () => {
      await deleteDshClientAddress(
        address.id,
        address.version,
        mutationContext("address-delete").correlationId,
      );
      return true;
    });
    if (!deleted) return false;
    await load();
    return true;
  }, [load, runMutation]);

  const makeDefault = useCallback(async (address: DshClientAddress): Promise<boolean> => {
    if (address.isDefault) return true;
    const updated = await runMutation(() => setDshClientDefaultAddress(
      address.id,
      mutationContext(`address-default:${address.id}`),
    ));
    if (!updated) return false;
    setSelectedAddressId(updated.id);
    await load();
    return true;
  }, [load, runMutation]);

  const addresses = state.kind === "ready" ? state.addresses : [];
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  return {
    state,
    addresses,
    selectedAddress,
    selectedAddressId,
    setSelectedAddressId,
    mutationError,
    clearMutationError: () => setMutationError(null),
    mutating,
    reload: load,
    createAddress,
    updateAddress,
    deleteAddress,
    makeDefault,
  } as const;
}
