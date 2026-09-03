// app-field — OnboardingBasicsSection
// Presentational step for the field onboarding wizard. No business logic here.
import React from 'react';
import { View } from 'react-native';
import { TextField, Text, SegmentedControl, spacing, colorRoles } from '@bthwani/ui-kit';
import type { FieldPartnerDraftForm } from '../../shared/field-onboarding';
import type { CentralCatalogDomain } from '../../catalog/central-catalog.types';

const LEGAL_IDENTITY_TYPES: readonly {
  readonly value: FieldPartnerDraftForm['legalIdentityType'];
  readonly label: string;
}[] = [
  { value: 'commercial_register', label: 'سجل تجاري' },
  { value: 'national_id', label: 'هوية وطنية' },
  { value: 'freelancer_certificate', label: 'وثيقة عمل حر' },
];

type Props = {
  readonly form: Partial<FieldPartnerDraftForm>;
  readonly errors: Partial<Record<keyof FieldPartnerDraftForm, string>>;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<FieldPartnerDraftForm>) => void;
  readonly businessVerticals: readonly CentralCatalogDomain[];
  readonly businessVerticalsError: string | null;
};

export function OnboardingBasicsSection({ form, errors, readOnly, onChange, businessVerticals, businessVerticalsError }: Props) {
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
          items={LEGAL_IDENTITY_TYPES}
          value={form.legalIdentityType ?? 'commercial_register'}
          onValueChange={(v) => {
            // Narrow against the governed option list instead of casting: an
            // unknown value must be ignored, never written into the draft.
            const match = LEGAL_IDENTITY_TYPES.find((item) => item.value === v);
            if (match) onChange({ legalIdentityType: match.value });
          }}
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
        label="رقم جوال المالك"
        value={form.primaryPhone ?? ''}
        disabled={readOnly}
        {...(errors.primaryPhone ? { error: errors.primaryPhone } : {})}
        onChangeText={(v) => onChange({ primaryPhone: v })}
        placeholder="مثال: 777123456 أو 0551234567"
        hint="يستخدم لإرسال كود التفعيل والاتفاق النهائي"
      />

      <View style={{ gap: spacing[2] }}>
        <Text role="bodySm" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>مجال نشاط المتجر</Text>
        {businessVerticals.length > 0 ? (
          <SegmentedControl
            items={businessVerticals.map((domain) => ({ value: domain.id, label: domain.nameAr }))}
            value={form.businessVerticalId ?? ''}
            onValueChange={(value) => onChange({ businessVerticalId: value })}
          />
        ) : (
          <Text role="caption" tone="warning" style={{ textAlign: 'right' }}>
            {businessVerticalsError ?? 'جارٍ تحميل مجالات النشاط المركزية…'}
          </Text>
        )}
        {errors.businessVerticalId ? <Text role="caption" tone="danger" style={{ textAlign: 'right' }}>{errors.businessVerticalId}</Text> : null}
      </View>
    </View>
  );
}
