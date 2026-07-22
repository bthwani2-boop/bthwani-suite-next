import { useCallback, useEffect, useState } from "react";
import {
  approveSpecialRequestQuote,
  assignSpecialRequestDispatch,
  cancelSpecialRequest,
  classifySpecialRequestError,
  createSpecialRequest,
  fetchClientSpecialRequest,
  fetchClientSpecialRequestExecution,
  fetchClientSpecialRequestInformation,
  fetchClientSpecialRequests,
  fetchOperatorSpecialRequest,
  fetchOperatorSpecialRequestExecution,
  fetchOperatorSpecialRequestInformation,
  fetchOperatorSpecialRequests,
  requestOperatorSpecialRequestInformation,
  respondClientSpecialRequestInformation,
  updateOperatorSpecialRequest,
} from "./special-requests.api";
import type {
  ClassifiedSpecialRequestError,
  DshCreateSpecialRequest,
  DshSpecialRequestInformationExchange,
  DshSpecialRequestResponse,
  DshUpdateSpecialRequest,
  SpecialRequestDetailBundle,
  SpecialRequestStatus,
  SpecialRequestType,
} from "./special-requests.types";
import {
  beginSubmit,
  resolveApproveQuoteSuccess,
  resolveCancelSuccess,
  resolveSubmitError,
  resolveSubmitSuccess,
} from "./special-requests.controller-core";
import { specialRequestIdleState, specialRequestListLoadState } from "./special-requests.states";
import type { DshSpecialRequestListLoadState, DshSpecialRequestState } from "./special-requests.states";

function listLoadStateForError(error: ClassifiedSpecialRequestError): DshSpecialRequestListLoadState {
  switch (error.kind) {
    case "network":
    case "unavailable":
      return "offline";
    case "forbidden":
      return "forbidden";
    case "conflict":
      return "conflict";
    default:
      return "error";
  }
}

export function useSpecialRequestsController() {
  const [state, setState] = useState<DshSpecialRequestState>(specialRequestIdleState());

  const submit = useCallback(async (input: DshCreateSpecialRequest): Promise<boolean> => {
    if (state.kind === "submitting") return false;
    setState(beginSubmit());
    try {
      const created = await createSpecialRequest(input, { idempotencyKey: input.idempotencyKey });
      setState(resolveSubmitSuccess(await fetchClientSpecialRequest(created.id)));
      return true;
    } catch (error) {
      setState(resolveSubmitError(classifySpecialRequestError(error)));
      return false;
    }
  }, [state.kind]);

  const cancel = useCallback(async (id: string, expectedVersion?: number) => {
    if (state.kind === "submitting") return;
    setState(beginSubmit());
    try {
      await cancelSpecialRequest(id, expectedVersion);
      setState(resolveCancelSuccess(await fetchClientSpecialRequest(id)));
    } catch (error) {
      setState(resolveSubmitError(classifySpecialRequestError(error)));
    }
  }, [state.kind]);

  const approveQuote = useCallback(async (id: string, expectedVersion: number) => {
    if (state.kind === "submitting") return;
    setState(beginSubmit());
    try {
      await approveSpecialRequestQuote(id, expectedVersion);
      setState(resolveApproveQuoteSuccess(await fetchClientSpecialRequest(id)));
    } catch (error) {
      setState(resolveSubmitError(classifySpecialRequestError(error)));
    }
  }, [state.kind]);

  const reload = useCallback(async (id: string) => {
    try {
      setState(resolveSubmitSuccess(await fetchClientSpecialRequest(id)));
    } catch (error) {
      setState(resolveSubmitError(classifySpecialRequestError(error)));
    }
  }, []);

  const reset = useCallback(() => setState(specialRequestIdleState()), []);
  return { state, submit, cancel, approveQuote, reload, reset };
}

async function fetchClientDetailBundle(id: string): Promise<SpecialRequestDetailBundle> {
  const [information, execution] = await Promise.all([
    fetchClientSpecialRequestInformation(id),
    fetchClientSpecialRequestExecution(id),
  ]);
  return {
    informationExchange: information.informationExchange ?? null,
    execution: execution.execution,
    financial: execution.financial,
  };
}

async function fetchOperatorDetailBundle(id: string): Promise<SpecialRequestDetailBundle> {
  const [information, execution] = await Promise.all([
    fetchOperatorSpecialRequestInformation(id),
    fetchOperatorSpecialRequestExecution(id),
  ]);
  return {
    informationExchange: information.informationExchange ?? null,
    execution: execution.execution,
    financial: execution.financial,
  };
}

export type UseClientSpecialRequestsListControllerParams = {
  readonly limit?: number;
  readonly autoLoad?: boolean;
};

