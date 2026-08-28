import { useCallback, useEffect, useRef, useState } from "react";
import {
  assignPartnerDeliveryTask,
  markPartnerDeliveryPickedUp,
  departPartnerDeliveryTask,
  arrivePartnerDeliveryTask,
  submitPartnerDeliveryProof,
  fetchPartnerDeliveryTask,
  fetchOperatorPartnerDelivery,
  fetchOperatorPartnerDeliveryByOrder,
  fetchOperatorPartnerDeliveries,
  raisePartnerDeliveryException,
  classifyPartnerDeliveryError,
} from "./partner-delivery.api";
import type {
  ClassifiedPartnerDeliveryError,
  DshPartnerDeliveryTask,
} from "./partner-delivery.types";
import { corrId } from "../_kernel/dsh-http-request";
import { useCameraPhotoCapture } from "../media/useCameraPhotoCapture";
import { useIdentitySession } from "@bthwani/core-identity";
import { uploadAndSubmitPartnerDeliveryProof } from "../media/pod/delivery-proof-media.api";

export type FetchState<T> = { readonly loaded: boolean; readonly error: string | null; readonly offline: boolean; readonly data: T };

function classifiedMessage(error: unknown, fallback: string): { message: string; classified: ClassifiedPartnerDeliveryError } {
  const classified = classifyPartnerDeliveryError(error);
  return { message: classified.message ?? fallback, classified };
}

export type PartnerDeliveryActionState = {
  readonly task: DshPartnerDeliveryTask | null;
  readonly stage: string;
  readonly loaded: boolean;
  readonly busy: boolean;
  readonly message: string | null;
  readonly isError: boolean;
  readonly errorCode?: string;
};

export function usePartnerDeliveryActionsController(orderId: string) {
  const camera = useCameraPhotoCapture();
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const commandIds = useRef<Record<string, string>>({});
  const [state, setState] = useState<PartnerDeliveryActionState>({
    task: null,
    stage: "unassigned",
    loaded: false,
    busy: false,
    message: null,
    isError: false,
  });

  const commandFor = useCallback((key: string) => {
    const scopedKey = `${actorId ?? "anonymous"}:${key}`;
    const existing = commandIds.current[scopedKey];
    if (existing) return existing;
    const created = corrId(`partner-delivery-${key}`);
    commandIds.current[scopedKey] = created;
    return created;
  }, [actorId]);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await fetchPartnerDeliveryTask(orderId);
      setState((current) => ({
        ...current,
        task: response.task,
        stage: response.stage,
        loaded: true,
        busy: false,
        isError: false,
      }));
    } catch (error) {
      const { message, classified } = classifiedMessage(error, "تعذر تحميل مهمة توصيل المتجر.");
      setState((current) => ({
        ...current,
        loaded: true,
        busy: false,
        isError: true,
        message,
        ...(classified.code ? { errorCode: classified.code } : {}),
      }));
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(async (
    actionKey: string,
    label: string,
    action: (commandId: string) => Promise<unknown>,
  ) => {
    if (!actorId) {
      setState((current) => ({ ...current, busy: false, isError: true, message: "جلسة موصل المتجر غير جاهزة لتنفيذ العملية." }));
      return false;
    }
    const currentCommandId = commandFor(actionKey);
    setState((current) => ({ ...current, busy: true, message: null, isError: false }));
    try {
      await action(currentCommandId);
      delete commandIds.current[`${actorId}:${actionKey}`];
      const response = await fetchPartnerDeliveryTask(orderId);
      setState({
        task: response.task,
        stage: response.stage,
        loaded: true,
        busy: false,
        message: label,
        isError: false,
      });
      return true;
    } catch (error) {
      const { message, classified } = classifiedMessage(error, "تعذر تنفيذ الإجراء.");
      if (classified.kind !== "network" && classified.kind !== "unavailable") {
        delete commandIds.current[`${actorId}:${actionKey}`];
      }
      setState((current) => ({
        ...current,
        busy: false,
        isError: true,
        message,
        ...(classified.code ? { errorCode: classified.code } : {}),
      }));
      return false;
    }
  }, [actorId, commandFor, orderId]);

  const assign = useCallback((storeCourierId: string) =>
    runAction(`assign:${storeCourierId}`, "تم إسناد موصل المتجر.", (commandId) =>
      assignPartnerDeliveryTask(orderId, { storeCourierId, expectedVersion: 0, commandId })),
  [orderId, runAction]);

  const pickup = useCallback(() => {
    if (!state.task) return Promise.resolve(false);
    return runAction("pickup", "تم تثبيت استلام موصل المتجر للطلب.", (commandId) =>
      markPartnerDeliveryPickedUp(orderId, state.task!.version, commandId));
  }, [orderId, runAction, state.task]);

  const depart = useCallback(() => {
    if (!state.task) return Promise.resolve(false);
    return runAction("depart", "تم تسجيل مغادرة موصل المتجر.", (commandId) =>
      departPartnerDeliveryTask(orderId, state.task!.version, commandId));
  }, [orderId, runAction, state.task]);

  const arrive = useCallback(() => {
    if (!state.task) return Promise.resolve(false);
    return runAction("arrive", "تم تسجيل وصول موصل المتجر إلى العميل.", (commandId) =>
      arrivePartnerDeliveryTask(orderId, state.task!.version, commandId));
  }, [orderId, runAction, state.task]);

  const submitProof = useCallback((proofMethod: string, proofReference: string) => {
    if (!state.task || !proofReference.trim()) return Promise.resolve(false);
    return runAction("proof", "تم تثبيت إثبات التسليم وإغلاق المهمة.", (commandId) =>
      submitPartnerDeliveryProof(orderId, {
        expectedVersion: state.task!.version,
        proofMethod,
        proofReference: proofReference.trim(),
        commandId,
      }));
  }, [orderId, runAction, state.task]);

  const captureAndSubmitProof = useCallback(async () => {
    if (!state.task) return false;
    let photo;
    try {
      photo = await camera.captureFromCamera();
    } catch (error) {
      setState((current) => ({
        ...current,
        busy: false,
        isError: true,
        message: error instanceof Error ? error.message : "تعذر فتح الكاميرا.",
      }));
      return false;
    }
    if (!photo) return false;
    return runAction("proof-media", "تم رفع صورة الإثبات وإغلاق مهمة توصيل المتجر.", (commandId) =>
      uploadAndSubmitPartnerDeliveryProof(orderId, photo, commandId));
  }, [camera, orderId, runAction, state.task]);

  return { state, assign, pickup, depart, arrive, submitProof, captureAndSubmitProof, refresh: load } as const;
}

