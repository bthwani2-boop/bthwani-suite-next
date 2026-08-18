import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, useBThwaniAppearance } from "@bthwani/ui-kit";
import type { CaptainOperationalReadiness } from "@bthwani/dsh/app-captain";

const REASON_MESSAGES: Readonly<Record<string, string>> = {
  IDENTITY_SUSPENDED: "تم تعليق الهوية الرقمية الخاصة بك. يرجى مراجعة الإدارة.",
  PROFILE_INCOMPLETE: "الملف المهني غير مكتمل. يرجى استكمال المتطلبات.",
  DOCUMENTS_EXPIRED: "هناك مستندات تشغيلية منتهية الصلاحية.",
  ENGAGEMENT_INACTIVE: "حالة الارتباط المهني لا تسمح ببدء العمل.",
  DISPATCH_ACCREDITATION_REQUIRED: "اعتماد التشغيل للتوصيل غير مكتمل.",
  DISPATCH_SUSPENDED: "حالة التشغيل للتوصيل موقوفة حالياً.",
  DISPATCH_PROFILE_REQUIRED: "ملف التشغيل للتوصيل غير مكتمل.",
  CAPTAIN_FINANCIAL_ELIGIBILITY_REQUIRED: "الأهلية المالية للكابتن غير مكتملة.",
};

interface Props {
  readonly readiness: CaptainOperationalReadiness;
  readonly onRefresh: () => void;
}

export function ReadinessGateScreen({ readiness, onRefresh }: Props) {
  const { tokens } = useBThwaniAppearance();

  if (readiness.ready) return null;

  return (
    <View style={[styles.container, { backgroundColor: tokens.appBackground }]}>
      <Text role="titleLg" tone="danger" align="center" style={styles.title}>
        لا يمكن بدء العمل حالياً
      </Text>

      <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
        الرجاء معالجة المتطلبات التالية قبل المتابعة:
      </Text>

      <View style={styles.reasonsContainer}>
        {readiness.missing.map((reason) => (
          <View
            key={reason}
            style={[
              styles.reasonCard,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            <Text style={[styles.reasonText, { color: tokens.textPrimary }]}>
              • {REASON_MESSAGES[reason] ?? reason}
            </Text>
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
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
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
  },
});
