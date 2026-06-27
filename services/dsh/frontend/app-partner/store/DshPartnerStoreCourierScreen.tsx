import React from 'react';
import { View, Pressable } from 'react-native';
import {
  Box,
  Button,
  Chip,
  Divider,
  Icon,
  KeyValueList,
  MobileScrollView,
  MobileStickyPrimaryAction,
  Switch,
  Text,
  TextField,
  TopBar,
  useDirection,
  useTheme,
  spacing,
} from '@bthwani/ui-kit';
import { resolveDshControlPanelSectionLabel } from '../../shared/runtime/dsh-control-panel-governance.map';
import type {
  StoreCourierCompensation,
  StoreDeliveryPolicy,
  StoreDeliveryPricingSource,
} from '../domain/dsh-partner-binding.contracts';
import { getSurfaceModeCapability, getSurfaceRoleSummaryForMode } from '../../shared/orders';

type PolicyOption = { id: StoreDeliveryPolicy; label: string; description: string };
type PricingOption = { id: StoreDeliveryPricingSource; label: string; description: string };
type CompensationOption = { id: StoreCourierCompensation; label: string; description: string };

const POLICY_OPTIONS: readonly PolicyOption[] = [
  { id: 'free_delivery', label: 'توصيل مجاني', description: 'المتجر يتحمل تكلفة التوصيل — لا رسوم على العميل.' },
  { id: 'courier_per_delivery_payout', label: 'مستحق لكل توصيلة', description: 'الموصل يحصل على مبلغ محدد عن كل طلب يوصله.' },
  { id: 'store_retained_fee_salary_courier', label: 'رسوم للمتجر + راتب للموصل', description: 'رسوم التوصيل تذهب للمتجر، والموصل على راتب ثابت.' },
];

const PRICING_OPTIONS: readonly PricingOption[] = [
  { id: 'bthwani_pricing', label: 'تسعير بثواني', description: 'يعتمد جدول الأسعار الموحد من بثواني.' },
  { id: 'store_fixed_price', label: 'سعر ثابت من المتجر', description: 'المتجر يحدد سعرًا موحدًا للتوصيل لكل الطلبات.' },
  { id: 'control_panel_zone_pricing', label: 'تسعير المناطق — لوحة التحكم', description: 'يعتمد التسعير المناطقي المُدار من لوحة التحكم.' },
];

const COMPENSATION_OPTIONS: readonly CompensationOption[] = [
  { id: 'none', label: 'لا مستحق إضافي', description: 'الموصل على راتب ثابت أو بدون عمولة منفصلة.' },
  { id: 'fixed_per_delivery', label: 'مبلغ ثابت لكل توصيلة', description: 'مبلغ محدد يُضاف لكل طلب يتم توصيله.' },
  { id: 'percentage_of_delivery_fee', label: 'نسبة من رسوم التوصيل', description: 'نسبة مئوية من رسوم التوصيل لكل طلب.' },
];

const BRANCH_OPTIONS = [
  { id: 'all', label: 'كل الفروع' },
  { id: 'yasmin', label: 'فرع الياسمين' },
  { id: 'nada', label: 'فرع الندى' },
] as const;

const BOTTOM_INSET = 144;

function SelectionBlock<T extends string>({
  options,
  selectedId,
  onSelect,
  direction,
}: {
  options: readonly { id: T; label: string; description: string }[];
  selectedId: T;
  onSelect: (id: T) => void;
  direction: 'ltr' | 'rtl';
}) {
  const { theme } = useTheme();

  return (
    <Box gap={0}>
      {options.map((option, index) => {
        const isSelected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => ({
              paddingVertical: spacing[3],
              paddingHorizontal: spacing[1],
              backgroundColor: pressed ? theme.surfaceInset : undefined,
              borderBottomWidth: index < options.length - 1 ? 1 : 0,
              borderBottomColor: theme.line + '22',
            })}
          >
            <Box layoutDirection="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] }}>
              <Box style={{ flex: 1, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
                <Text role="bodyStrong" align="start">{option.label}</Text>
                <Text role="caption" tone="muted" align="start">{option.description}</Text>
              </Box>
              {isSelected && <Icon name="checkmark-circle-outline" tone="brand" size={18} />}
            </Box>
          </Pressable>
        );
      })}
    </Box>
  );
}

