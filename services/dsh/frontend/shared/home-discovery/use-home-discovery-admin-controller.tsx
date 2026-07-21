import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_HOME_ADMIN_INPUT,
  describeAdminMutationError,
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<DshHomeAdminContentInput>(EMPTY_HOME_ADMIN_INPUT);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setState(await fetchHomeDiscoveryAdmin(kind));
  }, [kind]);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  const closeEditor = useCallback(() => {
    setSelected(null);
    setDraft(EMPTY_HOME_ADMIN_INPUT);
    setEditorOpen(false);
    setActionState({ kind: "idle" });
  }, []);

  const select = useCallback((item: DshHomeAdminContentItem | null) => {
    setSelected(item);
    setEditorOpen(true);
    setActionState({ kind: "idle" });
    setDraft(item === null ? EMPTY_HOME_ADMIN_INPUT : {
      title: item.title,
      subtitle: item.subtitle ?? "",
      badgeLabel: item.badgeLabel ?? "",
      imageUrl: item.imageUrl ?? "",
      actionType: item.actionType,
      actionTarget: item.actionTarget,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      publicationStatus: item.publicationStatus,
      ...(item.publishFrom ? { publishFrom: item.publishFrom } : {}),
      ...(item.publishUntil ? { publishUntil: item.publishUntil } : {}),
      expectedVersion: item.version,
    });
  }, []);

  const save = useCallback(async (input: DshHomeAdminContentInput) => {
    setActionState({ kind: "submitting" });
    try {
      await saveHomeDiscoveryAdmin(kind, selected?.id ?? null, input);
      closeEditor();
      setActionState({ kind: "success", message: "تم حفظ المحتوى وتسجيل الإجراء." });
      await load();
    } catch (error) {
      setActionState({ kind: "error", message: describeAdminMutationError(error) });
    }
  }, [closeEditor, kind, load, selected]);

  const remove = useCallback(async (itemId: string) => {
    setActionState({ kind: "submitting" });
    try {
      await removeHomeDiscoveryAdmin(kind, itemId);
      if (selected?.id === itemId) closeEditor();
      setActionState({ kind: "success", message: "تم حذف المحتوى وتسجيل الإجراء." });
      await load();
    } catch (error) {
      setActionState({ kind: "error", message: describeAdminMutationError(error) });
    }
  }, [closeEditor, kind, load, selected]);

  return {
    state,
    actionState,
    selected,
    editorOpen,
    draft,
    setDraft,
    select,
    closeEditor,
    retry: load,
    save,
    remove,
  };
}
