import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import { createDshFlexibleHttpClient, corrId } from "../dsh-link/dsh-http-request";
import { resolveDshApiBaseUrl } from "../dsh-link/dsh-api-base-url";
import type { operations } from "../../../../../dsh/clients/generated/dsh-api";

export type WltRefundResponse = operations["listDshControlPanelFinanceRefunds"]["responses"]["200"]["content"]["application/json"]["refunds"][number];
export type WltRefundAuditResponse = operations["listDshFinanceRefundAudit"]["responses"]["200"]["content"]["application/json"]["auditEvents"][number];

const { request } = createDshFlexibleHttpClient(resolveDshApiBaseUrl());

export function useRefundsByOrderQuery(orderId: string, enabled = true): UseQueryResult<readonly WltRefundResponse[], Error> {
  return useQuery({
    queryKey: ["wlt-refunds", "by-order", orderId],
    queryFn: async (): Promise<readonly WltRefundResponse[]> => {
      const res = await request<{ refunds: readonly WltRefundResponse[] }>(
        `/dsh/control-panel/finance/refunds`,
        { query: { orderId } }
      );
      return res.refunds;
    },
    enabled: enabled && !!orderId.trim(),
  });
}

export function useClientOrderRefundsQuery(orderId: string, enabled = true): UseQueryResult<readonly WltRefundResponse[], Error> {
  return useQuery({
    queryKey: ["wlt-refunds", "client-order", orderId],
    queryFn: async (): Promise<readonly WltRefundResponse[]> => {
      const res = await request<{ refunds: readonly WltRefundResponse[] }>(
        `/dsh/client/orders/${encodeURIComponent(orderId)}/refunds`
      );
      return res.refunds;
    },
    enabled: enabled && !!orderId.trim(),
  });
}

export function usePartnerOrderRefundsQuery(orderId: string, enabled = true): UseQueryResult<readonly WltRefundResponse[], Error> {
  return useQuery({
    queryKey: ["wlt-refunds", "partner-order", orderId],
    queryFn: async (): Promise<readonly WltRefundResponse[]> => {
      const res = await request<{ refunds: readonly WltRefundResponse[] }>(
        `/dsh/partner/orders/${encodeURIComponent(orderId)}/refunds`
      );
      return res.refunds;
    },
    enabled: enabled && !!orderId.trim(),
  });
}

export function useRefundAuditQuery(refundId: string, enabled = true): UseQueryResult<readonly WltRefundAuditResponse[], Error> {
  return useQuery({
    queryKey: ["wlt-refund-audit", refundId],
    queryFn: async (): Promise<readonly WltRefundAuditResponse[]> => {
      const res = await request<{ auditEvents: readonly WltRefundAuditResponse[] }>(
        `/dsh/control-panel/finance/refunds/${encodeURIComponent(refundId)}/audit`
      );
      return res.auditEvents;
    },
    enabled: enabled && !!refundId,
  });
}

export function useCreateRefundMutation(): UseMutationResult<WltRefundResponse, Error, operations["createDshFinanceRefund"]["requestBody"]["content"]["application/json"]> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: operations["createDshFinanceRefund"]["requestBody"]["content"]["application/json"]) => {
      const res = await request<{ refund: WltRefundResponse }>(
        `/dsh/control-panel/finance/refunds`,
        {
          method: "POST",
          body: input,
          auth: { idempotencyKey: corrId("refund-create"), correlationId: corrId("refund-create") }
        }
      );
      return res.refund;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wlt-refunds", "by-order", data.orderId] });
    },
  });
}

export function useApproveRefundMutation(): UseMutationResult<WltRefundResponse, Error, { refundId: string; reason: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { refundId: string; reason: string }) => {
      const res = await request<{ refund: WltRefundResponse }>(
        `/dsh/control-panel/finance/refunds/${encodeURIComponent(params.refundId)}/approve`,
        {
          method: "POST",
          body: { reason: params.reason },
          auth: { idempotencyKey: corrId(`approve-${params.refundId}`), correlationId: corrId(`approve-${params.refundId}`) }
        }
      );
      return res.refund;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wlt-refunds", "by-order", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["wlt-refund-audit", data.id] });
    },
  });
}

export function useRejectRefundMutation(): UseMutationResult<WltRefundResponse, Error, { refundId: string; reason: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { refundId: string; reason: string }) => {
      const res = await request<{ refund: WltRefundResponse }>(
        `/dsh/control-panel/finance/refunds/${encodeURIComponent(params.refundId)}/reject`,
        {
          method: "POST",
          body: { reason: params.reason },
          auth: { idempotencyKey: corrId(`reject-${params.refundId}`), correlationId: corrId(`reject-${params.refundId}`) }
        }
      );
      return res.refund;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wlt-refunds", "by-order", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["wlt-refund-audit", data.id] });
    },
  });
}

export function useCompleteRefundMutation(): UseMutationResult<WltRefundResponse, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (refundId: string) => {
      const res = await request<{ refund: WltRefundResponse }>(
        `/dsh/control-panel/finance/refunds/${encodeURIComponent(refundId)}/complete`,
        {
          method: "POST",
          body: {},
          auth: { idempotencyKey: corrId(`complete-${refundId}`), correlationId: corrId(`complete-${refundId}`) }
        }
      );
      return res.refund;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wlt-refunds", "by-order", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["wlt-refund-audit", data.id] });
    },
  });
}

export function useReconcileRefundMutation(): UseMutationResult<WltRefundResponse, Error, { refundId: string; resolutionAction: string; evidenceNote: string; providerReference?: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { refundId: string; resolutionAction: string; evidenceNote: string; providerReference?: string }) => {
      const res = await request<{ refund: WltRefundResponse }>(
        `/dsh/control-panel/finance/refunds/${encodeURIComponent(params.refundId)}/reconcile`,
        {
          method: "POST",
          body: {
            resolutionAction: params.resolutionAction,
            evidenceNote: params.evidenceNote,
            providerReference: params.providerReference,
          },
          auth: { idempotencyKey: corrId(`reconcile-${params.refundId}`), correlationId: corrId(`reconcile-${params.refundId}`) }
        }
      );
      return res.refund;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wlt-refunds", "by-order", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["wlt-refund-audit", data.id] });
    },
  });
}
