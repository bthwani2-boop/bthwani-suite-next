import React from "react";
import {
  createZone,
  updateZone,
  upsertCapacityConfig,
  upsertSlaRule,
} from "./platform-policies.api";
import type {
  DshCapacityConfig,
  DshCreateZoneInput,
  DshSlaRule,
  DshUpsertCapacityInput,
  DshUpsertSlaRuleInput,
  DshUpdateZoneInput,
  DshZone,
} from "./platform-policies.types";

function resolveMutationError(error: unknown): string {
  const value = error as {
    kind?: string;
    status?: number;
    message?: string;
  } | undefined;
  if (value?.kind === "network") return "لا يوجد اتصال بخدمة سياسات المنصة.";
  if (value?.status === 401) return "الجلسة منتهية.";
  if (value?.status === 403) return "لا تملك صلاحية إدارة سياسات المنصة.";
  if (value?.status === 409) return "تغير السجل؛ أعد التحميل ثم كرر العملية.";
  return value?.message?.trim() || "تعذر تنفيذ تغيير سياسة المنصة.";
}

export function useOperationalPolicyEditor(onCommitted: () => Promise<void>) {
  const [mutating, setMutating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = React.useCallback(
    async (operation: () => Promise<unknown>) => {
      setMutating(true);
      setError(null);
      try {
        await operation();
        await onCommitted();
        return true;
      } catch (cause) {
        setError(resolveMutationError(cause));
        return false;
      } finally {
        setMutating(false);
      }
    },
    [onCommitted],
  );

  const saveZone = React.useCallback(
    async (
      zone: DshZone | null,
      input: DshCreateZoneInput & {
        readonly isActive?: boolean;
      },
    ) => {
      if (!zone) {
        const createInput: DshCreateZoneInput = {
          ...(input.id ? { id: input.id } : {}),
          name: input.name,
          cityCode: input.cityCode,
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          reason: input.reason,
        };
        return run(() => createZone(createInput));
      }
      const update: DshUpdateZoneInput = {
        name: input.name,
        description: input.description ?? "",
        isActive: input.isActive ?? zone.isActive,
        expectedVersion: zone.version,
        reason: input.reason,
      };
      return run(() => updateZone(zone.id, update));
    },
    [run],
  );

  const saveSla = React.useCallback(
    async (
      existing: DshSlaRule | null,
      input: Omit<DshUpsertSlaRuleInput, "expectedVersion">,
    ) =>
      run(() =>
        upsertSlaRule({
          ...input,
          expectedVersion: existing?.version ?? 0,
        }),
      ),
    [run],
  );

  const saveCapacity = React.useCallback(
    async (
      existing: DshCapacityConfig | null,
      input: Omit<DshUpsertCapacityInput, "expectedVersion">,
    ) =>
      run(() =>
        upsertCapacityConfig({
          ...input,
          expectedVersion: existing?.version ?? 0,
        }),
      ),
    [run],
  );

  return {
    mutating,
    error,
    clearError: () => setError(null),
    saveZone,
    saveSla,
    saveCapacity,
  } as const;
}
