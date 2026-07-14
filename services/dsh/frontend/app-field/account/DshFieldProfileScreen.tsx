// app-field — DshFieldProfileScreen
// Profile details screen displaying static agent parameters.
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Button, Text, Header, IconButton, spacing, colorRoles, Icon } from '@bthwani/ui-kit';
import { useIdentitySession } from '@bthwani/core-identity';
import { useFieldPartnerDraftsController } from '../../shared/field-onboarding';

import { useWorkforceProfile } from '../../shared/workforce/use-workforce-profile';
import { ENGAGEMENT_STATUS_LABEL_AR } from '../../shared/workforce/workforce.types';

type DshFieldProfileScreenProps = {
  readonly onBack: () => void;
};

export function DshFieldProfileScreen({ onBack }: DshFieldProfileScreenProps) {
  const profileContext = useWorkforceProfile();
  const { state } = profileContext;

  if (state.kind === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase, justifyContent: 'center', alignItems: 'center' }}>
        <Text role="body" tone="muted">جارٍ تحميل بيانات الحساب…</Text>
      </View>
    );
  }

  if (state.kind !== 'ready') {
    return (
      <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase, justifyContent: 'center', alignItems: 'center', gap: spacing[3] }}>
        <Text role="body" tone="danger">تعذر تحميل بيانات الحساب العملياتية</Text>
        <Button label="إعادة المحاولة" onPress={() => void profileContext.reload()} />
      </View>
    );
  }

  const me = state.me;

  const items: Array<{ label: string; value: string; color?: string }> = [
    { label: 'الاسم الكامل', value: me.fullNameAr },
    { label: 'رقم مقدم الخدمة', value: me.workforceCode },
    { label: 'منطقة الخدمة', value: me.fieldProfile?.serviceZoneId || 'غير محدد' },
    { label: 'الوردية', value: me.fieldProfile?.shiftCode || 'غير محدد' },
    { label: 'المشرف', value: me.fieldProfile?.supervisorActorId || 'بدون مشرف' },
    { label: 'حالة الارتباط', value: ENGAGEMENT_STATUS_LABEL_AR[me.engagementStatus] },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header
        title="بيانات الميداني"
        subtitle="بيانات عملية يحتاجها الحساب فقط"
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing[2], width: '100%' }}>
          {items.map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                paddingVertical: spacing[3],
                borderBottomWidth: 1,
                borderBottomColor: colorRoles.borderSubtle,
              }}
            >
              <Text role="bodyStrong" style={{ textAlign: 'right' }}>
                {item.label}
              </Text>
              <Text
                role="body"
                style={{ textAlign: 'left', ...(item.color ? { color: item.color } : {}) }}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// export default DshFieldProfileScreen; // Unused default export