export function useClientSpecialRequestsListController(
  params: UseClientSpecialRequestsListControllerParams = {},
) {
  const { limit = 50, autoLoad = true } = params;
  const [requests, setRequests] = useState<readonly DshSpecialRequestResponse[]>([]);
  const [detailsByRequestId, setDetailsByRequestId] = useState<Readonly<Record<string, SpecialRequestDetailBundle>>>({});
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<DshSpecialRequestListLoadState>("loading");
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const result = await fetchClientSpecialRequests({ limit, offset: 0 });
      const nextRequests = result.requests ?? [];
      const detailEntries = await Promise.all(
        nextRequests.map(async (item) => [item.id, await fetchClientDetailBundle(item.id)] as const),
      );
      setRequests(nextRequests);
      setDetailsByRequestId(Object.fromEntries(detailEntries));
      setTotal(result.total ?? 0);
      setLoadState(specialRequestListLoadState(nextRequests));
    } catch (error) {
      setLoadState(listLoadStateForError(classifySpecialRequestError(error)));
    }
  }, [limit]);

  useEffect(() => {
    if (autoLoad) void load();
  }, [autoLoad, load]);

  const runMutation = useCallback(async (
    request: DshSpecialRequestResponse,
    mutation: () => Promise<unknown>,
  ) => {
    setBusyRequestId(request.id);
    try {
      await mutation();
      await load();
      return true;
    } catch (error) {
      setLoadState(listLoadStateForError(classifySpecialRequestError(error)));
      return false;
    } finally {
      setBusyRequestId(null);
    }
  }, [load]);

  const cancelRequest = useCallback(
    (request: DshSpecialRequestResponse) => runMutation(
      request,
      () => cancelSpecialRequest(request.id, request.version),
    ),
    [runMutation],
  );

  const approveQuote = useCallback(
    (request: DshSpecialRequestResponse) => runMutation(
      request,
      () => approveSpecialRequestQuote(request.id, request.version),
    ),
    [runMutation],
  );

  const respondInformation = useCallback((
    request: DshSpecialRequestResponse,
    exchange: DshSpecialRequestInformationExchange,
    response: string,
  ) => runMutation(
    request,
    () => respondClientSpecialRequestInformation(request.id, {
      expectedVersion: request.version,
      exchangeId: exchange.id,
      response,
    }),
  ), [runMutation]);

  return {
    requests,
    detailsByRequestId,
    total,
    loadState,
    busyRequestId,
    load,
    cancelRequest,
    approveQuote,
    respondInformation,
  };
}

export type UseOperatorSpecialRequestsControllerParams = {
  readonly limit?: number;
  readonly requestType?: SpecialRequestType;
  readonly status?: SpecialRequestStatus;
  readonly workflowStage?: string;
  readonly autoLoad?: boolean;
};

export function useOperatorSpecialRequestsController(
  params: UseOperatorSpecialRequestsControllerParams = {},
) {
  const { limit = 50, requestType, status, workflowStage, autoLoad = true } = params;
  const [requests, setRequests] = useState<readonly DshSpecialRequestResponse[]>([]);
  const [detailsByRequestId, setDetailsByRequestId] = useState<Readonly<Record<string, SpecialRequestDetailBundle>>>({});
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadState, setLoadState] = useState<DshSpecialRequestListLoadState>("loading");

  const load = useCallback(async (nextOffset = 0) => {
    setLoadState("loading");
    try {
      const result = await fetchOperatorSpecialRequests({
        limit,
        offset: nextOffset,
        ...(requestType !== undefined ? { requestType } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(workflowStage !== undefined ? { workflowStage } : {}),
      });
      const nextRequests = result.requests ?? [];
      setRequests(nextRequests);
      setTotal(result.total ?? 0);
      setOffset(nextOffset);
      setLoadState(specialRequestListLoadState(nextRequests));
    } catch (error) {
      setLoadState(listLoadStateForError(classifySpecialRequestError(error)));
    }
  }, [limit, requestType, status, workflowStage]);

  useEffect(() => {
    if (autoLoad) void load(0);
  }, [autoLoad, load]);

  const patchLocal = useCallback((updated: DshSpecialRequestResponse) => {
    setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const loadDetailBundle = useCallback(async (id: string) => {
    const detail = await fetchOperatorDetailBundle(id);
    setDetailsByRequestId((current) => ({ ...current, [id]: detail }));
    return detail;
  }, []);

  const getOne = useCallback(async (id: string): Promise<DshSpecialRequestResponse | undefined> => {
    try {
      const [request] = await Promise.all([
        fetchOperatorSpecialRequest(id),
        loadDetailBundle(id),
      ]);
      patchLocal(request);
      return request;
    } catch (error) {
      setLoadState(listLoadStateForError(classifySpecialRequestError(error)));
      return undefined;
    }
  }, [loadDetailBundle, patchLocal]);

  const update = useCallback(async (id: string, input: DshUpdateSpecialRequest) => {
    await updateOperatorSpecialRequest(id, input);
    const readback = await fetchOperatorSpecialRequest(id);
    patchLocal(readback);
    await loadDetailBundle(id);
    return readback;
  }, [loadDetailBundle, patchLocal]);

  const assignDispatch = useCallback(async (id: string, captainId: string) => {
    await assignSpecialRequestDispatch(id, captainId);
    const readback = await fetchOperatorSpecialRequest(id);
    patchLocal(readback);
    await loadDetailBundle(id);
    return readback;
  }, [loadDetailBundle, patchLocal]);

  const requestInformation = useCallback(async (
    request: DshSpecialRequestResponse,
    question: string,
  ) => {
    await requestOperatorSpecialRequestInformation(request.id, {
      expectedVersion: request.version,
      question,
    });
    const readback = await fetchOperatorSpecialRequest(request.id);
    patchLocal(readback);
    await loadDetailBundle(request.id);
    return readback;
  }, [loadDetailBundle, patchLocal]);

  const reload = useCallback(() => void load(offset), [load, offset]);

  return {
    requests,
    detailsByRequestId,
    total,
    offset,
    loadState,
    load,
    reload,
    getOne,
    loadDetailBundle,
    update,
    assignDispatch,
    requestInformation,
  };
}
