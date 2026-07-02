// app-field — DshFieldFinanceScreen
// Read-only financial reference screen displaying commission references from WLT.
import React from 'react';
import { ScrollView, View } from 'react-native';
import {
  Badge,
  Button,
  IconButton,
  StateView,
  Text,
  spacing,
  colorRoles,
  Icon,
  Header,
} from '@bthwani/ui-kit';
import { useWltDshFieldCommissionReferenceController, toFieldCommissionViewModel } from '../../../../wlt/frontend/shared/dsh/index';
import { useIdentitySession } from '@bthwani/core-identity';
import { usePartnerAdminController } from '../../shared/partner';

type DshFieldFinanceScreenProps = {
  readonly onBack: () => void;
};

export function DshFieldFinanceScreen({ onBack }: DshFieldFinanceScreenProps) {
  const identity = useIdentitySession();
  const partnerAdmin = usePartnerAdminController(identity.state.kind);
  
  const partners = partnerAdmin.listState.kind === 'success' ? partnerAdmin.listState.partners : [];
  const partnerId = partners[0]?.id ?? 'no-partner';

  const controller = useWltDshFieldCommissionReferenceController(partnerId);
  const state = controller.state;

  if (state.kind === 'loading') {
    return (
      <StateView
        loading
        title="جارٍ تحميل البيانات المالية"
        description="نحسب المستحقات والعمولات للملفات المعتمدة من خادم العمولات البنكي المالي."
      />
    );
  }

  if (state.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر الوصول للبيانات المالية"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.retry}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header
        title="المالية والعمولات الميدانية"
        subtitle="مستحقات وعمولات تأهيل الشركاء (عرض فقط من محرك المحفظة)"
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
          <Text role="titleMd" style={{ textAlign: 'right' }}>
            المستحقات المالية
          </Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            جميع المبالغ والعمولات تُحسب وتُسجل في محرك WLT المالي كجهة وحيدة ومصدر وحيد للحقيقة المالية. لا تملك واجهة DSH أي صلاحيات تعديل أو تعديل حركي مالي.
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        {state.kind === 'not_available' || !state.reference ? (
          <StateView
            tone="neutral"
            title="لا توجد بيانات مالية معتمدة"
            description="لم يتم إقرار عمولات تأهيل ميدانية نشطة لهذا الشريك بعد في لوحة التحكم."
          />
        ) : (
          (() => {
            const vm = toFieldCommissionViewModel(state.reference);
            return (
              <View
                style={{
                  backgroundColor: colorRoles.surfaceMuted,
                  padding: spacing[4],
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colorRoles.borderSubtle,
                  gap: spacing[2],
                }}
              >
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text role="bodyStrong" style={{ color: colorRoles.textPrimary }}>
                    مستحقات تأهيل المتجر
                  </Text>
                  <Badge label={vm.statusLabel} tone="action" />
                </View>
                <Text role="titleLg" style={{ color: colorRoles.brandAction, textAlign: 'right', marginVertical: 8 }}>
                  {vm.formattedAmount}
                </Text>
                <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
                  {vm.description}
                </Text>
                <Text role="caption" tone="muted" style={{ textAlign: 'right', marginTop: 4 }}>
                  تاريخ المطابقة: {vm.createdAtFormatted}
                </Text>
              </View>
            );
          })()
        )}
      </ScrollView>
    </View>
  );
}

export default DshFieldFinanceScreen;
