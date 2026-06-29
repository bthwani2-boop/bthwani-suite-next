// app-field — DshFieldProfileScreen
// Profile details screen displaying static agent parameters.
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Header, IconButton, spacing, colorRoles, Icon } from '@bthwani/ui-kit';
import { useIdentitySession } from '@bthwani/core-identity';
import { usePartnerAdminController } from '../../shared/partner';

type DshFieldProfileScreenProps = {
  readonly onBack: () => void;
};

export function DshFieldProfileScreen({ onBack }: DshFieldProfileScreenProps) {
  const identity = useIdentitySession();
  const partnerAdmin = usePartnerAdminController(identity.state.kind);

  const username = identity.state.kind === 'authenticated' ? identity.state.identity.subject : 'ميداني';
  const roleName = identity.state.kind === 'authenticated' ? (identity.state.identity.roles[0] === 'field' ? 'موظف ميداني' : identity.state.identity.roles.join(', ')) : 'عضو فريق الميدان';
  const activeCount = partnerAdmin.listState.kind === 'success' 
    ? partnerAdmin.listState.partners.filter(p => p.activationStatus !== 'ops_approved').length.toString() 
    : '0';

  const items = [
    { label: 'الاسم / المعرف', value: username },
    { label: 'الدور العملياتي', value: roleName },
    { label: 'الملفات النشطة', value: activeCount, color: colorRoles.brandAction },
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

export default DshFieldProfileScreen;
