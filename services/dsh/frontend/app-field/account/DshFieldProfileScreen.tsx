// app-field — DshFieldProfileScreen
// Profile details sourced exclusively from Workforce.
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { KeyValueList, StateView, Header, spacing, colorRoles } from '@bthwani/ui-kit';
import { useWorkforceProfile } from '../../shared/workforce/use-workforce-profile';
import { ENGAGEMENT_STATUS_LABEL_AR } from '../../shared/workforce';

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
        description="لا يوجد ملف ميداني مرتبط بهويتك الحالية."
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
        description="هذا الحساب غير مهيأ كحساب ميداني."
        actionLabel="رجوع"
        onActionPress={onBack}
      />
    );
  }

  const items = [
    { label: 'الاسم الكامل', value: me.fullNameAr },
    { label: 'رقم الميداني', value: me.workforceCode },
    { label: 'التوفر', value: 'يُدار من بلاغات التوفر وعدم التوفر' },
    { label: 'حالة الارتباط', value: ENGAGEMENT_STATUS_LABEL_AR[me.engagementStatus] },
  ];

  return (
    <View style={styles.root}>
      <Header title="بيانات الميداني" subtitle="بياناتك التشغيلية الحالية" onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <KeyValueList items={items} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  scroll: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: 96 },
});
