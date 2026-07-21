import React from "react";

import {
  issuePartnerCourierConnectionCode,
  listPartnerCourierConnections,
  revokePartnerCourierConnection,
} from "./partner-fleet.api";

function resolveFleetError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "تعذر تنفيذ عملية ربط موصل المتجر.";
}

export type PartnerFleetController = {
  readonly issueCourierConnectionCode: (memberId: string) => Promise<string | null>;
  readonly revokePendingCourierConnection: (memberId: string) => Promise<boolean>;
  readonly error: string | null;
};

/**
 * Shared-brain controller for partner-owned connection-code lifecycle.
 * Partner surfaces consume these commands without importing the HTTP adapter.
 */
export function usePartnerFleetController(storeId: string): PartnerFleetController {
  const [error, setError] = React.useState<string | null>(null);

  const issueCourierConnectionCode = React.useCallback(async (memberId: string): Promise<string | null> => {
    if (!storeId || !memberId) {
      setError("اختر متجرًا وموصلًا صالحين أولًا.");
      return null;
    }
    try {
      const response = await issuePartnerCourierConnectionCode(storeId, memberId);
      setError(null);
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
      const response = await listPartnerCourierConnections(storeId);
      const pending = response.connections.find(
        (connection) => connection.teamMemberId === memberId && connection.status === "pending",
      );
      if (!pending) {
        setError("لا يوجد رمز ربط معلق لهذا الموصل. يمكن للموصل فك العضوية النشطة من تطبيق الكابتن.");
        return false;
      }
      await revokePartnerCourierConnection(storeId, pending.id, pending.version);
      setError(null);
      return true;
    } catch (caught) {
      setError(resolveFleetError(caught));
      return false;
    }
  }, [storeId]);

  return {
    issueCourierConnectionCode,
    revokePendingCourierConnection,
    error,
  };
}
