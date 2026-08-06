import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useBThwaniAppearance } from '@bthwani/ui-kit';

export type BlockerReason = 
  | "IDENTITY_SUSPENDED"
  | "PROFILE_INCOMPLETE"
  | "DOCUMENTS_EXPIRED"
  | "EMPLOYMENT_TERMINATED"
  | "NO_ACTIVE_ASSIGNMENT"
  | "SHIFT_INACTIVE"
  | "OUTSIDE_ACTIVE_AREA"
  | "FINANCIAL_ELIGIBILITY_BLOCKED"
  | "ELIGIBILITY_UNAVAILABLE";

export interface ReadinessGate {
  actorId: string;
  status: "ALLOWED" | "BLOCKED";
  blockerReasons: BlockerReason[];
}

const REASON_MESSAGES: Record<BlockerReason, string> = {
  IDENTITY_SUSPENDED: "تم تعليق الهوية الرقمية الخاصة بك. يرجى مراجعة الإدارة.",
  PROFILE_INCOMPLETE: "الملف الشخصي غير مكتمل. يرجى تحديث بياناتك.",
  DOCUMENTS_EXPIRED: "هناك مستندات منتهية الصلاحية (مثل رخصة القيادة).",
  EMPLOYMENT_TERMINATED: "حالة التوظيف معلقة أو منهية.",
  NO_ACTIVE_ASSIGNMENT: "لا يوجد تكليف نشط حالياً. يرجى انتظار تعيين منطقة.",
  SHIFT_INACTIVE: "لا توجد مناوبة فعالة حالياً.",
  OUTSIDE_ACTIVE_AREA: "أنت خارج منطقة الخدمة المحددة.",
  FINANCIAL_ELIGIBILITY_BLOCKED: "تم إيقاف الأهلية المالية. يرجى تسوية المستحقات أو التواصل مع المالية.",
  ELIGIBILITY_UNAVAILABLE: "تعذر التحقق من الأهلية التشغيلية والمالية. يرجى المحاولة لاحقاً.",
};

interface Props {
  readiness: ReadinessGate;
  onRefresh: () => void;
}

export function ReadinessGateScreen({ readiness, onRefresh }: Props) {
  const { tokens } = useBThwaniAppearance();
  
  if (readiness.status === 'ALLOWED') {
    return null; // Should not render if allowed
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.appBackground }]}>
      <Text style={[styles.title, { color: tokens.textDanger }]}>لا يمكن بدء العمل حالياً</Text>
      <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>الرجاء معالجة الملاحظات التالية قبل المتابعة:</Text>
      
      <View style={styles.reasonsContainer}>
        {readiness.blockerReasons.map(reason => (
          <View key={reason} style={[styles.reasonCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
            <Text style={[styles.reasonText, { color: tokens.textPrimary }]}>• {REASON_MESSAGES[reason] || reason}</Text>
          </View>
        ))}
      </View>

      <Button title="تحديث الحالة" onPress={onRefresh} />
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
