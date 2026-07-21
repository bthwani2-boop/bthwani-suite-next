import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  EMPTY_HOME_ADMIN_TARGETING,
  fetchHomeDiscoveryTargeting,
  replaceHomeDiscoveryTargeting,
  type DshHomeAdminTargeting,
} from "./home-discovery-targeting";

export function useHomeDiscoveryAdminController(kind: DshHomeAdminKind, authKind: string) {
  const [state, setState] = useState<HomeDiscoveryAdminState>({ kind: "loading" });
  const [actionState, setActionState] = useState<HomeDiscoveryAdminActionState>({ kind: "idle" });
  const [selected, setSelected] = useState<DshHomeAdminContentItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<DshHomeAdminContentInput>(EMPTY_HOME_ADMIN_INPUT);
  const [targeting, setTargeting] = useState<DshHomeAdminTargeting>(EMPTY_HOME_ADMIN_TARGETING);
  const [targetingLoading, setTargetingLoading] = useState(false);
  const targetingRequest = useRef(0);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    setState(await fetchHomeDiscoveryAdmin(kind));
  }, [kind]);

  useEffect(() => {
    if (authKind === "authenticated") void load();
  }, [authKind, load]);

  const closeEditor = useCallback(() => {
    targetingRequest.current += 1;
    setSelected(null);
    setDraft(EMPTY_HOME_ADMIN_INPUT);
    setTargeting(EMPTY_HOME_ADMIN_TARGETING);
    setTargetingLoading(false);
    setEditorOpen(false);
    setActionState({ kind: "idle" });
  }, []);

  const select = useCallback((item: DshHomeAdminContentItem | null) => {
    const requestId = targetingRequest.current + 1;
    targetingRequest.current = requestId;
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
    if (item === null) {
      setTargeting(EMPTY_HOME_ADMIN_TARGETING);
      setTargetingLoading(false);
      return;
    }
    setTargetingLoading(true);
    void fetchHomeDiscoveryTargeting(kind, item.id)
      .then((value) => {
        if (targetingRequest.current === requestId) setTargeting(value);
      })
      .catch((error) => {
        if (targetingRequest.current === requestId) {
          setActionState({ kind: "error", message: describeAdminMutationError(error) });
        }
      })
      .finally(() => {
        if (targetingRequest.current === requestId) setTargetingLoading(false);
      });
  }, [kind]);

  const save = useCallback(async (input: DshHomeAdminContentInput) => {
    setActionState({ kind: "submitting" });
    try {
      const desiredStatus = input.publicationStatus;
      const publishAfterTargeting = desiredStatus === "published";
      const safeInput: DshHomeAdminContentInput = publishAfterTargeting
        ? { ...input, publicationStatus: "draft", isActive: false }
        : input;

      let persisted = await saveHomeDiscoveryAdmin(kind, selected?.id ?? null, safeInput);
      await replaceHomeDiscoveryTargeting(kind, persisted.id, targeting);

      if (publishAfterTargeting) {
        persisted = await saveHomeDiscoveryAdmin(kind, persisted.id, {
          ...input,
          publicationStatus: "published",
          isActive: true,
          expectedVersion: persisted.version,
        });
      }

      closeEditor();
      setActionState({
        kind: "success",
        message: persisted.publicationStatus === "published"
          ? "تم حفظ الاستهداف ونشر المحتوى وتسجيل الإجراء."
          : "تم حفظ المحتوى والاستهداف وتسجيل الإجراء.",
      });
      await load();
    } catch (error) {
      setActionState({ kind: "error", message: describeAdminMutationError(error) });
    }
  }, [closeEditor, kind, load, selected, targeting]);

  const remove = useCallback(async (itemId: string) => {
    setActionState({ kind: "submitting" });
    try {
      await removeHomeDiscoveryAdmin(kind, itemId);
      if (selected?.id === itemId) closeEditor();
      setActionState({ kind: "success", message: "تم حذف المحتوى واستهدافه وتسجيل الإجراء." });
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
    targeting,
    setTargeting,
    targetingLoading,
    select,
    closeEditor,
    retry: load,
    save,
    remove,
  };
}
