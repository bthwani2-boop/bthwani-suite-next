import React from "react";
import {
  acceptOperatorDeliveryProof,
  classifyDeliveryProofError,
  fetchCaptainDeliveryProof,
  fetchClientAcceptedDeliveryProof,
  fetchOperatorDeliveryProofs,
  issueClientDeliveryPin,
  rejectOperatorDeliveryProof,
  submitCaptainDeliveryProof,
} from "./delivery-proof.api";
import {
  uploadAndSubmitCaptainDeliveryProof,
  type CaptainDeliveryProofSubmission,
  type CapturedDeliveryProofPhoto,
} from "../media/pod/delivery-proof-media.api";
import type {
  DshClientDeliveryProof,
  DshDeliveryPinResponse,
  DshDeliveryProof,
  DshDeliveryProofError,
  DshDeliveryProofLoadState,
  DshDeliveryProofMutationState,
  DshDeliveryProofStatus,
  DshReviewDeliveryProofInput,
  DshSubmitDeliveryProofInput,
} from "./delivery-proof.types";

function isNotFound(error: DshDeliveryProofError): boolean {
  return error.kind === "not_found";
}

function mutationStateFor(proof: DshDeliveryProof): DshDeliveryProofMutationState {
  if (proof.status === "accepted") return "accepted";
  if (proof.status === "rejected") return "rejected";
  return "pending_review";
}

export function useClientDeliveryPinController(orderId: string) {
  const [state, setState] = React.useState<DshDeliveryProofLoadState>("idle");
  const [issued, setIssued] = React.useState<DshDeliveryPinResponse | null>(null);
  const [proof, setProof] = React.useState<DshClientDeliveryProof | null>(null);
  const [error, setError] = React.useState<DshDeliveryProofError | null>(null);

  const refreshProof = React.useCallback(async () => {
    if (!orderId) return null;
    setState("loading");
    setError(null);
    try {
      const next = await fetchClientAcceptedDeliveryProof(orderId);
      setProof(next);
      setState("ready");
      return next;
    } catch (cause) {
      const classified = classifyDeliveryProofError(cause);
      if (isNotFound(classified)) {
        setProof(null);
        setState("empty");
        return null;
      }
      setError(classified);
      setState(classified.kind === "offline" ? "offline" : "error");
      return null;
    }
  }, [orderId]);

  const issuePin = React.useCallback(async () => {
    if (!orderId) return null;
    setState("loading");
    setError(null);
    try {
      const next = await issueClientDeliveryPin(orderId);
      setIssued(next);
      setState("ready");
      return next;
    } catch (cause) {
      const classified = classifyDeliveryProofError(cause);
      setError(classified);
      setState(classified.kind === "offline" ? "offline" : "error");
      return null;
    }
  }, [orderId]);

  return { state, issued, proof, error, issuePin, refreshProof } as const;
}

export function useCaptainDeliveryProofController(assignmentId: string) {
  const [loadState, setLoadState] = React.useState<DshDeliveryProofLoadState>("idle");
  const [mutationState, setMutationState] = React.useState<DshDeliveryProofMutationState>("idle");
  const [proof, setProof] = React.useState<DshDeliveryProof | null>(null);
  const [error, setError] = React.useState<DshDeliveryProofError | null>(null);

  const refresh = React.useCallback(async () => {
    if (!assignmentId) return null;
    setLoadState("loading");
    setError(null);
    try {
      const next = await fetchCaptainDeliveryProof(assignmentId);
      setProof(next);
      setLoadState("ready");
      setMutationState(mutationStateFor(next));
      return next;
    } catch (cause) {
      const classified = classifyDeliveryProofError(cause);
      if (isNotFound(classified)) {
        setProof(null);
        setLoadState("empty");
        setMutationState("idle");
        return null;
      }
      setError(classified);
      setLoadState(classified.kind === "offline" ? "offline" : "error");
      return null;
    }
  }, [assignmentId]);

  const submit = React.useCallback(async (input: DshSubmitDeliveryProofInput) => {
    if (!assignmentId) return null;
    setMutationState("submitting");
    setError(null);
    try {
      const next = await submitCaptainDeliveryProof(assignmentId, input);
      setProof(next);
      setLoadState("ready");
      setMutationState(mutationStateFor(next));
      return next;
    } catch (cause) {
      const classified = classifyDeliveryProofError(cause);
      setError(classified);
      setMutationState("error");
      return null;
    }
  }, [assignmentId]);

  const submitCaptured = React.useCallback(async (
    photo: CapturedDeliveryProofPhoto | undefined,
    submission: CaptainDeliveryProofSubmission,
  ) => {
    if (!assignmentId) return null;
    setMutationState("submitting");
    setError(null);
    try {
      const next = await uploadAndSubmitCaptainDeliveryProof(assignmentId, photo, submission);
      setProof(next);
      setLoadState("ready");
      setMutationState(mutationStateFor(next));
      return next;
    } catch (cause) {
      const classified = classifyDeliveryProofError(cause);
      setError(classified);
      setMutationState("error");
      return null;
    }
  }, [assignmentId]);

  const resetRejected = React.useCallback(() => {
    if (proof?.status === "rejected") {
      setProof(null);
      setMutationState("idle");
      setError(null);
    }
  }, [proof]);

  return { loadState, mutationState, proof, error, refresh, submit, submitCaptured, resetRejected } as const;
}

export function useOperatorDeliveryProofReviewController(initialStatus: DshDeliveryProofStatus = "pending_review") {
  const [status, setStatus] = React.useState<DshDeliveryProofStatus>(initialStatus);
  const [state, setState] = React.useState<DshDeliveryProofLoadState>("idle");
  const [proofs, setProofs] = React.useState<readonly DshDeliveryProof[]>([]);
  const [error, setError] = React.useState<DshDeliveryProofError | null>(null);
  const [reviewingProofId, setReviewingProofId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const next = await fetchOperatorDeliveryProofs(status);
      setProofs(next);
      setState(next.length === 0 ? "empty" : "ready");
      return next;
    } catch (cause) {
      const classified = classifyDeliveryProofError(cause);
      setError(classified);
      setState(classified.kind === "offline" ? "offline" : "error");
      return [] as const;
    }
  }, [status]);

  const review = React.useCallback(async (
    proofId: string,
    action: "accept" | "reject",
    input: DshReviewDeliveryProofInput,
  ) => {
    setReviewingProofId(proofId);
    setError(null);
    try {
      const updated = action === "accept"
        ? await acceptOperatorDeliveryProof(proofId, input)
        : await rejectOperatorDeliveryProof(proofId, input);
      setProofs((current) => current.filter((item) => item.id !== proofId));
      setState((current) => current === "ready" && proofs.length <= 1 ? "empty" : current);
      return updated;
    } catch (cause) {
      const classified = classifyDeliveryProofError(cause);
      setError(classified);
      return null;
    } finally {
      setReviewingProofId(null);
    }
  }, [proofs.length]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, setStatus, state, proofs, error, reviewingProofId, refresh, review } as const;
}
