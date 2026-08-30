import React from 'react';
import type { DshPartnerRoute } from './partner.types';
import { toPartnerTeamMember, type PartnerTeamInviteRole, type PartnerTeamMember } from './partner-team.types';
import { createPartnerMutationContext } from './partner-onboarding.runtime';
import { executePartnerStoreTeamMemberAction, fetchPartnerStoreTeam, invitePartnerStoreTeamMember } from './partner.api';

export type PartnerTeamMutationResult = { readonly ok: true } | { readonly ok: false; readonly error: string };
export type PartnerTeamModelStatus = 'idle' | 'loading' | 'error' | 'ready';

export function usePartnerTeamController({
  route,
  storeId,
}: {
  route: DshPartnerRoute;
  storeId: string | null;
}) {
  const [members, setMembers] = React.useState<readonly PartnerTeamMember[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<PartnerTeamModelStatus>('idle');
  const mountedRef = React.useRef(true);
  const requestSeqRef = React.useRef(0);
  const mutationBusyRef = React.useRef(false);

  const activeStoreId = storeId?.trim() || '';
  const scopeKey = `${route}:${activeStoreId}`;
  const scopeKeyRef = React.useRef(scopeKey);
  scopeKeyRef.current = scopeKey;

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
      mutationBusyRef.current = false;
    };
  }, []);

  const loadTeam = React.useCallback(async (): Promise<boolean> => {
    const requestSeq = ++requestSeqRef.current;
    const requestScopeKey = scopeKey;
    if (route !== 'team' || !activeStoreId) {
      if (mountedRef.current && requestScopeKey === scopeKeyRef.current) {
        setMembers([]);
        setLoading(false);
        setError(null);
        setStatus('idle');
      }
      return false;
    }
    setLoading(true);
    setError(null);
    setStatus('loading');
    try {
      const result = await fetchPartnerStoreTeam(activeStoreId);
      if (
        !mountedRef.current
        || requestSeq !== requestSeqRef.current
        || requestScopeKey !== scopeKeyRef.current
      ) return false;
      const nextMembers = result.members
        .map(toPartnerTeamMember)
        .filter((member): member is PartnerTeamMember => member !== null);
      setMembers(nextMembers);
      setLoading(false);
      setStatus('ready');
      return true;
    } catch (cause) {
      if (
        !mountedRef.current
        || requestSeq !== requestSeqRef.current
        || requestScopeKey !== scopeKeyRef.current
      ) return false;
      setMembers([]);
      setError(cause instanceof Error ? cause.message : 'تعذر قراءة فريق المتجر من DSH.');
      setLoading(false);
      setStatus('error');
      return false;
    }
  }, [route, activeStoreId, scopeKey]);

  React.useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const onInviteMember = React.useCallback(async (
    identity: string,
    role: PartnerTeamInviteRole = 'staff',
  ): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) {
      return { ok: false, error: 'لا يوجد فرع محدد لإرسال الدعوة.' };
    }
    if (mutationBusyRef.current) {
      return { ok: false, error: 'يوجد إجراء فريق قيد التنفيذ. انتظر اكتماله وإعادة القراءة.' };
    }
    const mutationScopeKey = scopeKey;
    mutationBusyRef.current = true;
    try {
      await invitePartnerStoreTeamMember(
        activeStoreId,
        identity,
        role,
        createPartnerMutationContext('team-invite', activeStoreId),
      );
      if (!mountedRef.current || mutationScopeKey !== scopeKeyRef.current) {
        return { ok: false, error: 'تغير نطاق المتجر أثناء تنفيذ الدعوة؛ أعد فتح فريق المتجر الحالي للتحقق من النتيجة.' };
      }
      const readbackVerified = await loadTeam();
      if (!readbackVerified) {
        return { ok: false, error: 'تم إرسال الدعوة، لكن تعذر تأكيد فريق المتجر من DSH بعد التنفيذ.' };
      }
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : 'تعذر إرسال الدعوة من DSH.' };
    } finally {
      mutationBusyRef.current = false;
    }
  }, [activeStoreId, loadTeam, scopeKey]);

  const onMemberAction = React.useCallback(async (memberId: string, action: string): Promise<PartnerTeamMutationResult> => {
    if (!activeStoreId) {
      return { ok: false, error: 'لا يوجد فرع محدد لتنفيذ الإجراء.' };
    }
    if (mutationBusyRef.current) {
      return { ok: false, error: 'يوجد إجراء فريق قيد التنفيذ. انتظر اكتماله وإعادة القراءة.' };
    }
    const member = members.find((candidate) => candidate.id === memberId);
    if (!member || member.version < 1) {
      return { ok: false, error: 'بيانات العضوية قديمة؛ أعد تحميل الفريق قبل التنفيذ.' };
    }
    const mutationScopeKey = scopeKey;
    mutationBusyRef.current = true;
    try {
      await executePartnerStoreTeamMemberAction(
        activeStoreId,
        memberId,
        action,
        member.version,
        createPartnerMutationContext('team-action', memberId, member.version),
      );
      if (!mountedRef.current || mutationScopeKey !== scopeKeyRef.current) {
        return { ok: false, error: 'تغير نطاق المتجر أثناء تنفيذ الإجراء؛ أعد فتح فريق المتجر الحالي للتحقق من النتيجة.' };
      }
      const readbackVerified = await loadTeam();
      if (!readbackVerified) {
        return { ok: false, error: 'تم إرسال الإجراء، لكن تعذر تأكيد فريق المتجر من DSH بعد التنفيذ.' };
      }
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : 'تعذر تنفيذ إجراء الفريق من DSH.' };
    } finally {
      mutationBusyRef.current = false;
    }
  }, [activeStoreId, loadTeam, members, scopeKey]);

  return {
    teamMembers: members,
    isTeamLoading: loading,
    teamError: error,
    teamStatus: status,
    onInviteMember,
    onMemberAction,
  };
}
