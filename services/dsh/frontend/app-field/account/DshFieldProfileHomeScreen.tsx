// app-field — DshFieldProfileHomeScreen
// Profile menu driven only by the authenticated Workforce profile.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  StateView,
  Text,
  Header,
  spacing,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';
import { useWorkforceProfile } from '../../shared/workforce/use-workforce-profile';
import { ENGAGEMENT_STATUS_LABEL_AR } from '../../shared/workforce';
import { ProviderAvailabilityNoticesPanel } from '../../shared/workforce/ProviderAvailabilityNoticesPanel';
import { ProviderRatingSummaryPanel } from '../../shared/provider-ratings/ProviderRatingSummaryPanel';

type DshFieldProfileHomeScreenProps = {
  readonly onBack: () => void;
  readonly onOpenProfile: () => void;
  readonly onOpenProfileCompletion: () => void;
  readonly onOpenHistory: () => void;
  readonly onOpenFinance: () => void;
  readonly onOpenVerification: () => void;
  readonly onLogout: () => void;
};

export function DshFieldProfileHomeScreen({
  onBack,
  onOpenProfile,
  onOpenProfileCompletion,
  onOpenHistory,
  onOpenFinance,
  onOpenVerification,
  onLogout,
}: DshFieldProfileHomeScreenProps) {
  const workforce = useWorkforceProfile();

  if (workforce.state.kind === 'loading') {
    return <StateView loading title="جارٍ تحميل الملف التشغيلي…" />;
  }

  if (workforce.state.kind === 'not_provisioned') {
    return (
      <StateView
        tone="warning"
        title="ملف الميداني غير منشأ"
        description="تم تسجيل هويتك، لكن ملفك الميداني لم يُنشأ بعد. لا يمكن فتح المهام أو المالية قبل إنشائه."
        actionLabel="إعادة المحاولة"
        onActionPress={() => void workforce.reload()}
      />
    );
  }

  if (workforce.state.kind === 'suspended') {
    return (
      <View style={styles.blockedRoot}>
        <StateView
          tone="danger"
          title="حساب الميداني معلّق"
          description="تم إيقاف ملفك التشغيلي. لا يمكن تنفيذ زيارات أو عمليات مالية حتى إعادة التفعيل."
          actionLabel="تحديث الحالة"
          onActionPress={() => void workforce.reload()}
        />
        <Button label="تسجيل الخروج" tone="secondary" onPress={onLogout} />
      </View>
    );
  }

  if (workforce.state.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل ملف الميداني"
        description={workforce.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void workforce.reload()}
      />
    );
  }

  const me = workforce.state.me;
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

  const operationallyActive = me.engagementStatus === 'active';

  return (
    <View style={styles.root}>
      <Header title="ملفي الميداني" subtitle="بياناتي وحالتي التشغيلية" onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityBlock}>
          <View style={styles.badges}>
            <Badge label="ميداني" tone="action" />
            <Badge
              label={ENGAGEMENT_STATUS_LABEL_AR[me.engagementStatus]}
              tone={operationallyActive ? 'success' : 'warning'}
            />
          </View>
          <Text role="titleMd" style={styles.rtl}>{me.fullNameAr}</Text>
          <Text role="bodySm" tone="muted" style={styles.rtl}>
            رقم الميداني: {me.workforceCode}
          </Text>
          {!operationallyActive ? (
            <Text role="bodySm" tone="warning" style={styles.rtl}>
              الملف غير نشط تشغيليًا؛ الصفحات أدناه للقراءة فقط حتى تفعيل الارتباط.
            </Text>
          ) : null}
        </View>

        <ProviderRatingSummaryPanel kind="field" title="تقييم الشركاء لي" />
        <ProviderAvailabilityNoticesPanel providerLabel="الميداني" />

        <View style={styles.divider} />

        <View style={styles.menu}>
          <MenuRow title="بيانات الميداني" subtitle="الهوية، منطقة التغطية، والتوفر." onPress={onOpenProfile} />
          <MenuRow title="استكمال الملف الشخصي" subtitle="جهة اتصال الطوارئ، اللغة، والموافقة على السياسة." onPress={onOpenProfileCompletion} />
          <MenuRow title="السجل" subtitle="آخر حالة لكل متجر والتقدم المرتبط به." onPress={onOpenHistory} />
          <MenuRow title="المالية" subtitle="المحفظة والعمولات والخصومات وطلبات الصرف." onPress={onOpenFinance} />
          <MenuRow title="مهام التحقق الميداني" subtitle="الزيارات والتصعيدات المخصصة لهذا الحساب." onPress={onOpenVerification} />
        </View>

        <View style={styles.divider} />
        <Button label="تسجيل الخروج" tone="secondary" onPress={onLogout} />
      </ScrollView>
    </View>
  );
}

function MenuRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.menuRow}>
        <View style={styles.menuText}>
          <Text role="bodyStrong">{title}</Text>
          <Text role="bodySm" tone="muted">{subtitle}</Text>
        </View>
        <Icon name="chevron-back" size={20} tone="muted" mirrored />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  blockedRoot: { flex: 1, backgroundColor: colorRoles.surfaceBase, justifyContent: 'center', padding: spacing[4], gap: spacing[3] },
  scroll: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: 96 },
  identityBlock: { gap: spacing[3], paddingVertical: spacing[2] },
  badges: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2] },
  rtl: { textAlign: 'right' },
  divider: { height: 1, backgroundColor: colorRoles.borderSubtle },
  menu: { gap: 0 },
  menuRow: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuText: { flex: 1, alignItems: 'flex-end', gap: 2 },
});
