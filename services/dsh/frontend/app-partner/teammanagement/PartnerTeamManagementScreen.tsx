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

export type PartnerTeamRole = 'owner' | 'supervisor' | 'staff' | 'courier';
export type PartnerTeamStatus = 'active' | 'paused' | 'invited' | 'blocked' | 'review-needed';

export type PartnerTeamMember = {
  readonly id: string;
  readonly name: string;
  readonly role: PartnerTeamRole;
  readonly roleLabel: string;
  readonly status: PartnerTeamStatus;
  readonly statusLabel: string;
  readonly branchAssignment: string;
  readonly permissionsSummary: string;
  readonly deliveryAssignment: string;
  readonly inviteLifecycle: string;
  readonly operationalImpact: string;
  readonly auditNote: string;
  readonly inlineActionLabel: string;
};

export type PartnerTeamManagementScreenProps = {
  readonly storeName: string;
  readonly branchLabel: string;
  readonly members?: readonly PartnerTeamMember[];
  readonly onInviteMember?: (identity: string) => void;
  readonly onMemberAction?: (memberId: string, actionLabel: string) => void;
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

function resolveTeamRoleTone(role: PartnerTeamRole): 'brand' | 'info' | 'success' | 'default' {
  if (role === 'owner') return 'brand';
  if (role === 'supervisor') return 'info';
  if (role === 'courier') return 'success';
  return 'default';
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

    onInviteMember(trimmed);
    setActionFeedback(`تم إرسال طلب دعوة العضو إلى runtime: ${trimmed}`);
    setInviteDraft('');
  }, [inviteDraft, onInviteMember]);

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
            <Icon name="information-circle-outline" size={18} tone="info" style={{ marginTop: 2 }} />
            <Text role="bodySm" tone="info" align="start" style={{ flex: 1 }}>
              الأدوار والدعوات تُعرض من runtime فقط، وتبقى إجراءات التعديل خلف مالك الصلاحيات المركزي.
            </Text>
          </View>
        </Card>

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
            <Text role="caption" tone="success" align="start" style={{ marginTop: spacing[1] }}>
              {actionFeedback}
            </Text>
          )}
        </Card>

        <Divider />

        {/* Team Members List */}
        <View style={{ gap: spacing[3] }}>
          <Text role="bodyStrong" align="start">أعضاء الفريق التشغيلي ({members.length})</Text>

          {members.length === 0 ? (
            <Card tone="neutral" padding={3}>
              <Text role="bodySm" tone="muted" align="start">
                لا توجد بيانات أعضاء runtime لهذا الفرع حالياً.
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
                      <Badge label={member.roleLabel} tone={roleTone} />
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
                          onPress={() => {
                            onMemberAction?.(member.id, memberActionLabel);
                            setActionFeedback(`تم إرسال إجراء (${memberActionLabel}) إلى runtime للعضو: ${member.name}`);
                          }}
                        />
                        <Button
                          label={member.status === 'invited' ? 'إلغاء الدعوة' : 'سجل العمليات'}
                          tone="secondary"
                          size="sm"
                          fullWidth={false}
                          onPress={() => {
                            onMemberAction?.(member.id, member.status === 'invited' ? 'cancel-invite' : 'audit-log');
                            setActionFeedback(`تم إرسال طلب إجراء للعضو: ${member.name}`);
                          }}
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
