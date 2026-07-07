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
import { ActorNotificationsPanel, useNotificationsController } from '../../shared/notifications';
import { DshFieldPartnerCard } from '../components/DshFieldPartnerCard';

type DshFieldPartnersScreenProps = {
  readonly onOpenPartner: (partnerId: string, activationStatus: string) => void;
  readonly onOpenAccount: () => void;
  readonly onCreatePartner: () => void;
};

type FilterOptionId = 'all' | 'today' | 'ready' | 'follow-up' | 'pending';

const FILTER_OPTIONS: readonly { id: FilterOptionId; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'today', label: 'اليوم' },
  { id: 'ready', label: 'جاهز للإضافة' },
  { id: 'follow-up', label: 'تحتاج متابعة' },
  { id: 'pending', label: 'بانتظار اعتماد' },
];

// ─── Orange Brand Header (exact donor replica) ───────────────────────────────
// Layout: [🔍] ——— [بثواني / 📍 جولة المتاجر] ——— [🔔 👤]
function FieldTopBar({
  onSearchPress,
  onNotificationsPress,
  onAccountPress,
  unreadCount = 0,
  // Generic label by default — the actual city/route must come from the
  // runtime user scope, never a hardcoded city.
  locationLabel = 'جولة المتاجر',
}: {
  onSearchPress: () => void;
  onNotificationsPress: () => void;
  onAccountPress: () => void;
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
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
            <Text style={{ color: alpha(colorRoles.surfaceBase, 0.88), fontSize: 12 }}>📍</Text>
            <Text style={{ color: alpha(colorRoles.surfaceBase, 0.88), fontSize: 12 }}>
              {locationLabel}
            </Text>
          </View>
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
        padding: spacing[4],
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
// ─── Filter pill row ──────────────────────────────────────────────────────────
function FilterPills({
  options,
  counts,
  activeId,
  onSelect,
}: {
  options: readonly { id: FilterOptionId; label: string }[];
  counts: Record<FilterOptionId, number>;
  activeId: FilterOptionId;
  onSelect: (id: FilterOptionId) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ flexDirection: 'row-reverse', gap: spacing[2], paddingHorizontal: spacing[4] }}
    >
      {options.map((opt) => {
        const selected = activeId === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={{
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.round,
              borderWidth: 1,
              borderColor: selected ? colorRoles.textPrimary : colorRoles.borderSubtle,
              backgroundColor: selected ? colorRoles.textPrimary : colorRoles.surfaceBase,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: selected ? colorRoles.surfaceBase : colorRoles.textPrimary,
                fontWeight: selected ? 'bold' : 'normal',
              }}
            >
              {`${opt.label} ${counts[opt.id]}`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function DshFieldPartnersScreen({
  onOpenPartner,
  onOpenAccount,
  onCreatePartner,
}: DshFieldPartnersScreenProps) {
  const identity = useIdentitySession();
  const controller = useFieldPartnerDraftsController();
  const notifications = useNotificationsController(identity.state.kind);
  const unreadCount = notifications.state.kind === 'success' ? notifications.state.unreadCount : 0;
  const [showNotifications, setShowNotifications] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterOptionId>('all');

  // Once a partner is visible to clients, its onboarding job is done — it
  // disappears from the field agent's active list immediately.
  const partnersList = (controller.listState.kind === 'success' ? controller.listState.partners : [])
    .filter((partner) => partner.activationStatus !== 'client_visible');

  const filteredPartners = React.useMemo(() => {
    return partnersList.filter((partner) => {
      if (activeFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        if (!partner.createdAt.startsWith(today!)) return false;
      } else if (activeFilter === 'ready' && partner.activationStatus !== 'draft') {
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
    () => filteredPartners.find((p) => p.activationStatus === 'draft') || filteredPartners[0],
    [filteredPartners]
  );

  const counts: Record<FilterOptionId, number> = {
    all: partnersList.length,
    today: partnersList.filter((p) => {
      const today = new Date().toISOString().split('T')[0];
      return p.createdAt.startsWith(today!);
    }).length,
    ready: partnersList.filter((p) => p.activationStatus === 'draft').length,
    'follow-up': partnersList.filter((p) => p.activationStatus === 'documents_missing').length,
    pending: partnersList.filter((p) => p.activationStatus === 'submitted').length,
  };

  if (controller.listState.kind === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
        <FieldTopBar
          onSearchPress={() => setShowSearch((v) => !v)}
          onNotificationsPress={() => setShowNotifications(true)}
          onAccountPress={onOpenAccount}
          unreadCount={unreadCount}
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
        />
        <StateView
          tone="danger"
          title="تعذر تحميل القائمة"
          description={controller.listState.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.retry}
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
              subtitle={`${priorityPartner.category} · ${priorityPartner.primaryPhone}`}
              onPress={() => onOpenPartner(priorityPartner.id, priorityPartner.activationStatus)}
            />
          </View>
        )}

        {/* Separator */}
        <View style={{ height: spacing[3] }} />

        {/* Filter pills */}
        <FilterPills
          options={FILTER_OPTIONS}
          counts={counts}
          activeId={activeFilter}
          onSelect={setActiveFilter}
        />

        <View style={{ height: spacing[3] }} />

        {/* Section bar: "ملفات الانضمام" + "ملف جديد" */}
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
          <Button label="ملف جديد" tone="primary" size="sm" onPress={onCreatePartner} />
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
                onPress={() => onOpenPartner(partner.id, partner.activationStatus)}
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
