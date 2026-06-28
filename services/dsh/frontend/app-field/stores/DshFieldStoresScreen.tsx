// app-field — DshFieldStoresScreen
// نسخة طبق الأصل من مانح dsh-suite — شاشة ملفات الانضمام الميدانية
import React from 'react';
import { ScrollView, View, Pressable, StatusBar, Platform } from 'react-native';
import {
  Badge,
  Button,
  StateView,
  Text,
  TextField,
  spacing,
  radius,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';
import { useIdentitySession } from '@bthwani/core-identity';
import { usePartnerAdminController } from '../../shared/partner';
import { FieldStoreCard } from './FieldStoreCard';

type DshFieldStoresScreenProps = {
  readonly onOpenStore: (storeId: string) => void;
  readonly onOpenAccount: () => void;
  readonly onCreateStore: () => void;
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
// Layout: [🔍] ——— [بثواني / 📍 الرياض · جولة المتاجر] ——— [🔔 👤]
function FieldTopBar({
  onSearchPress,
  onAccountPress,
  locationLabel = 'الرياض · جولة المتاجر',
}: {
  onSearchPress: () => void;
  onAccountPress: () => void;
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
          <Icon name="search-outline" size={24} color="#FFFFFF" />
        </Pressable>

        {/* Center: title + subtitle */}
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: 18,
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            بثواني
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12 }}>📍</Text>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12 }}>
              {locationLabel}
            </Text>
          </View>
        </View>

        {/* Right: bell + person icons */}
        <View style={{ flexDirection: 'row', gap: spacing[1] }}>
          <Pressable style={{ padding: spacing[2] }} accessibilityLabel="الإشعارات">
            <Icon name="notifications-outline" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={onAccountPress}
            style={{ padding: spacing[2] }}
            accessibilityLabel="الحساب"
          >
            <Icon name="person-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </>
  );
}

// ─── Priority "Next Store" card (donor: المتجر التالي في جولتك) ─────────────
function NextStoreCard({
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
        backgroundColor: '#FFF',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colorRoles.borderSubtle,
        padding: spacing[4],
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[3],
        shadowColor: '#000',
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
              backgroundColor: selected ? colorRoles.textPrimary : '#FFF',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: selected ? '#FFF' : colorRoles.textPrimary,
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
export function DshFieldStoresScreen({
  onOpenStore,
  onOpenAccount,
  onCreateStore,
}: DshFieldStoresScreenProps) {
  const identity = useIdentitySession();
  const controller = usePartnerAdminController(identity.state.kind);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterOptionId>('all');

  const partnersList = controller.listState.kind === 'success' ? controller.listState.partners : [];

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
          onAccountPress={onOpenAccount}
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
          onAccountPress={onOpenAccount}
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

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      {/* Orange Top Bar */}
      <FieldTopBar
        onSearchPress={() => setShowSearch((v) => !v)}
        onAccountPress={onOpenAccount}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 128 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Priority store card */}
        {priorityPartner && (
          <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4] }}>
            <NextStoreCard
              displayName={priorityPartner.displayName || 'ملف انضمام جديد'}
              subtitle={`${priorityPartner.category} · ${priorityPartner.primaryPhone}`}
              onPress={() => onOpenStore(priorityPartner.id)}
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
          <Button label="ملف جديد" tone="primary" size="sm" onPress={onCreateStore} />
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
              <FieldStoreCard
                key={partner.id}
                partner={partner}
                onPress={() => onOpenStore(partner.id)}
              />
            ))
          ) : (
            <View style={{ gap: spacing[2], paddingVertical: spacing[8], alignItems: 'center' }}>
              <Text style={{ textAlign: 'center', color: colorRoles.textMuted, fontSize: 15 }}>
                لا توجد نتائج مطابقة
              </Text>
              <Text style={{ textAlign: 'center', color: colorRoles.textMuted, fontSize: 13 }}>
                جرّب تغيير الشريحة أو إلغاء البحث
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
