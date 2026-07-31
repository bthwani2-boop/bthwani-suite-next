// app-field — OnboardingAgreementSection
// Structured operational readiness and final review for partner intake.
import React from 'react';
import { View } from 'react-native';
import { TextField, Text, SegmentedControl, spacing, colorRoles, Icon } from '@bthwani/ui-kit';
import type { FieldPartnerDraftForm } from '../../shared/field-onboarding';

type Props = {
  readonly form: Partial<FieldPartnerDraftForm>;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<FieldPartnerDraftForm>) => void;
  readonly missingItems: readonly string[];
  readonly fieldNotes: string;
  readonly onFieldNotesChange: (value: string) => void;
};

const DELIVERY_READINESS_ITEMS = [
  { value: 'bthwani_couriers', label: 'كباتن بثواني' },
  { value: 'partner_delivery', label: 'توصيل الشريك' },
  { value: 'pickup', label: 'استلام من المتجر' },
  { value: 'not_ready', label: 'غير جاهز' },
] as const;

export function OnboardingAgreementSection({
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
        label="ساعات العمل"
        value={form.operatingHours ?? ''}
        disabled={readOnly}
        onChangeText={(value) => onChange({ operatingHours: value })}
        placeholder="مثال: السبت–الخميس 08:00–23:30، الجمعة 14:00–23:30"
        hint="اكتب جدولًا أسبوعيًا واضحًا؛ سيُحوّل لاحقًا إلى جدول الفروع المنظم عند الاعتماد."
        multiline
      />

      <View style={{ gap: spacing[2], opacity: readOnly ? 0.6 : 1 }}>
        <Text role="bodySm" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>
          طريقة التوصيل والاستلام الأولية
        </Text>
        <SegmentedControl
          items={DELIVERY_READINESS_ITEMS}
          value={form.deliveryReadiness ?? ''}
          onValueChange={(value) => {
            if (!readOnly) onChange({ deliveryReadiness: value });
          }}
        />
        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
          الاختيار يصف الجاهزية الأولية فقط؛ نطاق الخدمة والتسعير النهائيان يظلان معتمدين من العمليات.
        </Text>
      </View>

      <View style={{ padding: spacing[3], backgroundColor: colorRoles.surfaceMuted, gap: spacing[1] }}>
        <Text role="bodySm" style={{ textAlign: 'right', fontWeight: 'bold' }}>
          بيانات التسوية
        </Text>
        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
          لا تمنع إرسال الملف الميداني. يستكملها الشريك داخل تطبيقه أو موظف مخول، ثم تتحقق منها منظومة WLT.
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[2] }} />

      <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold', color: colorRoles.textPrimary }}>
        مراجعة الملف الميداني وإرساله
      </Text>

      <TextField
        label="ملاحظات الميداني"
        value={fieldNotes}
        disabled={readOnly}
        onChangeText={onFieldNotesChange}
        placeholder="سجل العقبات أو الملاحظات التي ظهرت أثناء زيارة الفرع"
        multiline
      />

      <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[2] }} />

      <View style={{ gap: spacing[2] }}>
        <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold' }}>
          تتبع الأساسيات والنواقص
        </Text>
        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
          {missingItems.length
            ? 'العناصر التالية مفقودة أو غير مستوفاة وتمنع إرسال الملف:'
            : 'تم استيفاء متطلبات الانضمام الأساسية. الملف جاهز للإرسال للمراجعة.'}
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
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[2], paddingVertical: 4 }}>
              <Icon name="checkmark-circle" size={16} tone="success" />
              <Text role="bodySm" tone="success" style={{ textAlign: 'right', flex: 1 }}>
                جاهز للإرسال
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