export function DshPartnerStoreCourierScreen({ onBack }: { onBack: () => void }) {
  const { direction } = useDirection();
  const [courierName, setCourierName] = React.useState('');
  const [courierPhone, setCourierPhone] = React.useState('');
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<string[]>(['all']);
  const [isActive, setIsActive] = React.useState(false);
  const [policy, setPolicy] = React.useState<StoreDeliveryPolicy>('free_delivery');
  const [pricingSource, setPricingSource] = React.useState<StoreDeliveryPricingSource>('bthwani_pricing');
  const [compensation, setCompensation] = React.useState<StoreCourierCompensation>('none');
  const [savedLabel, setSavedLabel] = React.useState<string | null>(null);

  const requiresCompensation = policy !== 'free_delivery';
  const canSave = courierName.trim().length > 0 && courierPhone.trim().length > 0;

  const selectedPolicyLabel = POLICY_OPTIONS.find((o) => o.id === policy)?.label ?? '';
  const selectedPricingLabel = PRICING_OPTIONS.find((o) => o.id === pricingSource)?.label ?? '';
  const selectedCompensationLabel = COMPENSATION_OPTIONS.find((o) => o.id === compensation)?.label ?? '';

  const branchLabel = selectedBranchIds.includes('all')
    ? 'كل الفروع'
    : BRANCH_OPTIONS.filter((b) => selectedBranchIds.includes(b.id)).map((b) => b.label).join(' · ');

  function toggleBranch(id: string) {
    setSelectedBranchIds((current) => {
      if (id === 'all') {
        return ['all'];
      }
      const without = current.filter((b) => b !== 'all' && b !== id);
      const next = current.includes(id) ? without : [...without, id];
      return next.length === 0 ? ['all'] : next;
    });
  }

  return (
    <MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: BOTTOM_INSET }}>
      <TopBar
        variant="secondary"
        title="إعداد موصل المتجر"
        subtitle="منح صلاحية التوصيل الداخلي"
        style={{ marginHorizontal: -16, marginTop: -16 }}
      />

      {/* 1) Flat boundaries notice */}
      <Box paddingY={1} layoutDirection="row" style={{ alignItems: 'center', gap: 6 }}>
        <Icon name="information-circle-outline" size={14} tone="muted" />
        <Text role="caption" tone="muted" align="start" style={{ flex: 1 }}>
          إعداد الموصل يتم محليًا هنا. أي تسعير أو عمولات أو تسويات مرجعها مركزيًا هو WLT/Finance/Control Panel.
        </Text>
      </Box>

      {/* SSoT visibility capability badge */}
      <Box padding={2} background="surfaceInset" radiusToken="md">
        <Text role="caption" tone="brand" align="start">
          {`الدور المعتمد بالمنظومة (SSoT): ${getSurfaceRoleSummaryForMode('app-partner', 'partner_delivery')}`}
        </Text>
      </Box>

      <Divider />

      {/* 2) Flat Basic Info */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">بيانات الموصل</Text>
        <TextField
          label="اسم موصل المتجر"
          placeholder="مثال: عمر"
          value={courierName}
          onChangeText={setCourierName}
        />
        <TextField
          label="رقم الجوال"
          placeholder="05XXXXXXXX"
          value={courierPhone}
          onChangeText={setCourierPhone}
          keyboardType="phone-pad"
        />
        <Switch
          label="حالة التفعيل"
          description={isActive ? 'الموصل مفعّل وجاهز لاستقبال الطلبات' : 'الموصل غير مفعّل حاليًا'}
          value={isActive}
          onValueChange={setIsActive}
        />
      </Box>

      <Divider />

      {/* 3) Flat Branch Scope */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">الفروع المخصصة</Text>
        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          {BRANCH_OPTIONS.map((branch) => {
            const isSelected = selectedBranchIds.includes(branch.id);
            return (
              <Chip
                key={branch.id}
                label={branch.label}

                selected={isSelected}
                onPress={() => toggleBranch(branch.id)}
              />
            );
          })}
        </Box>
      </Box>

      <Divider />

      {/* 4) Flat Delivery Policy selection */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">سياسة التوصيل</Text>
        <SelectionBlock
          options={POLICY_OPTIONS}
          selectedId={policy}
          onSelect={setPolicy}
          direction={direction}
        />
      </Box>

      <Divider />

      {/* 5) Flat Pricing Source selection */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">مصدر التسعير</Text>
        <SelectionBlock
          options={PRICING_OPTIONS}
          selectedId={pricingSource}
          onSelect={setPricingSource}
          direction={direction}
        />
      </Box>

      {/* 6) Flat Courier Compensation (only when policy requires it) */}
      {requiresCompensation ? (
        <>
          <Divider />
          <Box gap={3} paddingY={2}>
            <Text role="bodyStrong" align="start">مستحق الموصل</Text>
            <SelectionBlock
              options={COMPENSATION_OPTIONS}
              selectedId={compensation}
              onSelect={setCompensation}
              direction={direction}
            />
          </Box>
        </>
      ) : null}

      {/* 7) Flat Summary */}
      {canSave ? (
        <>
          <Divider />
          <Box gap={3} paddingY={2}>
            <Text role="bodyStrong" align="start">ملخص قبل الحفظ</Text>
            <KeyValueList
              items={[
                { label: 'الاسم', value: courierName },
                { label: 'الجوال', value: courierPhone },
                { label: 'الفروع', value: branchLabel },
                { label: 'الحالة', value: isActive ? 'مفعّل' : 'غير مفعّل' },
                { label: 'سياسة التوصيل', value: selectedPolicyLabel },
                { label: 'مصدر التسعير', value: selectedPricingLabel },
                ...(requiresCompensation
                  ? [{ label: 'مستحق الموصل', value: selectedCompensationLabel }]
                  : []),
              ]}
            />
            {savedLabel ? (
              <Text role="caption" tone="success" align="start">{savedLabel}</Text>
            ) : null}
          </Box>
        </>
      ) : null}

      <MobileStickyPrimaryAction
        label="حفظ إعدادات الموصل"
        helperText={canSave ? 'البيانات كاملة وجاهزة للحفظ.' : 'أدخل اسم الموصل ورقم جواله للمتابعة.'}
        onPress={() => {
          if (!canSave) {
            return;
          }
          setSavedLabel('تم الحفظ محليًا — يحتاج تفعيل backend لاحقًا.');
        }}
      />
    </MobileScrollView>
  );
}

export default DshPartnerStoreCourierScreen;
