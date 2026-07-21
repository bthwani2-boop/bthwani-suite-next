// app-field — DshFieldProfileScreen
// Profile details sourced exclusively from Workforce.
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Button, StateView, Text, Header, spacing, colorRoles } from '@bthwani/ui-kit';
import { useWorkforceProfile } from '../../shared/workforce/use-workforce-profile';
import { ENGAGEMENT_STATUS_LABEL_AR } from '../../shared/workforce/workforce.types';

type DshFieldProfileScreenProps = {
  readonly onBack: () => void;
};

export function DshFieldProfileScreen({ onBack }: DshFieldProfileScreenProps) {
  const workforce = useWorkforceProfile();
  const { state } = workforce;

  if (state.kind === 'loading') {
    return <StateView loading title="جارٍ تحميل بيانات الحساب…" />;
  }

  if (state.kind === 'not_provisioned') {
    return (
      <StateView
        tone="warning"
        title="الملف غير منشأ"
        description="لا يوجد ملف Workforce مرتبط بالهوية الحالية."
        actionLabel="إعادة المحاولة"
        onActionPress={() => void workforce.reload()}
      />
    );
  }

  if (state.kind === 'suspended') {
    return (
      <StateView
        tone="danger"
        title="الملف معلّق"
        description="تم تعليق الملف التشغيلي، ولا يجوز عرضه كحساب جاهز."
        actionLabel="تحديث الحالة"
        onActionPress={() => void workforce.reload()}
      />
    );
  }

  if (state.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل بيانات الحساب التشغيلية"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void workforce.reload()}
      />
    );
  }

  const me = state.me;
  if (me.workforceKind !== 'field') {
    return (
      <StateView
        tone="danger"
        title="نوع الحساب غير متوافق"
        description="ملف Workforce الحالي ليس ملف موظف ميداني."
        actionLabel="رجوع"
        onActionPress={onBack}
      />
    );
  }

  const items: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'الاسم الكامل', value: me.fullNameAr },
    { label: 'رقم مقدم الخدمة', value: me.workforceCode },
    { label: 'نوع Workforce', value: 'موظف ميداني' },
    { label: 'منطقة الخدمة', value: me.fieldProfile?.serviceZoneId || 'غير محدد' },
    { label: 'الوردية', value: me.fieldProfile?.shiftCode || 'غير محدد' },
    { label: 'المشرف', value: me.fieldProfile?.supervisorActorId || 'غير محدد' },
    { label: 'حالة الارتباط', value: ENGAGEMENT_STATUS_LABEL_AR[me.engagementStatus] },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.topActions}>
        <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} />
      </View>
      <Header title="بيانات الميداني" subtitle="بيانات تشغيلية حية من Workforce" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.items}>
          {items.map((item) => (
            <View key={item.label} style={styles.row}>
              <Text role="bodyStrong" style={styles.rtl}>{item.label}</Text>
              <Text role="body" style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  topActions: { paddingHorizontal: spacing[4], paddingTop: spacing[2], alignItems: 'flex-start' as const },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: 96 },
  items: { gap: spacing[2], width: '100%' as const },
  row: {
    flexDirection: 'row-reverse' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
    gap: spacing[3],
  },
  rtl: { textAlign: 'right' as const },
  value: { textAlign: 'left' as const, flexShrink: 1 },
};
