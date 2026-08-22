// app-field — DshFieldPartnersScreen
// شاشة ملفات الانضمام الميدانية — تقرأ من runtime الحقيقي فقط (useFieldPartnerDraftsController).
import React from 'react';
import { ScrollView, View, Pressable, StatusBar, Platform } from 'react-native';
import { useIdentitySession } from '@bthwani/core-identity';
import {
  Badge,
  Button,
  StateView,
  Text,
  TextField,
  spacing,
  radius,
  colorRoles,
  alpha,
  Icon,
} from '@bthwani/ui-kit';
import { useFieldPartnerDraftsController } from '../../shared/field-onboarding';
import { isDshPartnerActivationComplete } from '../../shared/partner';
import {
  listFieldOnboardingAssignments,
  openFieldOnboardingAssignment,
  type FieldOnboardingAssignment,
} from '../../shared/field-assignment';
import { DshFieldProblemState } from '../components/DshFieldProblemNotice';
import { ActorNotificationsPanel, useNotificationsController } from '../../shared/notifications';
import { DshFieldPartnerCard } from '../components/DshFieldPartnerCard';
import { FieldOnboardingAssignmentCard } from '../components/FieldOnboardingAssignmentCard';
import { formatFieldPartnerCategory } from '../components/field-display';

type DshFieldPartnersScreenProps = {
  readonly onOpenPartner: (partnerId: string, activationStatus: string) => void;
  readonly onOpenAccount: () => void;
  readonly onCreatePartner: () => void;
  readonly onOpenWorkQueue: () => void;
  readonly onOpenAssignment: (assignment: FieldOnboardingAssignment) => void;
};

type FilterOptionId = 'all' | 'completed' | 'draft' | 'follow-up' | 'pending';
type AnalyticsCounts = Record<FilterOptionId, number>;

