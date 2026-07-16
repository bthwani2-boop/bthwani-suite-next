import React from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import {
  Badge,
  Card,
  Button,
  Icon,
  Text,
  TextField,
  Divider,
  KeyValueList,
  spacing,
  useDirection,
  useTheme,
  resolveRowDirection,
} from '@bthwani/ui-kit';

// Domain types live in ./partner-team.types so non-UI code (e.g. the
// usePartnerTeamModel hook) does not need to depend on this Screen module.
// Re-exported here for backward compatibility with existing consumers.
export type {
  PartnerTeamRole,
  PartnerTeamStatus,
  PartnerTeamMember,
} from './partner-team.types';
import type { PartnerTeamMember, PartnerTeamRole, PartnerTeamStatus } from './partner-team.types';

export type PartnerTeamMutationResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

export type PartnerTeamManagementScreenProps = {
  readonly storeName: string;
  readonly branchLabel: string;
  readonly members?: readonly PartnerTeamMember[];
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly onInviteMember?: (identity: string) => Promise<PartnerTeamMutationResult> | void;
  readonly onMemberAction?: (memberId: string, action: string) => Promise<PartnerTeamMutationResult> | void;
  readonly onBack?: () => void;
};

const EMPTY_TEAM_MEMBERS: readonly PartnerTeamMember[] = [];

function resolveTeamStatusTone(status: PartnerTeamStatus): 'success' | 'warning' | 'info' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  if (status === 'invited') return 'info';
  if (status === 'review-needed') return 'warning';
  return 'danger';
}

function resolveTeamRoleTone(role: PartnerTeamRole): 'brand' | 'action' | 'success' | 'muted' {
  if (role === 'owner') return 'brand';
  if (role === 'supervisor') return 'action';
  if (role === 'courier') return 'success';
  return 'muted';
}

function resolveMemberActionLabel(member: PartnerTeamMember): string {
  if (member.status === 'active') return member.role === 'supervisor' ? 'تعطيل الحساب' : 'تعديل الدور';
  if (member.status === 'paused') return 'إعادة تفعيل';
  if (member.status === 'invited') return 'إعادة إرسال الدعوة';
  if (member.status === 'blocked') return 'طلب مراجعة';
  return 'إرسال للمراجعة';
}

