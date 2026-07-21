import React from "react";
import {
  listDshOperatorServiceAreas,
  upsertDshOperatorServiceArea,
} from "./client-map.api";
import type {
  DshServiceArea,
  DshServiceAreaState,
  DshServiceAreaUpsertInput,
} from "./client-map.types";

function resolveServiceAreaError(error: unknown): string {
  const value = error as {
    kind?: string;
    status?: number;
    message?: string;
  } | undefined;
  if (value?.kind === "network") return "لا يوجد اتصال بخدمة مناطق التغطية.";
  if (value?.status === 401) return "الجلسة منتهية.";
  if (value?.status === 403) return "لا تملك صلاحية إدارة مناطق التغطية.";
  if (value?.status === 409) return "تغيرت المنطقة؛ أعد التحميل ثم كرر العملية.";
  return value?.message?.trim() || "تعذر تنفيذ عملية منطقة التغطية.";
}

export function useServiceAreaController(enabled = true) {
  const [state, setState] = React.useState<DshServiceAreaState>({ kind: "idle" });
  const [mutationError, setMutationError] = React.useState<string | null>(null);
  const [mutating, setMutating] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await listDshOperatorServiceAreas();
      setState({ kind: "success", data });
    } catch (error) {
      setState({ kind: "error", message: resolveServiceAreaError(error) });
    }
  }, [enabled]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const save = React.useCallback(
    async (
      serviceAreaCode: string,
      input: DshServiceAreaUpsertInput,
    ): Promise<DshServiceArea | null> => {
      setMutating(true);
      setMutationError(null);
      try {
        const result = await upsertDshOperatorServiceArea(
          serviceAreaCode,
          input,
        );
        await reload();
        return result;
      } catch (error) {
        setMutationError(resolveServiceAreaError(error));
        return null;
      } finally {
        setMutating(false);
      }
    },
    [reload],
  );

  return {
    state,
    mutationError,
    mutating,
    reload,
    save,
    clearMutationError: () => setMutationError(null),
  } as const;
}
