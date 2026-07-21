import { useCallback, useEffect, useState } from "react";
import {
  approveSpecialRequestQuote,
  assignSpecialRequestDispatch,
  cancelSpecialRequest,
  classifySpecialRequestError,
  createSpecialRequest,
  fetchClientSpecialRequest,
  fetchOperatorSpecialRequest,
  fetchOperatorSpecialRequests,
  updateOperatorSpecialRequest,
} from "./special-requests.api";
import type {
  DshCreateSpecialRequest,
  DshSpecialRequestResponse,
  DshUpdateSpecialRequest,
} from "./special-requests.types";
import {
  beginSubmit,
  resolveCancelSuccess,
  resolveApproveQuoteSuccess,
  resolveSubmitError,
  resolveSubmitSuccess,
} from "./special-requests.controller-core";
import { specialRequestIdleState, specialRequestListLoadState } from "./special-requests.states";
import type { DshSpecialRequestState, DshSpecialRequestListLoadState } from "./special-requests.states";

/**
 * Client-side controller: create / cancel / approve-quote a single special
 * request. A successful mutation is never trusted as final UI truth; the
 * canonical request is re-read from DSH before exposing success.
 */
export function useSpecialRequestsController() {
  const [state, setState] = useState<DshSpecialRequestState>(specialRequestIdleState());

  const submit = useCallback(async (input: DshCreateSpecialRequest): Promise<boolean> => {
    if (state.kind === "submitting") return false;
    setState(beginSubmit());
    try {
      const created = await createSpecialRequest(input, {
        idempotencyKey: input.idempotencyKey,
      });
      const readback = await fetchClientSpecialRequest(created.id);
      setState(resolveSubmitSuccess(readback));
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
      const readback = await fetchClientSpecialRequest(id);
      setState(resolveCancelSuccess(readback));
    } catch (error) {
      setState(resolveSubmitError(classifySpecialRequestError(error)));
    }
  }, [state.kind]);

  const approveQuote = useCallback(async (id: string, expectedVersion: number) => {
    if (state.kind === "submitting") return;
    setState(beginSubmit());
    try {
      await approveSpecialRequestQuote(id, expectedVersion);
      const readback = await fetchClientSpecialRequest(id);
      setState(resolveApproveQuoteSuccess(readback));
    } catch (error) {
      setState(resolveSubmitError(classifySpecialRequestError(error)));
    }
  }, [state.kind]);

  const reload = useCallback(async (id: string) => {
    try {
      const request = await fetchClientSpecialRequest(id);
      setState(resolveSubmitSuccess(request));
    } catch (error) {
      setState(resolveSubmitError(classifySpecialRequestError(error)));
    }
  }, []);

  const reset = useCallback(() => setState(specialRequestIdleState()), []);

  return { state, submit, cancel, approveQuote, reload, reset };
}

export type UseOperatorSpecialRequestsControllerParams = {
  readonly limit?: number;
  readonly requestType?: string;
  readonly status?: string;
  readonly workflowStage?: string;
  readonly autoLoad?: boolean;
};

/**
 * Operator-side controller: paginated list + single-item transitions. Every
 * write is followed by a single-item canonical readback before local state is
 * updated, preventing stale workflow stages, versions, assignments and WLT
 * references from being presented as successful.
 */
export function useOperatorSpecialRequestsController(
  params: UseOperatorSpecialRequestsControllerParams = {},
) {
  const { limit = 50, requestType, status, workflowStage, autoLoad = true } = params;

  const [requests, setRequests] = useState<readonly DshSpecialRequestResponse[]>([]);
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
    } catch (error: any) {
      if (error?.status === 403) setLoadState("forbidden");
      else if (error?.status === 409) setLoadState("conflict");
      else if (!globalThis.navigator?.onLine || error?.message?.includes('Network')) setLoadState("offline");
      else setLoadState("error");
    }
  }, [limit, requestType, status, workflowStage]);

  useEffect(() => {
    if (autoLoad) void load(0);
  }, [autoLoad, load]);

  const patchLocal = useCallback((updated: DshSpecialRequestResponse) => {
    setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const getOne = useCallback(async (id: string): Promise<DshSpecialRequestResponse | undefined> => {
    try {
      const request = await fetchOperatorSpecialRequest(id);
      patchLocal(request);
      return request;
    } catch {
      return undefined;
    }
  }, [patchLocal]);

  const update = useCallback(async (id: string, input: DshUpdateSpecialRequest) => {
    await updateOperatorSpecialRequest(id, input);
    const readback = await fetchOperatorSpecialRequest(id);
    patchLocal(readback);
    return readback;
  }, [patchLocal]);

  const assignDispatch = useCallback(async (id: string, captainId: string) => {
    await assignSpecialRequestDispatch(id, captainId);
    const readback = await fetchOperatorSpecialRequest(id);
    patchLocal(readback);
    return readback;
  }, [patchLocal]);

  const reload = useCallback(() => void load(offset), [load, offset]);

  return {
    requests,
    total,
    offset,
    loadState,
    load,
    reload,
    getOne,
    update,
    assignDispatch,
  };
}
