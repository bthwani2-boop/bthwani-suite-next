// app-field — OnboardingBasicsSection
// Presentational step for the field onboarding wizard. No business logic here.
import React from 'react';
import { View } from 'react-native';
import { TextField, Text, SegmentedControl, spacing, colorRoles } from '@bthwani/ui-kit';
import type { FieldPartnerDraftForm } from '../../shared/field-onboarding';

type Props = {
  readonly form: Partial<FieldPartnerDraftForm>;
  readonly errors: Partial<Record<keyof FieldPartnerDraftForm, string>>;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<FieldPartnerDraftForm>) => void;
};

export function OnboardingBasicsSection({ form, errors, readOnly, onChange }: Props) {
  return (
    <View style={{ gap: spacing[4] }}>
      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        البيانات الأساسية للمتجر
      </Text>

      <TextField
        label="اسم المتجر"
        value={form.legalNameAr ?? ''}
        disabled={readOnly}
        {...(errors.legalNameAr ? { error: errors.legalNameAr } : {})}
        onChangeText={(v) => onChange({ legalNameAr: v, displayName: v })}
        placeholder="مثال: أسواق العليا الطازجة"
      />

      <View style={{ gap: spacing[2] }}>
        <Text role="bodySm" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>نوع الهوية التجارية</Text>
        <SegmentedControl
          items={[
            { value: 'commercial_register', label: 'سجل تجاري' },
            { value: 'national_id', label: 'هوية وطنية' },
            { value: 'freelancer_certificate', label: 'وثيقة عمل حر' },
          ]}
          value={form.legalIdentityType ?? 'commercial_register'}
          onValueChange={(v) => onChange({ legalIdentityType: v as any })}
        />
      </View>

      <TextField
        label="رقم الهوية التجارية"
        value={form.legalIdentityNumber ?? ''}
        disabled={readOnly}
        {...(errors.legalIdentityNumber ? { error: errors.legalIdentityNumber } : {})}
        onChangeText={(v) => onChange({ legalIdentityNumber: v })}
        placeholder="رقم السجل التجاري أو الهوية"
      />

      <TextField
        label="اسم المالك الثنائي/الثلاثي"
        value={form.ownerName ?? ''}
        disabled={readOnly}
        {...(errors.ownerName ? { error: errors.ownerName } : {})}
        onChangeText={(v) => onChange({ ownerName: v })}
        placeholder="الاسم مطابق للهوية أو السجل التجاري"
      />

      <TextField
        label="رقم جوال المالك"
        value={form.primaryPhone ?? ''}
        disabled={readOnly}
        {...(errors.primaryPhone ? { error: errors.primaryPhone } : {})}
        onChangeText={(v) => onChange({ primaryPhone: v })}
        placeholder="مثال: 777123456 أو 0551234567"
        hint="يستخدم لإرسال كود التفعيل والاتفاق النهائي"
      />
    </View>
  );
}
