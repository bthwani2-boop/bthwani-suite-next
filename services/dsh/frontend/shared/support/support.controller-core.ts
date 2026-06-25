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
  DshTicketListState, DshTicketDetailState, DshTicketActionState,
  DshMessageListState, DshMessageActionState,
  DshIncidentListState, DshIncidentActionState,
} from "./support.states";
import {
  createSupportTicket, fetchMyTickets, fetchTicket,
  addTicketMessage, fetchTicketMessages,
  fetchOperatorTickets, updateTicket,
  createIncident, fetchIncidents, updateIncident,
  classifySupportError,
} from "./support.api";
import type {
  DshCreateTicketInput, DshAddMessageInput, DshUpdateTicketInput,
  DshCreateIncidentInput, DshUpdateIncidentInput,
} from "./support.types";

export type SupportTicketControllerState = {
  readonly listState: DshTicketListState;
  readonly detailState: DshTicketDetailState;
  readonly actionState: DshTicketActionState;
};

export type SupportMessageControllerState = {
  readonly listState: DshMessageListState;
  readonly actionState: DshMessageActionState;
};

export type SupportIncidentControllerState = {
  readonly listState: DshIncidentListState;
  readonly actionState: DshIncidentActionState;
};

export function makeSupportTicketController(
  state: SupportTicketControllerState,
  setState: (s: SupportTicketControllerState) => void,
) {
  async function loadMyTickets(): Promise<void> {
    setState({ ...state, listState: ticketListLoading() });
    try {
      const tickets = await fetchMyTickets();
      setState({ ...state, listState: tickets.length === 0 ? ticketListEmpty() : ticketListSuccess(tickets) });
    } catch (err) {
      setState({ ...state, listState: ticketListError(resolveMessage(err)) });
    }
  }

  async function loadOperatorTickets(statusFilter?: string): Promise<void> {
    setState({ ...state, listState: ticketListLoading() });
    try {
      const tickets = await fetchOperatorTickets(statusFilter);
      setState({ ...state, listState: tickets.length === 0 ? ticketListEmpty() : ticketListSuccess(tickets) });
    } catch (err) {
      setState({ ...state, listState: ticketListError(resolveMessage(err)) });
    }
  }

  async function loadTicket(ticketId: string): Promise<void> {
    setState({ ...state, detailState: ticketDetailLoading() });
    try {
      const ticket = await fetchTicket(ticketId);
      setState({ ...state, detailState: ticketDetailSuccess(ticket) });
    } catch (err) {
      setState({ ...state, detailState: ticketDetailError(resolveMessage(err)) });
    }
  }

  async function submitTicket(input: DshCreateTicketInput): Promise<void> {
    setState({ ...state, actionState: ticketActionSubmitting() });
    try {
      const ticket = await createSupportTicket(input);
      setState({ ...state, actionState: ticketActionSuccess(ticket) });
    } catch (err) {
      setState({ ...state, actionState: ticketActionError(resolveMessage(err)) });
    }
  }

  async function operatorUpdateTicket(ticketId: string, input: DshUpdateTicketInput): Promise<void> {
    setState({ ...state, actionState: ticketActionSubmitting() });
    try {
      const ticket = await updateTicket(ticketId, input);
      setState({ ...state, actionState: ticketActionSuccess(ticket) });
    } catch (err) {
      setState({ ...state, actionState: ticketActionError(resolveMessage(err)) });
    }
  }

  function resetAction(): void {
    setState({ ...state, actionState: ticketActionIdle() });
  }

  return { loadMyTickets, loadOperatorTickets, loadTicket, submitTicket, operatorUpdateTicket, resetAction };
}

export function makeSupportMessageController(
  state: SupportMessageControllerState,
  setState: (s: SupportMessageControllerState) => void,
) {
  async function loadMessages(ticketId: string): Promise<void> {
    setState({ ...state, listState: messageListLoading() });
    try {
      const messages = await fetchTicketMessages(ticketId);
      setState({ ...state, listState: messageListSuccess(messages) });
    } catch (err) {
      setState({ ...state, listState: messageListError(resolveMessage(err)) });
    }
  }

  async function sendMessage(ticketId: string, input: DshAddMessageInput): Promise<void> {
    setState({ ...state, actionState: messageActionSubmitting() });
    try {
      const msg = await addTicketMessage(ticketId, input);
      setState({ ...state, actionState: messageActionSuccess(msg) });
    } catch (err) {
      setState({ ...state, actionState: messageActionError(resolveMessage(err)) });
    }
  }

  function resetAction(): void {
    setState({ ...state, actionState: messageActionIdle() });
  }

  return { loadMessages, sendMessage, resetAction };
}

export function makeSupportIncidentController(
  state: SupportIncidentControllerState,
  setState: (s: SupportIncidentControllerState) => void,
) {
  async function loadIncidents(statusFilter?: string): Promise<void> {
    setState({ ...state, listState: incidentListLoading() });
    try {
      const incidents = await fetchIncidents(statusFilter);
      setState({ ...state, listState: incidents.length === 0 ? incidentListEmpty() : incidentListSuccess(incidents) });
    } catch (err) {
      setState({ ...state, listState: incidentListError(resolveMessage(err)) });
    }
  }

  async function raiseIncident(input: DshCreateIncidentInput): Promise<void> {
    setState({ ...state, actionState: incidentActionSubmitting() });
    try {
      const incident = await createIncident(input);
      setState({ ...state, actionState: incidentActionSuccess(incident) });
    } catch (err) {
      setState({ ...state, actionState: incidentActionError(resolveMessage(err)) });
    }
  }

  async function resolveIncident(incidentId: string, input: DshUpdateIncidentInput): Promise<void> {
    setState({ ...state, actionState: incidentActionSubmitting() });
    try {
      const incident = await updateIncident(incidentId, input);
      setState({ ...state, actionState: incidentActionSuccess(incident) });
    } catch (err) {
      setState({ ...state, actionState: incidentActionError(resolveMessage(err)) });
    }
  }

  function resetAction(): void {
    setState({ ...state, actionState: incidentActionIdle() });
  }

  return { loadIncidents, raiseIncident, resolveIncident, resetAction };
}

function resolveMessage(err: unknown): string {
  const classified = classifySupportError(err);
  switch (classified.kind) {
    case "permission_denied": return "غير مصرح لك بهذه العملية";
    case "offline": return "لا يوجد اتصال بالإنترنت";
    case "not_found": return "لم يتم إيجاد السجل";
    default: return "حدث خطأ، يرجى المحاولة مجدداً";
  }
}

export function makeInitialTicketControllerState(): SupportTicketControllerState {
  return { listState: ticketListIdle(), detailState: ticketDetailIdle(), actionState: ticketActionIdle() };
}

export function makeInitialMessageControllerState(): SupportMessageControllerState {
  return { listState: messageListIdle(), actionState: messageActionIdle() };
}

export function makeInitialIncidentControllerState(): SupportIncidentControllerState {
  return { listState: incidentListIdle(), actionState: incidentActionIdle() };
}
