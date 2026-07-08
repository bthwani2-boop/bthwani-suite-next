// app-field — OnboardingBankAccountSection
// "معلومات الحساب البنكي للشريك" — Partner-level readiness/metadata captured
// during onboarding. Never a WLT mutation: WLT stays the sole owner of
// financial truth. Presentational step only, no business logic here.
import React from 'react';
import { Pressable, View } from 'react-native';
import { TextField, Text, SegmentedControl, spacing, radius, borders, colorRoles, Icon } from '@bthwani/ui-kit';
import type { FieldPartnerDraftForm } from '../../shared/field-onboarding';

type Props = {
  readonly form: Partial<FieldPartnerDraftForm>;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<FieldPartnerDraftForm>) => void;
};

const SETTLEMENT_PREFERENCE_ITEMS = [
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'mobile_wallet', label: 'محفظة جوال' },
] as const;

export function OnboardingBankAccountSection({ form, readOnly, onChange }: Props) {
  const settlementPreference = form.settlementPreference ?? '';
  const holderMatchesOwner = form.bankAccountHolderMatchesOwner ?? false;

  return (
    <View style={{ gap: spacing[4] }}>
      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        معلومات الحساب البنكي للشريك
      </Text>
      <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
        بيانات استرشادية لمراجعة قسم الشركاء قبل الاعتماد — لا تُنشئ أي حركة مالية فورية.
      </Text>

      <TextField
        label="اسم صاحب الحساب البنكي"
        value={form.beneficiaryName ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ beneficiaryName: v })}
        placeholder="الاسم كما يظهر في كشف الحساب البنكي"
      />

      <TextField
        label="اسم البنك"
        value={form.bankName ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ bankName: v })}
        placeholder="مثال: بنك الكريمي"
      />

      <TextField
        label="الفرع"
        value={form.bankBranch ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ bankBranch: v })}
        placeholder="اختياري"
      />

      <TextField
        label="رقم الحساب البنكي"
        value={form.accountNumber ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ accountNumber: v })}
        placeholder="رقم الحساب"
      />

      <TextField
        label="رقم الآيبان (IBAN)"
        value={form.iban ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ iban: v })}
        placeholder="اختياري"
      />

      <View style={{ gap: spacing[2] }}>
        <Text role="bodySm" style={{ textAlign: 'right' }}>طريقة التسوية المفضلة</Text>
        <SegmentedControl
          items={SETTLEMENT_PREFERENCE_ITEMS}
          value={settlementPreference}
          onValueChange={(v) => onChange({ settlementPreference: v as 'bank_transfer' | 'mobile_wallet' })}
        />
      </View>

      {settlementPreference === 'mobile_wallet' && (
        <TextField
          label="رقم محفظة الدفع"
          value={form.payoutMobileNumber ?? ''}
          disabled={readOnly}
          onChangeText={(v) => onChange({ payoutMobileNumber: v })}
          placeholder="رقم الجوال المرتبط بالمحفظة"
        />
      )}

      <Pressable
        disabled={readOnly}
        onPress={() => onChange({ bankAccountHolderMatchesOwner: !holderMatchesOwner })}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: spacing[2],
          paddingVertical: spacing[2],
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: radius.sm,
            borderWidth: borders.hairline,
            borderColor: holderMatchesOwner ? colorRoles.brandAction : colorRoles.borderStrong,
            backgroundColor: holderMatchesOwner ? colorRoles.brandAction : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {holderMatchesOwner && <Icon name="checkmark" size={14} color={colorRoles.surfaceBase} />}
        </View>
        <Text role="bodySm" style={{ textAlign: 'right', flex: 1 }}>
          صاحب الحساب البنكي هو نفسه مالك المنشأة
        </Text>
      </Pressable>

      <TextField
        label="ملاحظات على الحساب البنكي"
        value={form.bankNotes ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ bankNotes: v })}
        placeholder="اختياري"
      />
    </View>
  );
}
