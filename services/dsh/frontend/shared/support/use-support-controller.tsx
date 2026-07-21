import { useCallback, useEffect, useState } from "react";
import {
  createSupportTicket,
  fetchMyTickets,
  fetchTicket,
  addTicketMessage,
  fetchTicketMessages,
  fetchOperatorTickets,
  fetchOperatorTicket,
  fetchOperatorTicketMessages,
  fetchOperatorTicketEvents,
  addOperatorTicketMessage,
  updateTicket,
  createIncident,
  fetchIncidents,
  updateIncident,
  classifySupportError,
} from "./support.api";
import {
  clearSupportMutationAttempt,
  getOrCreateSupportMutationAttempt,
} from "./support-mutation-attempt";
import {
  ticketListIdle,
  ticketListLoading,
  ticketListSuccess,
  ticketListEmpty,
  ticketListError,
  ticketDetailIdle,
  ticketDetailLoading,
  ticketDetailSuccess,
  ticketDetailError,
  ticketActionIdle,
  ticketActionSubmitting,
  ticketActionSuccess,
  ticketActionError,
  messageListIdle,
  messageListLoading,
  messageListSuccess,
  messageListError,
  messageActionIdle,
  messageActionSubmitting,
  messageActionSuccess,
  messageActionError,
  incidentListIdle,
  incidentListLoading,
  incidentListSuccess,
  incidentListEmpty,
  incidentListError,
  incidentActionIdle,
  incidentActionSubmitting,
  incidentActionSuccess,
  incidentActionError,
} from "./support.states";
import type {
  DshCreateTicketInput,
  DshAddMessageInput,
  DshUpdateTicketInput,
  DshCreateIncidentInput,
  DshUpdateIncidentInput,
  DshSupportTicketEvent,
} from "./support.types";

function resolveMessage(err: unknown): string {
  const classified = classifySupportError(err);
  if (classified.kind === "permission_denied") return "غير مصرح لك بهذه العملية";
  if (classified.kind === "offline") return "لا يوجد اتصال بالإنترنت؛ ستُستخدم هوية العملية نفسها عند إعادة المحاولة";
  if (classified.kind === "not_found") return "لم يتم إيجاد السجل أو لا تملكه";
  if (classified.kind === "conflict") return "تغيرت حالة التذكرة من جلسة أخرى؛ حدّث البيانات ثم أعد المحاولة";
  return "حدث خطأ، يرجى المحاولة مجدداً";
}

function isAuthenticated(authKind: string) {
  return authKind === "authenticated";
}

function stableFingerprint(value: unknown): string {
  return JSON.stringify(value);
}

