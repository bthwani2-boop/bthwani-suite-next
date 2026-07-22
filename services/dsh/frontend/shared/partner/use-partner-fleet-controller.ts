import React from "react";

import {
  issuePartnerCourierConnectionCode,
  listPartnerCourierConnections,
  revokePartnerCourierConnection,
  type DshCourierConnection,
} from "./partner-fleet.api";

function resolveFleetError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "تعذر تنفيذ عملية ربط موصل المتجر.";
}

export type PartnerFleetController = {
  readonly connections: readonly DshCourierConnection[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => Promise<void>;
  readonly issueCourierConnectionCode: (memberId: string) => Promise<string | null>;
  readonly revokePendingCourierConnection: (memberId: string) => Promise<boolean>;
  readonly latestConnectionFor: (memberId: string) => DshCourierConnection | undefined;
};

/**
 * Shared-brain controller for partner-owned connection-code lifecycle.
 * Partner surfaces consume commands and the authoritative readback without
 * importing the HTTP adapter or keeping a second local fleet truth.
 */
export function usePartnerFleetController(storeId: string): PartnerFleetController {
  const [connections, setConnections] = React.useState<readonly DshCourierConnection[]>([]);
  const [loading, setLoading] = React.useState(Boolean(storeId));
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async (): Promise<void> => {
    if (!storeId) {
      setConnections([]);
      setLoading(false);
      setError("اختر متجرًا صالحًا أولًا.");
      return;
    }
    setLoading(true);
    try {
      const response = await listPartnerCourierConnections(storeId);
      setConnections(response.connections);
      setError(null);
    } catch (caught) {
      setError(resolveFleetError(caught));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const issueCourierConnectionCode = React.useCallback(async (memberId: string): Promise<string | null> => {
    if (!storeId || !memberId) {
      setError("اختر متجرًا وموصلًا صالحين أولًا.");
      return null;
    }
    try {
      const response = await issuePartnerCourierConnectionCode(storeId, memberId);
      setConnections((current) => [
        response.issued.connection,
        ...current.filter((connection) => (
          connection.id !== response.issued.connection.id
          && !(connection.teamMemberId === memberId && connection.status === "pending")
        )),
      ]);
      setError(null);
      try {
        const refreshed = await listPartnerCourierConnections(storeId);
        setConnections(refreshed.connections);
      } catch {
        // Preserve the successful one-time issuance and remove any superseded
        // pending projection even when follow-up readback is temporarily unavailable.
      }
      return response.issued.code;
    } catch (caught) {
      setError(resolveFleetError(caught));
      return null;
    }
  }, [storeId]);

  const revokePendingCourierConnection = React.useCallback(async (memberId: string): Promise<boolean> => {
    if (!storeId || !memberId) {
      setError("اختر متجرًا وموصلًا صالحين أولًا.");
      return false;
    }
    try {
      let pending = connections.find(
        (connection) => connection.teamMemberId === memberId && connection.status === "pending",
      );
      if (!pending) {
        const response = await listPartnerCourierConnections(storeId);
        setConnections(response.connections);
        pending = response.connections.find(
          (connection) => connection.teamMemberId === memberId && connection.status === "pending",
        );
      }
      if (!pending) {
        setError("لا يوجد رمز ربط معلق لهذا الموصل. يمكن للكابتن فك العضوية النشطة من تطبيق الكابتن.");
        return false;
      }
      const response = await revokePartnerCourierConnection(storeId, pending.id, pending.version);
      setConnections((current) => current.map((connection) => (
        connection.id === response.connection.id ? response.connection : connection
      )));
      setError(null);
      return true;
    } catch (caught) {
      setError(resolveFleetError(caught));
      return false;
    }
  }, [connections, storeId]);

  const latestConnectionFor = React.useCallback((memberId: string): DshCourierConnection | undefined => (
    connections.find((connection) => connection.teamMemberId === memberId)
  ), [connections]);

  return {
    connections,
    loading,
    error,
    reload,
    issueCourierConnectionCode,
    revokePendingCourierConnection,
    latestConnectionFor,
  };
}
