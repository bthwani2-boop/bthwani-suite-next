import React from "react";

import { executePartnerTeamMemberAction, fetchPartnerTeam, invitePartnerTeamMember } from "./partner.api";
import type { DshPartnerRoute } from "./partner.types";
import { toPartnerTeamMember, type PartnerTeamMember } from "./partner-team.types";

export type PartnerTeamMutationResult = { readonly ok: true } | { readonly ok: false; readonly error: string };
export type PartnerTeamModelStatus = "idle" | "loading" | "error" | "ready";

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "خطأ غير متوقع أثناء الاتصال بـ runtime.";
}

export function usePartnerTeamController({
  route,
  selectedStoreScopeId,
}: {
  route: DshPartnerRoute;
  selectedStoreScopeId: string;
}) {
  const [members, setMembers] = React.useState<readonly PartnerTeamMember[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<PartnerTeamModelStatus>("idle");
  const activeStoreId = selectedStoreScopeId === "all" ? "" : selectedStoreScopeId;

  const loadTeam = React.useCallback(async (): Promise<boolean> => {
    if (route !== "team" || !activeStoreId) return false;
    setLoading(true);
    setStatus("loading");
    try {
      const response = await fetchPartnerTeam(activeStoreId);
      const normalized = (response.members ?? [])
        .map(toPartnerTeamMember)
        .filter((member): member is PartnerTeamMember => member !== null);
      setMembers(normalized);
      setError(null);
      setStatus("ready");
      return true;
    } catch (loadError) {
      setMembers([]);
      setError(resolveErrorMessage(loadError));
      setStatus("error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, route]);

  React.useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const onInviteMember = React.useCallback(async (identity: string): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) return { ok: false, error: "لا يوجد فرع محدد لإرسال الدعوة." };
    try {
      await invitePartnerTeamMember(activeStoreId, identity);
      const reloaded = await loadTeam();
      return reloaded
        ? { ok: true }
        : { ok: false, error: "تم تنفيذ الدعوة لكن تعذر إعادة قراءة الفريق." };
    } catch (mutationError) {
      return { ok: false, error: resolveErrorMessage(mutationError) };
    }
  }, [activeStoreId, loadTeam]);

  const onMemberAction = React.useCallback(async (
    memberId: string,
    action: string,
  ): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) return { ok: false, error: "لا يوجد فرع محدد لتنفيذ الإجراء." };
    try {
      await executePartnerTeamMemberAction(activeStoreId, memberId, action);
      const reloaded = await loadTeam();
      return reloaded
        ? { ok: true }
        : { ok: false, error: "تم تنفيذ الإجراء لكن تعذر إعادة قراءة الفريق." };
    } catch (mutationError) {
      return { ok: false, error: resolveErrorMessage(mutationError) };
    }
  }, [activeStoreId, loadTeam]);

  return {
    teamMembers: members,
    isTeamLoading: loading,
    teamError: error,
    teamStatus: status,
    onInviteMember,
    onMemberAction,
  };
}
