// app-field — DshFieldStoresHistoryScreen
// Onboarding history list screen.
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Badge, Text, Header, IconButton, spacing, colorRoles, Icon } from '@bthwani/ui-kit';
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
      default:
        return { label: status, tone: 'neutral' as const };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header
        title="سجل المتاجر"
        subtitle="آخر حالة لكل متجر مرتبط بالميدان"
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing[3] }}>
          {partners.map((partner, index) => {
            const statusInfo = getStatusPresentation(partner.activationStatus);
            return (
              <View key={partner.id}>
                {index > 0 && <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[2] }} />}
                <View style={{ gap: spacing[2], paddingVertical: spacing[2] }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] }}>
                    <View style={{ flex: 1, gap: 3, alignItems: 'flex-end' }}>
                      <Text role="bodyStrong" style={{ textAlign: 'right' }}>
                        {partner.displayName}
                      </Text>
                      <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
                        {partner.category}
                      </Text>
                      <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
                        {`${statusInfo.label} · ${new Date(partner.updatedAt).toLocaleDateString('ar-YE')}`}
                      </Text>
                    </View>
                    <Badge label={statusInfo.label} tone={statusInfo.tone} />
                  </View>
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