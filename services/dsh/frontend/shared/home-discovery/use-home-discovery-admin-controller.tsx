import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_HOME_ADMIN_INPUT,
  fetchHomeDiscoveryAdmin,
  removeHomeDiscoveryAdmin,
  saveHomeDiscoveryAdmin,
  type DshHomeAdminContentInput,
  type DshHomeAdminContentItem,
  type DshHomeAdminKind,
  type HomeDiscoveryAdminActionState,
  type HomeDiscoveryAdminState,
} from "./home-discovery-admin";

export function useHomeDiscoveryAdminController(kind: DshHomeAdminKind, authKind: string) {
  const [state, setState] = useState<HomeDiscoveryAdminState>({ kind: "loading" });
  const [actionState, setActionState] = useState<HomeDiscoveryAdminActionState>({ kind: "idle" });
  const [selected, setSelected] = useState<DshHomeAdminContentItem | null>(null);
  const [draft, setDraft] = useState<DshHomeAdminContentInput>(EMPTY_HOME_ADMIN_INPUT);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setState(await fetchHomeDiscoveryAdmin(kind));
  }, [kind]);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  const select = useCallback((item: DshHomeAdminContentItem | null) => {
    setSelected(item);
    setDraft(item === null ? EMPTY_HOME_ADMIN_INPUT : {
      title: item.title,
      subtitle: item.subtitle ?? "",
      badgeLabel: item.badgeLabel ?? "",
      imageUrl: item.imageUrl ?? "",
      actionType: item.actionType,
      actionTarget: item.actionTarget,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  }, []);

  const save = useCallback(async (input: DshHomeAdminContentInput) => {
    setActionState({ kind: "submitting" });
    try {
      await saveHomeDiscoveryAdmin(kind, selected?.id ?? null, input);
      select(null);
      setActionState({ kind: "success", message: "تم حفظ المحتوى وتسجيل الإجراء." });
      await load();
    } catch {
      setActionState({ kind: "error", message: "تعذر حفظ المحتوى." });
    }
  }, [kind, load, select, selected]);

  const remove = useCallback(async (itemId: string) => {
    setActionState({ kind: "submitting" });
    try {
      await removeHomeDiscoveryAdmin(kind, itemId);
      if (selected?.id === itemId) select(null);
      setActionState({ kind: "success", message: "تم حذف المحتوى وتسجيل الإجراء." });
      await load();
    } catch {
      setActionState({ kind: "error", message: "تعذر حذف المحتوى." });
    }
  }, [kind, load, select, selected]);

  return { state, actionState, selected, draft, setDraft, select, retry: load, save, remove };
}
