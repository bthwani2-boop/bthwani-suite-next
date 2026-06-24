import { useCallback, useEffect, useState } from "react";
import {
  createSupportTicket, fetchMyTickets, fetchTicket,
  addTicketMessage, fetchTicketMessages,
  fetchOperatorTickets, updateTicket,
  createIncident, fetchIncidents, updateIncident,
  classifySupportError,
} from "./support.api";
import {
  ticketListIdle, ticketListLoading, ticketListSuccess, ticketListEmpty, ticketListError,
  ticketDetailIdle, ticketDetailLoading, ticketDetailSuccess, ticketDetailError,
  ticketActionIdle, ticketActionSubmitting, ticketActionSuccess, ticketActionError,
  messageListIdle, messageListLoading, messageListSuccess, messageListError,
  messageActionIdle, messageActionSubmitting, messageActionSuccess, messageActionError,
  incidentListIdle, incidentListLoading, incidentListSuccess, incidentListEmpty, incidentListError,
  incidentActionIdle, incidentActionSubmitting, incidentActionSuccess, incidentActionError,
} from "./support.states";
import type {
  DshCreateTicketInput, DshAddMessageInput, DshUpdateTicketInput,
  DshCreateIncidentInput, DshUpdateIncidentInput, DshTicketStatus,
} from "./support.types";

function resolveMessage(err: unknown): string {
  const c = classifySupportError(err);
  if (c.kind === "permission_denied") return "غير مصرح لك بهذه العملية";
  if (c.kind === "offline") return "لا يوجد اتصال بالإنترنت";
  if (c.kind === "not_found") return "لم يتم إيجاد السجل";
  return "حدث خطأ، يرجى المحاولة مجدداً";
}

function isAuthenticated(authKind: string) {
  return authKind === "authenticated";
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

  const submitTicket = useCallback(async (input: DshCreateTicketInput) => {
    setActionState(ticketActionSubmitting());
    try {
      const ticket = await createSupportTicket(input);
      setActionState(ticketActionSuccess(ticket));
      await load();
    } catch (err) {
      setActionState(ticketActionError(resolveMessage(err)));
    }
  }, [load]);

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

  const operatorUpdateTicket = useCallback(async (ticketId: string, input: DshUpdateTicketInput) => {
    setActionState(ticketActionSubmitting());
    try {
      const ticket = await updateTicket(ticketId, input);
      setActionState(ticketActionSuccess(ticket));
      await load();
    } catch (err) {
      setActionState(ticketActionError(resolveMessage(err)));
    }
  }, [load]);

  const resetAction = useCallback(() => setActionState(ticketActionIdle()), []);

  return { listState, actionState, reload: load, operatorUpdateTicket, resetAction };
}

export function useTicketDetailController(ticketId: string, authKind = "unauthenticated") {
  const [detailState, setDetailState] = useState(ticketDetailIdle());
  const [messageListState, setMessageListState] = useState(messageListIdle());
  const [messageActionState, setMessageActionState] = useState(messageActionIdle());

  const loadDetail = useCallback(async () => {
    setDetailState(ticketDetailLoading());
    try {
      const ticket = await fetchTicket(ticketId);
      setDetailState(ticketDetailSuccess(ticket));
    } catch (err) {
      setDetailState(ticketDetailError(resolveMessage(err)));
    }
  }, [ticketId]);

  const loadMessages = useCallback(async () => {
    setMessageListState(messageListLoading());
    try {
      const messages = await fetchTicketMessages(ticketId);
      setMessageListState(messageListSuccess(messages));
    } catch (err) {
      setMessageListState(messageListError(resolveMessage(err)));
    }
  }, [ticketId]);

  useEffect(() => {
    if (isAuthenticated(authKind)) {
      void loadDetail();
      void loadMessages();
    }
  }, [authKind, loadDetail, loadMessages]);

  const sendMessage = useCallback(async (input: DshAddMessageInput) => {
    setMessageActionState(messageActionSubmitting());
    try {
      const msg = await addTicketMessage(ticketId, input);
      setMessageActionState(messageActionSuccess(msg));
      await loadMessages();
    } catch (err) {
      setMessageActionState(messageActionError(resolveMessage(err)));
    }
  }, [ticketId, loadMessages]);

  const resetMessageAction = useCallback(() => setMessageActionState(messageActionIdle()), []);

  return { detailState, messageListState, messageActionState, reloadMessages: loadMessages, sendMessage, resetMessageAction };
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
