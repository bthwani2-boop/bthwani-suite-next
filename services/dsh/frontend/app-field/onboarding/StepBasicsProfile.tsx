// app-field — Step 1: بيانات المتجر الأساسية
// Presentational step for the field onboarding wizard. No business logic here.
import React from 'react';
import { View } from 'react-native';
import { TextField, Text, spacing, colorRoles } from '@bthwani/ui-kit';
import type { FieldPartnerDraftForm } from '../../shared/field-onboarding';

type Props = {
  readonly form: Partial<FieldPartnerDraftForm>;
  readonly errors: Partial<Record<keyof FieldPartnerDraftForm, string>>;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<FieldPartnerDraftForm>) => void;
};

export function StepBasicsProfile({ form, errors, readOnly, onChange }: Props) {
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
