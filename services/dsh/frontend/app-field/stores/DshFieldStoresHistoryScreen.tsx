// app-field — DshFieldStoresHistoryScreen
// Onboarding history list screen.
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Badge, Text, Header, IconButton, spacing, colorRoles, Icon, radius } from '@bthwani/ui-kit';
import { useFieldPartnerDraftsController } from '../../shared/field-onboarding';

type DshFieldStoresHistoryScreenProps = {
  readonly onBack: () => void;
};

export function DshFieldStoresHistoryScreen({ onBack }: DshFieldStoresHistoryScreenProps) {
  // Scoped to the calling field actor's own submissions — the operator-wide
  // partner list (usePartnerAdminController → GET /dsh/operator/partners) is
  // 403 Forbidden for a field-role session (verified live).
  const controller = useFieldPartnerDraftsController();

  const partners = controller.listState.kind === 'success' ? controller.listState.partners : [];

  const getStatusPresentation = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'مسودة', tone: 'neutral' as const };
      case 'submitted':
        return { label: 'قيد المراجعة', tone: 'warning' as const };
      case 'rejected':
        return { label: 'مرفوض', tone: 'danger' as const };
      case 'ops_approved':
        return { label: 'معتمد', tone: 'success' as const };
      case 'client_visible':
        return { label: 'نشط', tone: 'success' as const };
      default:
        return { label: status, tone: 'neutral' as const };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceMuted }}>
      <Header
        title="سجل المتاجر"
        subtitle="آخر حالة لكل متجر مرتبط بالميدان"
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing[4] }}>
          {partners.map((partner) => {
            const statusInfo = getStatusPresentation(partner.activationStatus);
            return (
              <View
                key={partner.id}
                style={{
                  backgroundColor: colorRoles.surfaceBase,
                  borderRadius: radius.lg,
                  padding: spacing[4],
                  borderWidth: 1,
                  borderColor: colorRoles.borderSubtle,
                  shadowColor: colorRoles.shadowBase,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[3] }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: radius.round, backgroundColor: colorRoles.surfaceMuted,
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon name="storefront" size={22} color={colorRoles.textSecondary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                      <Text role="bodyStrong" style={{ textAlign: 'right' }}>
                        {partner.displayName}
                      </Text>
                      <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
                        {partner.category}
                      </Text>
                    </View>
                  </View>
                  <Badge label={statusInfo.label} tone={statusInfo.tone} />
                </View>

                <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[3] }} />

                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing[2] }}>
                  <Icon name="calendar-outline" size={14} color={colorRoles.textMuted} />
                  <Text role="caption" tone="muted">
                    {new Date(partner.updatedAt).toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// export default DshFieldStoresHistoryScreen; // Unused default export
