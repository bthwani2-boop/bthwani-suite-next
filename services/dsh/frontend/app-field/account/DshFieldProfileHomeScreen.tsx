// app-field — DshFieldProfileHomeScreen
// Profile menu screen that displays the agent's identity, active tasks status, and sub-screen navigation links.
import React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import {
  Badge,
  Button,
  Text,
  Header,
  spacing,
  radius,
  borders,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';
import { useWorkforceMeOrNull } from '../../shared/workforce/use-workforce-profile';

type DshFieldProfileHomeScreenProps = {
  readonly onBack: () => void;
  readonly onOpenProfile: () => void;
  readonly onOpenHistory: () => void;
  readonly onOpenFinance: () => void;
  readonly onOpenVerification: () => void;
  readonly onLogout: () => void;
};

export function DshFieldProfileHomeScreen({
  onBack,
  onOpenProfile,
  onOpenHistory,
  onOpenFinance,
  onOpenVerification,
  onLogout,
}: DshFieldProfileHomeScreenProps) {
  const me = useWorkforceMeOrNull();
  const username = me ? me.fullNameAr : 'ميداني';
  const roleName = me ? (me.providerKind === 'captain' ? 'كابتن' : 'موظف ميداني') : 'عضو فريق الميدان';

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <View style={{ paddingHorizontal: spacing[4] }}>
        <Header
          title="ملف الميداني"
          subtitle="صفحة الهوية والملف التشغيلي للميدان"
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing[3], paddingVertical: spacing[2] }}>
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2] }}>
            <Badge label="DSH" tone="success" />
            <Badge label={roleName} tone="action" />
          </View>
          <Text role="titleMd" style={{ textAlign: 'right' }}>
            {username}
          </Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            الملف التشغيلي يبقى عند الميداني حتى اكتمال الملف والمراجعة والمالية المرتبطة به.
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        <View style={{ gap: 0 }}>
          <Pressable onPress={onOpenProfile}>
            <View style={{ paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colorRoles.borderSubtle }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                  <Text role="bodyStrong">بيانات الميداني</Text>
                  <Text role="bodySm" tone="muted">الهوية، التغطية، والوردية الحالية.</Text>
                </View>
                <Icon name="chevron-back" size={20} tone="muted" mirrored />
              </View>
            </View>
          </Pressable>

          <Pressable onPress={onOpenHistory}>
            <View style={{ paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colorRoles.borderSubtle }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                  <Text role="bodyStrong">السجل</Text>
                  <Text role="bodySm" tone="muted">آخر حالة لكل متجر والتقدم المرتبط به.</Text>
                </View>
                <Icon name="chevron-back" size={20} tone="muted" mirrored />
              </View>
            </View>
          </Pressable>

          <Pressable onPress={onOpenFinance}>
            <View style={{ paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colorRoles.borderSubtle }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                  <Text role="bodyStrong">المالية</Text>
                  <Text role="bodySm" tone="muted">المستحقات والملخص المالي بعد اكتمال الاعتماد.</Text>
                </View>
                <Icon name="chevron-back" size={20} tone="muted" mirrored />
              </View>
            </View>
          </Pressable>

          <Pressable onPress={onOpenVerification}>
            <View style={{ paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colorRoles.borderSubtle }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                  <Text role="bodyStrong">مهام التحقق الميداني</Text>
                  <Text role="bodySm" tone="muted">افتح الزيارة المحددة ثم ارفع نتيجتها بعد الإكمال.</Text>
                </View>
                <Icon name="chevron-back" size={20} tone="muted" mirrored />
              </View>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        <Button label="تسجيل الخروج" tone="secondary" onPress={onLogout} />
      </ScrollView>
    </View>
  );
}

// export default DshFieldProfileHomeScreen; // Unused default export
