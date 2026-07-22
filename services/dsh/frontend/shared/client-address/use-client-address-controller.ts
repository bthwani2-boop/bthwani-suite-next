import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { validateClientAddressDraft } from "./client-address.validation";

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

function versionedMutationContext(operation: string, address: DshClientAddress): DshAddressMutationContext {
  const part = uniquePart();
  return {
    idempotencyKey: `${operation}:${address.id}:v${address.version}`,
    correlationId: `client-address:${part}`,
  };
}

function transportError(error: unknown): Partial<DshAddressTransportError> {
  return error as Partial<DshAddressTransportError>;
}

function shouldReloadCommittedState(error: unknown): boolean {
  const typed = transportError(error);
  return typed.status === 404 || [
    "ADDRESS_ALREADY_EXISTS",
    "ADDRESS_CONFLICT",
    "IDEMPOTENCY_CONFLICT",
  ].includes(typed.code ?? "");
}

function messageOf(error: unknown): string {
  const typed = transportError(error);
  if (typed.code === "ADDRESS_ALREADY_EXISTS") return "هذا العنوان محفوظ بالفعل. عدّل العنوان الموجود بدل إنشاء نسخة مكررة.";
  if (typed.code === "ADDRESS_CONFLICT") return "تم تعديل العنوان من جلسة أخرى. حُدّثت القائمة؛ راجع البيانات ثم أعد المحاولة.";
  if (typed.code === "IDEMPOTENCY_CONFLICT") return "تعذر إعادة العملية بأمان لأن هوية المحاولة استُخدمت لطلب مختلف. حُدّثت القائمة قبل أي محاولة جديدة.";
  if (typed.code === "ADDRESS_SERVICE_AREA_UNVERIFIED" || typed.status === 422) return "الموقع لا يطابق منطقة خدمة فعالة. اختر موقعًا معتمدًا ثم أعد الحفظ.";
  if (typed.code === "INVALID_ADDRESS") return "بيانات العنوان غير مكتملة أو غير صالحة.";
  if (typed.status === 401) return "انتهت الجلسة. سجّل الدخول مجددًا.";
  if (typed.status === 404) return "العنوان غير موجود أو لم يعد متاحًا. حُدّثت القائمة.";
  if (typed.kind === "network") return "تعذر الاتصال. أعد المحاولة؛ ستستخدم العملية نفس الهوية ولن تُنفذ مرتين.";
  return typeof typed.message === "string" && typed.message.length > 0
    ? typed.message
    : "تعذر تنفيذ عملية العنوان.";
}

export function useClientAddressController() {
  const [state, setState] = useState<ClientAddressState>({ kind: "loading" });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const mutationLock = useRef(false);

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
      if (shouldReloadCommittedState(error)) {
        await load();
      }
      return null;
    } finally {
      mutationLock.current = false;
      setMutating(false);
    }
  }, [load]);

  const validateMutationInput = useCallback((input: DshClientAddressDraft): boolean => {
    const validation = validateClientAddressDraft(input);
    if (validation) {
      setMutationError(validation);
      return false;
    }
    return true;
  }, []);

  const createAddress = useCallback(async (input: DshClientAddressDraft): Promise<boolean> => {
    if (!validateMutationInput(input)) return false;
    const address = await runMutation(async () => {
      const attempt = await getOrCreateClientAddressAttempt(input);
      const created = await createDshClientAddress(input, attempt.context);
      try {
        await clearClientAddressAttempt(attempt.fingerprint);
      } catch {
        // The server accepted the idempotent mutation; replaying the stored key remains safe.
      }
      return created;
    });
    if (!address) return false;
    setSelectedAddressId(address.id);
    await load();
    return true;
  }, [load, runMutation, validateMutationInput]);

  const updateAddress = useCallback(async (
    address: DshClientAddress,
    input: DshClientAddressDraft,
  ): Promise<boolean> => {
    if (!validateMutationInput(input)) return false;
    const updated = await runMutation(() => updateDshClientAddress(
      address.id,
      { ...input, expectedVersion: address.version },
      mutationContext("address-update").correlationId,
    ));
    if (!updated) return false;
    await load();
    return true;
  }, [load, runMutation, validateMutationInput]);

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
      address.version,
      versionedMutationContext("address-default", address),
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
