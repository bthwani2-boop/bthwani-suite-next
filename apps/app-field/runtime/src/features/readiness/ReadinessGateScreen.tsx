import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useBThwaniAppearance } from '@bthwani/ui-kit';
import type { FieldOperationalReadiness } from '@bthwani/dsh/app-field';

const REASON_MESSAGES: Readonly<Record<string, string>> = {
  fieldProfile: "الملف المهني للميداني غير مكتمل.",
  cityCode: "مدينة العمل غير محددة.",
  serviceZoneId: "منطقة الخدمة غير محددة.",
  supervisorActorId: "المشرف المسؤول غير محدد.",
  nationalIdNumber: "بيانات الهوية الوطنية غير مكتملة.",
  identityFrontMediaRef: "صورة الهوية غير مرفقة.",
  identityApproved: "الهوية لم تعتمد بعد.",
  contractMediaRef: "العقد غير مرفق.",
  contractApproved: "العقد لم يعتمد بعد.",
};

interface Props {
  readonly readiness: FieldOperationalReadiness;
  readonly onRefresh: () => void;
}

export function ReadinessGateScreen({ readiness, onRefresh }: Props) {
  const { tokens } = useBThwaniAppearance();

  if (readiness.ready) return null;

  return (
    <View style={[styles.container, { backgroundColor: tokens.appBackground }]}>
      <Text role="titleLg" tone="danger" align="center" style={styles.title}>لا يمكن بدء العمل حالياً</Text>
      <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>الرجاء معالجة الملاحظات التالية قبل المتابعة:</Text>

      <View style={styles.reasonsContainer}>
        {readiness.missing.map(reason => (
          <View key={reason} style={[styles.reasonCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[styles.reasonText, { color: tokens.textPrimary }]}>• {REASON_MESSAGES[reason] || reason}</Text>
          </View>
        ))}
      </View>

      <Button label="تحديث الحالة" onPress={onRefresh} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  reasonsContainer: {
    marginBottom: 32,
  },
  reasonCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 15,
  }
});
