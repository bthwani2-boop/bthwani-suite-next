import type { DshSupportTicket, DshSupportMessage, DshIncident } from "./support.types";

export type DshTicketListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly tickets: readonly DshSupportTicket[] }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export type DshTicketDetailState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly ticket: DshSupportTicket }
  | { readonly kind: "error"; readonly message: string };

export type DshTicketActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly ticket: DshSupportTicket }
  | { readonly kind: "error"; readonly message: string };

export type DshMessageListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly messages: readonly DshSupportMessage[] }
  | { readonly kind: "error"; readonly message: string };

export type DshMessageActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly message: DshSupportMessage }
  | { readonly kind: "error"; readonly message: string };

export type DshIncidentListState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly incidents: readonly DshIncident[] }
  | { readonly kind: "empty" }
  | { readonly kind: "error"; readonly message: string };

export type DshIncidentActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly incident: DshIncident }
  | { readonly kind: "error"; readonly message: string };

export const ticketListIdle = (): DshTicketListState => ({ kind: "idle" });
export const ticketListLoading = (): DshTicketListState => ({ kind: "loading" });
export const ticketListEmpty = (): DshTicketListState => ({ kind: "empty" });
export const ticketListError = (message: string): DshTicketListState => ({ kind: "error", message });
export const ticketListSuccess = (tickets: readonly DshSupportTicket[]): DshTicketListState => ({ kind: "success", tickets });

export const ticketDetailIdle = (): DshTicketDetailState => ({ kind: "idle" });
export const ticketDetailLoading = (): DshTicketDetailState => ({ kind: "loading" });
export const ticketDetailSuccess = (ticket: DshSupportTicket): DshTicketDetailState => ({ kind: "success", ticket });
export const ticketDetailError = (message: string): DshTicketDetailState => ({ kind: "error", message });

export const ticketActionIdle = (): DshTicketActionState => ({ kind: "idle" });
export const ticketActionSubmitting = (): DshTicketActionState => ({ kind: "submitting" });
export const ticketActionSuccess = (ticket: DshSupportTicket): DshTicketActionState => ({ kind: "success", ticket });
export const ticketActionError = (message: string): DshTicketActionState => ({ kind: "error", message });

export const messageListIdle = (): DshMessageListState => ({ kind: "idle" });
export const messageListLoading = (): DshMessageListState => ({ kind: "loading" });
export const messageListSuccess = (messages: readonly DshSupportMessage[]): DshMessageListState => ({ kind: "success", messages });
export const messageListError = (message: string): DshMessageListState => ({ kind: "error", message });

export const messageActionIdle = (): DshMessageActionState => ({ kind: "idle" });
export const messageActionSubmitting = (): DshMessageActionState => ({ kind: "submitting" });
export const messageActionSuccess = (msg: DshSupportMessage): DshMessageActionState => ({ kind: "success", message: msg });
export const messageActionError = (message: string): DshMessageActionState => ({ kind: "error", message });

export const incidentListIdle = (): DshIncidentListState => ({ kind: "idle" });
export const incidentListLoading = (): DshIncidentListState => ({ kind: "loading" });
export const incidentListEmpty = (): DshIncidentListState => ({ kind: "empty" });
export const incidentListError = (message: string): DshIncidentListState => ({ kind: "error", message });
export const incidentListSuccess = (incidents: readonly DshIncident[]): DshIncidentListState => ({ kind: "success", incidents });

export const incidentActionIdle = (): DshIncidentActionState => ({ kind: "idle" });
export const incidentActionSubmitting = (): DshIncidentActionState => ({ kind: "submitting" });
export const incidentActionSuccess = (incident: DshIncident): DshIncidentActionState => ({ kind: "success", incident });
export const incidentActionError = (message: string): DshIncidentActionState => ({ kind: "error", message });