export type UseOperatorPartnerDeliveriesControllerParams = {
  readonly storeId?: string;
  readonly status?: string;
  readonly limit?: number;
  readonly autoLoad?: boolean;
};

export function useOperatorPartnerDeliveriesController(params: UseOperatorPartnerDeliveriesControllerParams = {}) {
  const { storeId, status, limit = 100, autoLoad = true } = params;
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const operatorCommandIds = useRef<Record<string, string>>({});
  const [listState, setListState] = useState<FetchState<readonly DshPartnerDeliveryTask[]>>({ loaded: false, error: null, offline: false, data: [] });
  const [detailState, setDetailState] = useState<FetchState<DshPartnerDeliveryTask | null>>({ loaded: false, error: null, offline: false, data: null });

  const loadList = useCallback(() => {
    setListState((current) => ({ ...current, loaded: false }));
    return fetchOperatorPartnerDeliveries({ ...(storeId ? { storeId } : {}), ...(status ? { status } : {}), limit })
      .then((response) => setListState({ loaded: true, error: null, offline: false, data: response.tasks }))
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل مهام توصيل المتجر");
        setListState({ loaded: false, error: message, offline: classified.kind === "network", data: [] });
      });
  }, [storeId, status, limit]);

  useEffect(() => { if (autoLoad) void loadList(); }, [autoLoad, loadList]);

  const loadDetail = useCallback((taskId: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPartnerDelivery(taskId)
      .then((response) => setDetailState({ loaded: true, error: null, offline: false, data: response.task }))
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل تفاصيل المهمة");
        setDetailState({ loaded: false, error: message, offline: classified.kind === "network", data: null });
      });
  }, []);

  const loadDetailByOrder = useCallback((orderIdValue: string) => {
    setDetailState({ loaded: false, error: null, offline: false, data: null });
    return fetchOperatorPartnerDeliveryByOrder(orderIdValue)
      .then((response) => setDetailState({ loaded: true, error: null, offline: false, data: response.task }))
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تحميل تفاصيل المهمة");
        setDetailState({ loaded: false, error: message, offline: classified.kind === "network", data: null });
      });
  }, []);

  const raiseException = useCallback(async (
    orderIdValue: string,
    expectedVersion: number,
    reason: string,
    ticketReference: string,
    evidenceReferences: readonly string[] = [],
  ) => {
    if (!actorId) {
      return { ok: false as const, kind: "forbidden" as const, message: "جلسة العمليات غير جاهزة لتنفيذ الاستثناء." };
    }
    const commandKey = `${actorId}:${orderIdValue}:${expectedVersion}:${reason}:${evidenceReferences.join("|")}`;
    const existing = operatorCommandIds.current[commandKey] ?? corrId("operator-partner-delivery-exception");
    operatorCommandIds.current[commandKey] = existing;
    return raisePartnerDeliveryException(orderIdValue, {
      expectedVersion,
      reason,
      ticketReference,
      evidenceReferences,
      commandId: existing,
    })
      .then((response) => {
        delete operatorCommandIds.current[commandKey];
        setDetailState({ loaded: true, error: null, offline: false, data: response.task });
        return { ok: true as const, task: response.task };
      })
      .catch((error: unknown) => {
        const { message, classified } = classifiedMessage(error, "تعذر تسجيل الاستثناء.");
        if (classified.kind !== "network" && classified.kind !== "unavailable") {
          delete operatorCommandIds.current[commandKey];
        }
        return { ok: false as const, kind: classified.kind, message };
      });
  }, [actorId]);

  return { listState, loadList, detailState, loadDetail, loadDetailByOrder, raiseException };
}
