import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addPartnerSupportMessage,
  createPartnerSupportTicket,
  getPartnerSupportTicket,
  listPartnerSupportMessages,
  listPartnerSupportTickets,
} from "./partner-support.api";
import {
  clearPartnerMessageAttempt,
  clearPartnerTicketAttempt,
  getOrCreatePartnerMessageAttempt,
  getOrCreatePartnerTicketAttempt,
} from "./partner-support-attempt";
import type {
  DshCreateTicketInput,
  DshSupportMessage,
  DshSupportTicket,
} from "./support.types";

export type PartnerSupportControllerState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly tickets: readonly DshSupportTicket[] };

export type PartnerSupportDetailState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "ready";
      readonly ticket: DshSupportTicket;
      readonly messages: readonly DshSupportMessage[];
    };

function supportErrorMessage(error: unknown): string {
  const typed = error as { kind?: string; status?: number; code?: string; message?: string };
  if (typed.kind === "network") return "تعذر الاتصال. ستُستخدم هوية العملية نفسها عند إعادة المحاولة.";
  if (typed.status === 401) return "انتهت جلسة الشريك. سجّل الدخول مجددًا.";
  if (typed.status === 403) return "لا يملك حساب الشريك صلاحية الوصول إلى هذه التذكرة أو الطلب.";
  if (typed.status === 404) return "التذكرة غير موجودة أو لا تتبع حساب الشريك.";
  if (typed.code === "IDEMPOTENCY_KEY_REQUIRED") return "تعذر تثبيت هوية العملية.";
  return typed.message?.trim() || "تعذر تنفيذ عملية الدعم.";
}

export function usePartnerSupportController(enabled = true) {
  const [state, setState] = useState<PartnerSupportControllerState>({ kind: "loading" });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<PartnerSupportDetailState>({ kind: "idle" });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const mutationLock = useRef(false);
  const detailSequence = useRef(0);

  const loadTickets = useCallback(async () => {
    if (!enabled) {
      setState({ kind: "error", message: "جلسة الشريك غير جاهزة." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const tickets = await listPartnerSupportTickets();
      setState({ kind: "ready", tickets });
      setSelectedTicketId((current) => {
        if (current && tickets.some((ticket) => ticket.id === current)) return current;
        return tickets[0]?.id ?? null;
      });
    } catch (error) {
      setState({ kind: "error", message: supportErrorMessage(error) });
    }
  }, [enabled]);

  const loadDetail = useCallback(async (ticketId: string | null = selectedTicketId) => {
    if (!enabled || !ticketId) {
      setDetailState({ kind: "idle" });
      return;
    }
    const sequence = detailSequence.current + 1;
    detailSequence.current = sequence;
    setDetailState({ kind: "loading" });
    try {
      const [ticket, messages] = await Promise.all([
        getPartnerSupportTicket(ticketId),
        listPartnerSupportMessages(ticketId),
      ]);
      if (detailSequence.current === sequence) {
        setDetailState({ kind: "ready", ticket, messages });
      }
    } catch (error) {
      if (detailSequence.current === sequence) {
        setDetailState({ kind: "error", message: supportErrorMessage(error) });
      }
    }
  }, [enabled, selectedTicketId]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    void loadDetail(selectedTicketId);
  }, [loadDetail, selectedTicketId]);

  const runMutation = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    if (mutationLock.current) return null;
    mutationLock.current = true;
    setMutating(true);
    setMutationError(null);
    try {
      return await operation();
    } catch (error) {
      setMutationError(supportErrorMessage(error));
      return null;
    } finally {
      mutationLock.current = false;
      setMutating(false);
    }
  }, []);

  const createTicket = useCallback(async (input: DshCreateTicketInput): Promise<boolean> => {
    const attempt = await getOrCreatePartnerTicketAttempt(input);
    const ticket = await runMutation(() => createPartnerSupportTicket(input, attempt.context));
    if (!ticket) return false;
    await clearPartnerTicketAttempt(attempt.fingerprint);
    setSelectedTicketId(ticket.id);
    await loadTickets();
    await loadDetail(ticket.id);
    return true;
  }, [loadDetail, loadTickets, runMutation]);

  const sendMessage = useCallback(async (body: string): Promise<boolean> => {
    const ticketId = selectedTicketId;
    const normalizedBody = body.trim();
    if (!ticketId || !normalizedBody) {
      setMutationError("اكتب رسالة وحدد تذكرة أولًا.");
      return false;
    }
    const attempt = await getOrCreatePartnerMessageAttempt(ticketId, normalizedBody);
    const message = await runMutation(() => addPartnerSupportMessage(
      ticketId,
      normalizedBody,
      attempt.context,
    ));
    if (!message) return false;
    await clearPartnerMessageAttempt(ticketId, attempt.fingerprint);
    await loadDetail(ticketId);
    return true;
  }, [loadDetail, runMutation, selectedTicketId]);

  const tickets = state.kind === "ready" ? state.tickets : [];
  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, tickets],
  );

  return {
    state,
    tickets,
    selectedTicketId,
    selectedTicket,
    selectTicket: setSelectedTicketId,
    detailState,
    mutationError,
    clearMutationError: () => setMutationError(null),
    mutating,
    reload: loadTickets,
    reloadDetail: () => loadDetail(selectedTicketId),
    createTicket,
    sendMessage,
  } as const;
}
