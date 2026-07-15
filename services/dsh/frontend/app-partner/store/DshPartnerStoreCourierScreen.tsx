import React from 'react';
import { View, Pressable, Switch } from 'react-native';
import {
  Box,
  Button,
  Chip,
  Divider,
  Icon,
  KeyValueList,
  MobileScrollView,
  MobileStickyPrimaryAction,
  Text,
  TextField,
  TopBar,
  useDirection,
  useTheme,
  spacing,
} from '@bthwani/ui-kit';
import { resolveDshControlPanelSectionLabel } from '../../shared/orders/orders.contract';
import type {
  StoreCourierCompensation,
  StoreDeliveryPolicy,
  StoreDeliveryPricingSource,
} from '../dsh-partner-binding.contracts';
import {
  STORE_COURIER_COMPENSATION_OPTIONS,
  STORE_DELIVERY_POLICY_OPTIONS,
  STORE_DELIVERY_PRICING_SOURCE_OPTIONS,
  isStoreDeliveryPolicyCompensationRequired,
  resolveStoreCourierCompensationLabel,
  resolveStoreDeliveryPolicyLabel,
  resolveStoreDeliveryPricingSourceLabel,
} from '../../shared/store';
import { getSurfaceModeCapability, getSurfaceRoleSummaryForMode } from '../../shared/identity-access';

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
  const theme = useTheme() as any;

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

import { fetchPartnerStoreCourierSettings, updatePartnerStoreCourierSettings } from '../../shared/partner/partner.api';
import type { DshPartnerOperationalScope } from '../../shared/partner/partner.types';

export function DshPartnerStoreCourierScreen({
  storeId,
  scopes,
  onBack,
}: {
  storeId: string;
  scopes: readonly DshPartnerOperationalScope[];
  onBack: () => void;
}) {
  const { direction } = useDirection();
  const [courierName, setCourierName] = React.useState('');
  const [courierPhone, setCourierPhone] = React.useState('');
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<string[]>(['all']);
  const [isActive, setIsActive] = React.useState(false);
  const [policy, setPolicy] = React.useState<StoreDeliveryPolicy>('free_delivery');
  const [pricingSource, setPricingSource] = React.useState<StoreDeliveryPricingSource>('bthwani_pricing');
  const [compensation, setCompensation] = React.useState<StoreCourierCompensation>('none');
  const [savedLabel, setSavedLabel] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetchPartnerStoreCourierSettings(storeId).then((data: any) => {
      if (data) {
        setCourierName(data.courierName || '');
        setCourierPhone(data.courierPhone || '');
        setIsActive(data.isActive || false);
        setPolicy(data.policy || 'free_delivery');
        setPricingSource(data.pricingSource || 'bthwani_pricing');
        setCompensation(data.compensation || 'none');
        setSelectedBranchIds(data.selectedBranchIds || ['all']);
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, [storeId]);

  const requiresCompensation = isStoreDeliveryPolicyCompensationRequired(policy);
  const canSave = courierName.trim().length > 0 && courierPhone.trim().length > 0;

  const selectedPolicyLabel = resolveStoreDeliveryPolicyLabel(policy);
  const selectedPricingLabel = resolveStoreDeliveryPricingSourceLabel(pricingSource);
  const selectedCompensationLabel = resolveStoreCourierCompensationLabel(compensation);

  const dynamicBranchOptions = React.useMemo(() => {
    const branches = scopes.map(scope => ({ id: scope.id, label: scope.name }));
    return [{ id: 'all', label: 'كل الفروع' }, ...branches];
  }, [scopes]);

  const branchLabel = selectedBranchIds.includes('all')
    ? 'كل الفروع'
    : dynamicBranchOptions.filter((b) => selectedBranchIds.includes(b.id)).map((b) => b.label).join(' · ');

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
        <Text role="caption" tone="action" align="start">
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
        />
        <Box gap={1}>
          <Text role="bodyStrong">حالة التفعيل</Text>
          <Text role="caption" tone="muted">{isActive ? 'الموصل مفعّل وجاهز لاستقبال الطلبات' : 'الموصل غير مفعّل حاليًا'}</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </Box>
      </Box>

      <Divider />

      {/* 3) Flat Branch Scope */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">الفروع المخصصة</Text>
        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          {dynamicBranchOptions.map((branch) => {
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
          options={STORE_DELIVERY_POLICY_OPTIONS}
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
          options={STORE_DELIVERY_PRICING_SOURCE_OPTIONS}
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
              options={STORE_COURIER_COMPENSATION_OPTIONS}
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
          setSavedLabel('جاري الحفظ...');
          updatePartnerStoreCourierSettings(storeId, {
            courierName,
            courierPhone,
            isActive,
            policy,
            pricingSource,
            compensation,
            selectedBranchIds,
          }).then(() => {
            setSavedLabel('تم الحفظ بنجاح.');
          }).catch(() => {
            setSavedLabel('حدث خطأ أثناء الحفظ.');
          });
        }}
      />
    </MobileScrollView>
  );
}

// export default DshPartnerStoreCourierScreen; // Unused default export