export function PartnerTeamManagementScreen({
  storeName,
  branchLabel,
  members = EMPTY_TEAM_MEMBERS,
  isLoading = false,
  error = null,
  onInviteMember,
  onMemberAction,
  onBack,
}: PartnerTeamManagementScreenProps) {
  const { direction } = useDirection();
  const theme = useTheme() as any;

  const [selectedMemberId, setSelectedMemberId] = React.useState<string>('');
  const [inviteDraft, setInviteDraft] = React.useState('');
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);

  const activeSupervisorCount = React.useMemo(() => {
    return members.filter((m) => m.role === 'supervisor' && m.status === 'active').length;
  }, [members]);

  const handleAddMember = React.useCallback(() => {
    const trimmed = inviteDraft.trim();
    if (!trimmed) return;

    if (!onInviteMember) {
      setActionFeedback('ربط دعوات الفريق غير متاح من runtime الحالي.');
      return;
    }

    setActionFeedback(`جارٍ إرسال طلب دعوة العضو: ${trimmed}`);
    Promise.resolve(onInviteMember(trimmed)).then((result) => {
      if (result && !result.ok) {
        setActionFeedback(`فشل إرسال الدعوة إلى ${trimmed}: ${result.error}`);
        return;
      }
      setActionFeedback(`تم إرسال طلب دعوة العضو إلى runtime: ${trimmed}`);
    }).catch((err: unknown) => {
      setActionFeedback(`فشل إرسال الدعوة إلى ${trimmed}: ${err instanceof Error ? err.message : 'خطأ غير متوقع'}`);
    });
    setInviteDraft('');
  }, [inviteDraft, onInviteMember]);

  const handleMemberAction = React.useCallback((memberId: string, action: string, actionLabel: string, memberName: string) => {
    if (!onMemberAction) return;
    setActionFeedback(`جارٍ إرسال إجراء (${actionLabel}) للعضو: ${memberName}`);
    Promise.resolve(onMemberAction(memberId, action)).then((result) => {
      if (result && !result.ok) {
        setActionFeedback(`فشل تنفيذ (${actionLabel}) للعضو ${memberName}: ${result.error}`);
        return;
      }
      setActionFeedback(`تم إرسال إجراء (${actionLabel}) إلى runtime للعضو: ${memberName}`);
    }).catch((err: unknown) => {
      setActionFeedback(`فشل تنفيذ (${actionLabel}) للعضو ${memberName}: ${err instanceof Error ? err.message : 'خطأ غير متوقع'}`);
    });
  }, [onMemberAction]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 160 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ padding: spacing[4], gap: spacing[4] }}>
        {/* Header */}
        <View style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
          {onBack && (
            <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
          )}
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
            <Text role="titleSm" align="start">إدارة الفريق والصلاحيات</Text>
            <Text role="bodySm" tone="muted" align="start">
              {storeName} · {branchLabel}
            </Text>
          </View>
        </View>

        {/* Info Banner */}
        <Card tone="info" padding={3}>
          <View style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2], alignItems: 'flex-start' }}>
            <Icon name="information-circle-outline" size={18} tone="brand" style={{ marginTop: 2 }} />
            <Text role="bodySm" tone="action" align="start" style={{ flex: 1 }}>
              الأدوار والدعوات تُعرض من runtime فقط، وتبقى إجراءات التعديل خلف مالك الصلاحيات المركزي.
            </Text>
          </View>
        </Card>

        {/* Read-path error banner */}
        {error && (
          <Card tone="danger" padding={3}>
            <View style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2], alignItems: 'flex-start' }}>
              <Icon name="alert-circle-outline" size={18} tone="danger" style={{ marginTop: 2 }} />
              <Text role="bodySm" tone="danger" align="start" style={{ flex: 1 }}>
                تعذر تحميل بيانات الفريق من runtime: {error}
              </Text>
            </View>
          </Card>
        )}

        {/* Add Member Form */}
        <Card padding={3} gap={3}>
          <Text role="bodyStrong" align="start">دعوة عضو جديد للفريق</Text>
          <TextField
            label="اسم العضو أو البريد الإلكتروني"
            placeholder="مثال: staff@bthwani.sa"
            value={inviteDraft}
            onChangeText={setInviteDraft}
            hint="سيتم إرسال دعوة انضمام مؤقتة للفرع الحالي."
          />
          <Button
            label="إضافة عضو للفريق"
            tone="brand"
            size="sm"
            fullWidth={false}
            disabled={!onInviteMember}
            onPress={handleAddMember}
          />
          {actionFeedback && (
            <Text role="caption" tone={actionFeedback.startsWith('فشل') ? 'danger' : 'success'} align="start" style={{ marginTop: spacing[1] }}>
              {actionFeedback}
            </Text>
          )}
        </Card>

        <Divider />

        {/* Team Members List */}
        <View style={{ gap: spacing[3] }}>
          <Text role="bodyStrong" align="start">أعضاء الفريق التشغيلي ({members.length})</Text>

          {members.length === 0 ? (
            <Card tone="default" padding={3}>
              <Text role="bodySm" tone="muted" align="start">
                {isLoading ? 'جارٍ تحميل بيانات الفريق من runtime...' : 'لا توجد بيانات أعضاء runtime لهذا الفرع حالياً.'}
              </Text>
            </Card>
          ) : (
          <View style={{ gap: spacing[2] }}>
            {members.map((member) => {
              const isSelected = selectedMemberId === member.id;
              const roleTone = resolveTeamRoleTone(member.role);
              const statusTone = resolveTeamStatusTone(member.status);
              const memberActionLabel = resolveMemberActionLabel(member);
              const isLastSupervisor = member.role === 'supervisor' && member.status === 'active' && activeSupervisorCount <= 1;

              return (
                <Card key={member.id} padding={0}>
                  <Pressable
                    onPress={() => setSelectedMemberId(isSelected ? '' : member.id)}
                    style={({ pressed }) => ({
                      flexDirection: resolveRowDirection(direction),
                      alignItems: 'center',
                      padding: spacing[3],
                      backgroundColor: pressed ? theme.surfaceInset : undefined,
                    })}
                  >
                    <Icon
                      name={
                        member.role === 'courier'
                          ? 'bicycle-outline'
                          : member.role === 'owner'
                            ? 'shield-checkmark-outline'
                            : member.role === 'supervisor'
                              ? 'person-circle-outline'
                              : 'person-outline'
                      }
                      size={20}
                      tone={roleTone}
                      style={{ marginHorizontal: spacing[1] }}
                    />
                    <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start', marginHorizontal: spacing[2] }}>
                      <Text role="bodyStrong" align="start">{member.name}</Text>
                      <Text role="caption" tone="muted" align="start">{member.branchAssignment}</Text>
                    </View>
                    <View style={{ alignItems: direction === 'rtl' ? 'flex-start' : 'flex-end', gap: 4 }}>
                      <Badge label={member.roleLabel} tone={roleTone === 'brand' ? 'action' : roleTone === 'muted' ? 'neutral' : roleTone} />
                      <Badge label={member.statusLabel} tone={statusTone} />
                    </View>
                    <Icon name={isSelected ? 'chevron-down' : 'chevron-forward-outline'} mirrored tone="muted" size={14} style={{ marginStart: spacing[2] }} />
                  </Pressable>

                  {isSelected && (
                    <View style={{ padding: spacing[3], borderTopWidth: 1, borderTopColor: theme.line, gap: spacing[3] }}>
                      <KeyValueList
                        dense
                        items={[
                          { label: 'الفرع المسند', value: member.branchAssignment },
                          { label: 'صلاحيات الوصول', value: member.permissionsSummary },
                          { label: 'إسناد التوصيل', value: member.deliveryAssignment },
                          { label: 'تاريخ التسجيل', value: member.inviteLifecycle },
                          { label: 'الأثر التشغيلي', value: member.operationalImpact },
                        ]}
                      />
                      {member.auditNote && (
                        <Text role="caption" tone="muted" align="start">
                          ملاحظة تدقيق: {member.auditNote}
                        </Text>
                      )}
                      {isLastSupervisor && (
                        <Text role="caption" tone="warning" align="start">
                          تنبيه: لا يمكن إلغاء تفعيل آخر مشرف للفرع لضمان استمرارية العمليات.
                        </Text>
                      )}
                      <View style={{ flexDirection: resolveRowDirection(direction), gap: spacing[2] }}>
                        <Button
                          label={memberActionLabel}
                          tone={member.status === 'blocked' ? 'secondary' : 'brand'}
                          size="sm"
                          fullWidth={false}
                          disabled={isLastSupervisor}
                          onPress={() => handleMemberAction(member.id, member.inlineAction, memberActionLabel, member.name)}
                        />
                        <Button
                          label={member.status === 'invited' ? 'إلغاء الدعوة' : 'سجل العمليات'}
                          tone="secondary"
                          size="sm"
                          fullWidth={false}
                          onPress={() => handleMemberAction(
                            member.id,
                            member.status === 'invited' ? 'cancel-invite' : 'audit-log',
                            member.name,
                          )}
                        />
                      </View>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

export default PartnerTeamManagementScreen;