export function useSupportTicketController(authKind = "unauthenticated") {
  const [listState, setListState] = useState(ticketListIdle());
  const [actionState, setActionState] = useState(ticketActionIdle());

  const load = useCallback(async () => {
    setListState(ticketListLoading());
    try {
      const tickets = await fetchMyTickets();
      setListState(tickets.length === 0 ? ticketListEmpty() : ticketListSuccess(tickets));
    } catch (err) {
      setListState(ticketListError(resolveMessage(err)));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const submitTicket = useCallback(async (input: DshCreateTicketInput): Promise<boolean> => {
    if (!isAuthenticated(authKind)) {
      setActionState(ticketActionError("يجب تسجيل الدخول قبل إنشاء تذكرة دعم"));
      return false;
    }
    const fingerprint = stableFingerprint(input);
    const attempt = await getOrCreateSupportMutationAttempt({
      scope: "client",
      operation: "ticket-create",
      fingerprint,
    });
    setActionState(ticketActionSubmitting());
    try {
      const ticket = await createSupportTicket(input, attempt.context);
      await clearSupportMutationAttempt({
        scope: "client",
        operation: "ticket-create",
        fingerprint,
      });
      setActionState(ticketActionSuccess(ticket));
      await load();
      return true;
    } catch (err) {
      setActionState(ticketActionError(resolveMessage(err)));
      return false;
    }
  }, [authKind, load]);

  const resetAction = useCallback(() => setActionState(ticketActionIdle()), []);

  return { listState, actionState, reload: load, submitTicket, resetAction };
}

export function useOperatorTicketController(authKind = "unauthenticated") {
  const [listState, setListState] = useState(ticketListIdle());
  const [actionState, setActionState] = useState(ticketActionIdle());

  const load = useCallback(async (statusFilter?: string) => {
    setListState(ticketListLoading());
    try {
      const tickets = await fetchOperatorTickets(statusFilter);
      setListState(tickets.length === 0 ? ticketListEmpty() : ticketListSuccess(tickets));
    } catch (err) {
      setListState(ticketListError(resolveMessage(err)));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const operatorUpdateTicket = useCallback(async (
    ticketId: string,
    input: DshUpdateTicketInput,
  ): Promise<boolean> => {
    const fingerprint = stableFingerprint(input);
    const attempt = await getOrCreateSupportMutationAttempt({
      scope: "operator",
      operation: "ticket-transition",
      entityId: ticketId,
      fingerprint,
    });
    setActionState(ticketActionSubmitting());
    try {
      const ticket = await updateTicket(ticketId, input, attempt.context);
      await clearSupportMutationAttempt({
        scope: "operator",
        operation: "ticket-transition",
        entityId: ticketId,
        fingerprint,
      });
      setActionState(ticketActionSuccess(ticket));
      await load();
      return true;
    } catch (err) {
      setActionState(ticketActionError(resolveMessage(err)));
      return false;
    }
  }, [load]);

  const resetAction = useCallback(() => setActionState(ticketActionIdle()), []);

  return { listState, actionState, reload: load, operatorUpdateTicket, resetAction };
}

export type SupportTicketDetailMode = "client" | "operator";
export type SupportEventState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly events: readonly DshSupportTicketEvent[] };

export function useTicketDetailController(
  ticketId: string,
  authKind = "unauthenticated",
  mode: SupportTicketDetailMode = "client",
) {
  const [detailState, setDetailState] = useState(ticketDetailIdle());
  const [messageListState, setMessageListState] = useState(messageListIdle());
  const [messageActionState, setMessageActionState] = useState(messageActionIdle());
  const [eventState, setEventState] = useState<SupportEventState>({ kind: "idle" });

  const loadDetail = useCallback(async () => {
    if (!ticketId) {
      setDetailState(ticketDetailIdle());
      return;
    }
    setDetailState(ticketDetailLoading());
    try {
      const ticket = mode === "operator"
        ? await fetchOperatorTicket(ticketId)
        : await fetchTicket(ticketId);
      setDetailState(ticketDetailSuccess(ticket));
    } catch (err) {
      setDetailState(ticketDetailError(resolveMessage(err)));
    }
  }, [mode, ticketId]);

  const loadMessages = useCallback(async () => {
    if (!ticketId) {
      setMessageListState(messageListIdle());
      return;
    }
    setMessageListState(messageListLoading());
    try {
      const messages = mode === "operator"
        ? await fetchOperatorTicketMessages(ticketId)
        : await fetchTicketMessages(ticketId);
      setMessageListState(messageListSuccess(messages));
    } catch (err) {
      setMessageListState(messageListError(resolveMessage(err)));
    }
  }, [mode, ticketId]);

  const loadEvents = useCallback(async () => {
    if (mode !== "operator" || !ticketId) {
      setEventState({ kind: "idle" });
      return;
    }
    setEventState({ kind: "loading" });
    try {
      setEventState({ kind: "success", events: await fetchOperatorTicketEvents(ticketId) });
    } catch (err) {
      setEventState({ kind: "error", message: resolveMessage(err) });
    }
  }, [mode, ticketId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) {
      void loadDetail();
      void loadMessages();
      void loadEvents();
    }
  }, [authKind, loadDetail, loadEvents, loadMessages]);

  const sendMessage = useCallback(async (input: DshAddMessageInput): Promise<boolean> => {
    if (!ticketId || !input.body.trim()) {
      setMessageActionState(messageActionError("اكتب رسالة وحدد تذكرة أولًا"));
      return false;
    }
    const fingerprint = stableFingerprint({ body: input.body.trim(), isInternal: input.isInternal === true });
    const attempt = await getOrCreateSupportMutationAttempt({
      scope: mode,
      operation: "ticket-message",
      entityId: ticketId,
      fingerprint,
    });
    setMessageActionState(messageActionSubmitting());
    try {
      const message = mode === "operator"
        ? await addOperatorTicketMessage(ticketId, input, attempt.context)
        : await addTicketMessage(ticketId, input, attempt.context);
      await clearSupportMutationAttempt({
        scope: mode,
        operation: "ticket-message",
        entityId: ticketId,
        fingerprint,
      });
      setMessageActionState(messageActionSuccess(message));
      await Promise.all([loadMessages(), loadEvents()]);
      return true;
    } catch (err) {
      setMessageActionState(messageActionError(resolveMessage(err)));
      return false;
    }
  }, [loadEvents, loadMessages, mode, ticketId]);

  const resetMessageAction = useCallback(() => setMessageActionState(messageActionIdle()), []);

  return {
    detailState,
    messageListState,
    messageActionState,
    eventState,
    reloadDetail: loadDetail,
    reloadMessages: loadMessages,
    reloadEvents: loadEvents,
    sendMessage,
    resetMessageAction,
  };
}

export function useSupportIncidentController(authKind = "unauthenticated") {
  const [listState, setListState] = useState(incidentListIdle());
  const [actionState, setActionState] = useState(incidentActionIdle());

  const load = useCallback(async (statusFilter?: string) => {
    setListState(incidentListLoading());
    try {
      const incidents = await fetchIncidents(statusFilter);
      setListState(incidents.length === 0 ? incidentListEmpty() : incidentListSuccess(incidents));
    } catch (err) {
      setListState(incidentListError(resolveMessage(err)));
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated(authKind)) void load();
  }, [authKind, load]);

  const raiseIncident = useCallback(async (input: DshCreateIncidentInput) => {
    setActionState(incidentActionSubmitting());
    try {
      const incident = await createIncident(input);
      setActionState(incidentActionSuccess(incident));
      await load();
    } catch (err) {
      setActionState(incidentActionError(resolveMessage(err)));
    }
  }, [load]);

  const resolveIncident = useCallback(async (incidentId: string, input: DshUpdateIncidentInput) => {
    setActionState(incidentActionSubmitting());
    try {
      const incident = await updateIncident(incidentId, input);
      setActionState(incidentActionSuccess(incident));
      await load();
    } catch (err) {
      setActionState(incidentActionError(resolveMessage(err)));
    }
  }, [load]);

  const resetAction = useCallback(() => setActionState(incidentActionIdle()), []);

  return { listState, actionState, reload: load, raiseIncident, resolveIncident, resetAction };
}
