// app-field — Step 4: الاتفاق والمراجعة النهائية
// Presentational step for the field onboarding wizard. No business logic here.
import React from 'react';
import { View } from 'react-native';
import { TextField, Text, spacing, colorRoles, Icon } from '@bthwani/ui-kit';
import type { FieldPartnerDraftForm, FieldOnboardingValidationErrors } from '../../shared/field-onboarding';

type Props = {
  readonly form: Partial<FieldPartnerDraftForm>;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<FieldPartnerDraftForm>) => void;
  readonly missingItems: readonly string[];
  readonly fieldNotes: string;
  readonly onFieldNotesChange: (v: string) => void;
};

export function StepAgreementReview({
  form,
  readOnly,
  onChange,
  missingItems,
  fieldNotes,
  onFieldNotesChange,
}: Props) {
  return (
    <View style={{ gap: spacing[4] }}>
      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        ساعات العمل والتوصيل
      </Text>

      <TextField
        label="ساعات العمل اليومية"
        value={form.operatingHours ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ operatingHours: v })}
        placeholder="مثال: من 8:00 صباحًا إلى 11:30 مساءً"
      />

      <TextField
        label="وضعية وجاهزية التوصيل الأولي"
        value={form.deliveryReadiness ?? ''}
        disabled={readOnly}
        onChangeText={(v) => onChange({ deliveryReadiness: v })}
        placeholder="مثال: جاهز بتغطية سريعة كباتن بثواني"
      />

      <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[2] }} />

      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        مراجعة الملف الميداني وإرساله
      </Text>

      <TextField
        label="ملاحظات الميداني الشخصية"
        value={fieldNotes}
        disabled={readOnly}
        onChangeText={onFieldNotesChange}
        placeholder="دون أي عقبات واجهتها أثناء الزيارة الميدانية للفرع"
      />

      <TextField
        label="ملاحظة مراجعة الشركاء السابقة"
        value=""
        disabled
        onChangeText={() => undefined}
        placeholder="لا توجد ملاحظات مراجعة حالية"
      />

      <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[2] }} />

      <View style={{ gap: spacing[2] }}>
        <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold' }}>
          تتبع الأساسيات والنواقص
        </Text>
        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
          {missingItems.length
            ? 'العناصر التالية مفقودة أو غير مستوفاة وتمنع تفعيل خيار إرسال الملف:'
            : 'تم تعبئة كافة الحقول الأساسية المطلوبة. الملف جاهز للإرسال الفوري للتدقيق.'}
        </Text>

        <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
          {missingItems.length ? (
            missingItems.map((item) => (
              <View
                key={item}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: spacing[2],
                  paddingVertical: 4,
                }}
              >
                <Icon name="close-circle" size={16} tone="danger" />
                <Text role="bodySm" tone="danger" style={{ textAlign: 'right', flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))
          ) : (
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: spacing[2],
                paddingVertical: 4,
              }}
            >
              <Icon name="checkmark-circle" size={16} tone="success" />
              <Text role="bodySm" tone="success" style={{ textAlign: 'right', flex: 1 }}>
                جاهز تمامًا للإرسال
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