// ─── Orange Brand Header (exact donor replica) ───────────────────────────────
// Layout: [🔍] ——— [بثواني / 📍 جولة المتاجر] ——— [🔔 👤]
function FieldTopBar({
  onSearchPress,
  onNotificationsPress,
  onAccountPress,
  onWorkQueuePress,
  unreadCount = 0,
  // Generic label by default — the actual city/route must come from the
  // runtime user scope, never a hardcoded city.
  locationLabel = 'جولة المتاجر',
}: {
  onSearchPress: () => void;
  onNotificationsPress: () => void;
  onAccountPress: () => void;
  onWorkQueuePress: () => void;
  unreadCount?: number;
  locationLabel?: string;
}) {
  return (
    <>
      {/* Paint status bar orange — App.tsx already reserves the space via insets.top */}
      <StatusBar
        backgroundColor={colorRoles.brandAction}
        barStyle="light-content"
        translucent={false}
      />
      <View
        style={{
          backgroundColor: colorRoles.brandAction,
          paddingTop: spacing[3],
          paddingBottom: spacing[3],
          paddingHorizontal: spacing[4],
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Left: search icon */}
        <Pressable
          onPress={onSearchPress}
          style={{ padding: spacing[2] }}
          accessibilityLabel="بحث"
        >
          <Icon name="search-outline" size={24} color={colorRoles.surfaceBase} />
        </Pressable>

        {/* Center: title + subtitle */}
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text
            style={{
              color: colorRoles.surfaceBase,
              fontWeight: 'bold',
              fontSize: 18,
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            بثواني
          </Text>

        </View>

        {/* Right: bell + person icons */}
        <View style={{ flexDirection: 'row', gap: spacing[1] }}>
          <Pressable
            onPress={onNotificationsPress}
            style={{ padding: spacing[2], position: 'relative' }}
            accessibilityLabel={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروءة` : 'الإشعارات'}
          >
            <Icon name="notifications-outline" size={24} color={colorRoles.surfaceBase} />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colorRoles.surfaceBase,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ color: colorRoles.brandAction, fontSize: 10, fontWeight: 'bold' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={onAccountPress}
            style={{ padding: spacing[2] }}
            accessibilityLabel="الحساب"
          >
            <Icon name="person-outline" size={24} color={colorRoles.surfaceBase} />
          </Pressable>
        </View>
      </View>
    </>
  );
}
// ─── Priority "Next Store" card (donor: المتجر التالي في جولتك) ─────────────
function NextPartnerCard({
  displayName,
  subtitle,
  onPress,
}: {
  displayName: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colorRoles.surfaceBase,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colorRoles.borderSubtle,
        padding: spacing[3],
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[3],
        shadowColor: colorRoles.brandStructure,
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* Right: text */}
      <View style={{ flex: 1, gap: spacing[1], alignItems: 'flex-end' }}>
        <Text style={{ color: colorRoles.brandAction, fontSize: 11, textAlign: 'right' }}>
          المتجر التالي في جولتك
        </Text>
        <Text
          style={{ fontWeight: 'bold', fontSize: 17, textAlign: 'right', color: colorRoles.textPrimary }}
        >
          {displayName}
        </Text>
        <Text style={{ fontSize: 13, color: colorRoles.textMuted, textAlign: 'right' }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
// ─── Compact analytics + smart filter ────────────────────────────────────────
function WorkAnalytics({
  counts,
  totalCount,
  activeId,
  onSelect,
}: {
  counts: AnalyticsCounts;
  totalCount: number;
  activeId: FilterOptionId;
  onSelect: (id: FilterOptionId) => void;
}) {
  const options: readonly { id: Exclude<FilterOptionId, 'all'>; label: string; hint: string }[] = [
    { id: 'completed', label: 'مكتملة', hint: 'جاهزة للتشغيل' },
    { id: 'draft', label: 'مسودات', hint: 'تحتاج إكمال' },
    { id: 'follow-up', label: 'تحتاج متابعة', hint: 'نواقص أو عائق' },
    { id: 'pending', label: 'بانتظار الاعتماد', hint: 'لدى الشركاء' },
  ];

  return (
    <View style={{ paddingHorizontal: spacing[4], gap: spacing[2] }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: colorRoles.textPrimary, textAlign: 'right' }}>ملخص العمل</Text>
          <Text style={{ fontSize: 12, color: colorRoles.textMuted, textAlign: 'right' }}>{`إجمالي المتاجر ${totalCount} · اضغط على الحالة للتصفية`}</Text>
        </View>
        <Pressable onPress={() => onSelect('all')} accessibilityRole="button" style={{ paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.round, backgroundColor: activeId === 'all' ? colorRoles.brandAction : colorRoles.surfaceMuted }}>
          <Text style={{ color: activeId === 'all' ? colorRoles.surfaceBase : colorRoles.textPrimary, fontSize: 12, fontWeight: 'bold' }}>{`المفتوحة ${counts.all}`}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2] }}>
        {options.map((opt) => {
        const selected = activeId === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            accessibilityRole="button"
            style={{
              width: '48%',
              minHeight: 72,
              padding: spacing[3],
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: selected ? colorRoles.brandAction : colorRoles.borderSubtle,
              backgroundColor: selected ? colorRoles.brandActionSoft : colorRoles.surfaceBase,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: selected ? colorRoles.brandAction : colorRoles.textPrimary }}>{counts[opt.id]}</Text>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: 'bold', color: colorRoles.textPrimary, textAlign: 'right' }}>{opt.label}</Text>
            </View>
            <Text style={{ fontSize: 11, color: colorRoles.textMuted, textAlign: 'right' }}>{opt.hint}</Text>
          </Pressable>
        );
        })}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function DshFieldPartnersScreen({
  onOpenPartner,
  onOpenAccount,
  onCreatePartner,
  onOpenWorkQueue,
  onOpenAssignment,
}: DshFieldPartnersScreenProps) {
  const identity = useIdentitySession();
  const controller = useFieldPartnerDraftsController();
  const notifications = useNotificationsController(identity.state.kind);
  const unreadCount = notifications.state.kind === 'success' ? notifications.state.unreadCount : 0;
  const [showNotifications, setShowNotifications] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterOptionId>('all');
  const [assignments, setAssignments] = React.useState<readonly FieldOnboardingAssignment[]>([]);
  const [assignmentError, setAssignmentError] = React.useState<string | null>(null);
  const [openingAssignmentId, setOpeningAssignmentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void listFieldOnboardingAssignments()
      .then(setAssignments)
      .catch(() => setAssignmentError('تعذر تحميل المهام المسندة. تحقق من الاتصال ثم أعد المحاولة.'));
  }, []);

  const openAssignment = React.useCallback(async (assignment: FieldOnboardingAssignment) => {
    setOpeningAssignmentId(assignment.id);
    setAssignmentError(null);
    try {
      const opened = assignment.status === 'assigned'
        ? await openFieldOnboardingAssignment(assignment.id, { expectedVersion: assignment.version })
        : assignment;
      setAssignments((current) => current.map((item) => item.id === opened.id ? opened : item));
      onOpenAssignment(opened);
    } catch {
      setAssignmentError('تعذر فتح المهمة. أعد تحميل القائمة ثم حاول مجددًا.');
    } finally {
      setOpeningAssignmentId(null);
    }
  }, [onOpenAssignment]);

  // Once a partner is visible to clients, its onboarding job is done — it
  // disappears from the field agent's active list immediately.
  const allPartners = controller.listState.kind === 'success' ? controller.listState.partners : [];
  const activePartners = allPartners.filter((partner) => !isDshPartnerActivationComplete(partner.activationStatus));
  const partnersList = activeFilter === 'completed'
    ? allPartners.filter((partner) => isDshPartnerActivationComplete(partner.activationStatus))
    : activePartners;

  const filteredPartners = React.useMemo(() => {
    return partnersList.filter((partner) => {
      if (activeFilter === 'draft' && partner.activationStatus !== 'draft') {
        return false;
      } else if (activeFilter === 'follow-up' && partner.activationStatus !== 'documents_missing') {
        return false;
      } else if (activeFilter === 'pending' && partner.activationStatus !== 'submitted') {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          partner.displayName.toLowerCase().includes(q) ||
          partner.legalNameAr.toLowerCase().includes(q) ||
          partner.primaryPhone.includes(q)
        );
      }
      return true;
    });
  }, [partnersList, activeFilter, searchQuery]);

  const priorityPartner = React.useMemo(
    () => activeFilter === 'all' ? filteredPartners.find((p) => p.activationStatus === 'draft') || filteredPartners[0] : undefined,
    [activeFilter, filteredPartners]
  );

  const counts: AnalyticsCounts = {
    all: activePartners.length,
    completed: allPartners.filter((p) => isDshPartnerActivationComplete(p.activationStatus)).length,
    draft: allPartners.filter((p) => p.activationStatus === 'draft').length,
    'follow-up': allPartners.filter((p) => p.activationStatus === 'documents_missing').length,
    pending: allPartners.filter((p) => p.activationStatus === 'submitted').length,
  };

  if (controller.listState.kind === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <FieldTopBar
          onSearchPress={() => setShowSearch((v) => !v)}
          onNotificationsPress={() => setShowNotifications(true)}
          onAccountPress={onOpenAccount}
        unreadCount={unreadCount}
        onWorkQueuePress={onOpenWorkQueue}
        />
        <StateView loading title="التحميل قيد التقدم" description="نقوم بمزامنة أحدث بيانات المتجر والمواقع الآن." />
      </View>
    );
  }

  if (controller.listState.kind === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <FieldTopBar
          onSearchPress={() => setShowSearch((v) => !v)}
          onNotificationsPress={() => setShowNotifications(true)}
          onAccountPress={onOpenAccount}
        unreadCount={unreadCount}
        onWorkQueuePress={onOpenWorkQueue}
        />
        <DshFieldProblemState
          problem={controller.listState.problem}
          handlers={{ refresh_record: controller.retry, refresh_scope: controller.retry }}
          onRetry={controller.retry}
        />
      </View>
    );
  }

  if (showNotifications) {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <FieldTopBar
          onSearchPress={() => setShowSearch((v) => !v)}
          onNotificationsPress={() => setShowNotifications(true)}
          onAccountPress={onOpenAccount}
        unreadCount={unreadCount}
        onWorkQueuePress={onOpenWorkQueue}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing[4], paddingBottom: 128, gap: spacing[3] }}
          showsVerticalScrollIndicator={false}
        >
          <ActorNotificationsPanel
            authKind={identity.state.kind}
            title="إشعارات المندوب الميداني"
            emptyDescription="ستظهر هنا إشعارات الزيارات، ملفات الانضمام، والتواصل التشغيلي للمندوب الميداني."
          />
          <Button label="العودة إلى ملفات الانضمام" tone="secondary" onPress={() => setShowNotifications(false)} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      {/* Orange Top Bar */}
      <FieldTopBar
        onSearchPress={() => setShowSearch((v) => !v)}
        onNotificationsPress={() => setShowNotifications(true)}
        onAccountPress={onOpenAccount}
        unreadCount={unreadCount}
        onWorkQueuePress={onOpenWorkQueue}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Priority store card */}
        {priorityPartner && (
          <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4] }}>
            <NextPartnerCard
              displayName={priorityPartner.displayName || 'ملف انضمام جديد'}
              subtitle={`${formatFieldPartnerCategory(priorityPartner.category)} · ${priorityPartner.primaryPhone}`}
              onPress={() => onOpenPartner(priorityPartner.id, priorityPartner.activationStatus)}
            />
          </View>
        )}

        <View style={{ height: spacing[3] }} />
        <WorkAnalytics counts={counts} totalCount={allPartners.length} activeId={activeFilter} onSelect={setActiveFilter} />

        {assignments.length > 0 ? (
          <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[2] }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, textAlign: 'right' }}>المهام المسندة</Text>
            {assignments.map((assignment) => (
              <FieldOnboardingAssignmentCard
                key={assignment.id}
                assignment={assignment}
                loading={openingAssignmentId === assignment.id}
                onPress={() => void openAssignment(assignment)}
              />
            ))}
            {assignmentError ? <Text style={{ color: colorRoles.danger, textAlign: 'right' }}>{assignmentError}</Text> : null}
          </View>
        ) : null}

        <View style={{ height: spacing[3] }} />

        {/* Section bar: "ملفات الانضمام" + "إضافة شريك" */}
        <View
          style={{
            flexDirection: 'row-reverse',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: spacing[4],
            marginBottom: spacing[2],
          }}
        >
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>ملفات الانضمام</Text>
          <Button label="إضافة شريك" tone="primary" size="sm" onPress={onCreatePartner} />
        </View>

        {/* Search */}
        {showSearch && (
          <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[2] }}>
            <TextField
              placeholder="البحث بالاسم، الرقم، أو الفئة..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leading={<Icon name="search-outline" size={20} tone="muted" />}
            />
          </View>
        )}

        {/* Partners list */}
        <View style={{ paddingHorizontal: spacing[4] }}>
          {filteredPartners.length > 0 ? (
            filteredPartners.map((partner) => (
              <DshFieldPartnerCard
                key={partner.id}
                partner={partner}
                {...(!isDshPartnerActivationComplete(partner.activationStatus) ? { onPress: () => onOpenPartner(partner.id, partner.activationStatus) } : {})}
              />
            ))
          ) : (
            <View style={{ gap: spacing[2], paddingVertical: spacing[8], alignItems: 'center' }}>
              <Text style={{ textAlign: 'center', color: colorRoles.textMuted, fontSize: 15 }}>
                لا توجد نتائج مطابقة
              </Text>
              <Text style={{ textAlign: 'center', color: colorRoles.textMuted, fontSize: 13 }}>
                جرّب تغيير فلتر البحث أو إلغاء البحث
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
