import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import {
  Badge,
  Button,
  Card,
  Header,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  spacing,
  lightThemeColors,
  colorRoles,
} from '@bthwani/ui-kit';
import { useClientTrackingController } from '../../shared/dispatch/use-dispatch-controller';
import { DELIVERY_STATUS_LABELS } from '../../shared/dispatch/dispatch.types';

type Props = {
  readonly orderId: string;
  readonly onBack?: () => void;
};

export function OrderTrackingScreen({ orderId, onBack }: Props) {
  const { state, reload } = useClientTrackingController(orderId);

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.headerTitle}>جارٍ تحميل حالة الطلب...</Text>
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.headerTitle, { color: colorRoles.danger }]}>تعذر جلب التتبع: {state.message}</Text>
        <Button label="إعادة المحاولة" onPress={reload} style={{ marginTop: 16 }} />
        {onBack && <Button label="العودة" tone="secondary" onPress={onBack} style={{ marginTop: 8 }} />}
      </View>
    );
  }

  const { assignment } = state;
  const statusLabel = DELIVERY_STATUS_LABELS[assignment.delivery.status as keyof typeof DELIVERY_STATUS_LABELS] ?? 'غير معروف';

  return (
    <ScrollScreen>
      <View style={styles.container}>
        {/* Header Block */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>طلب عونك</Text>
          <View style={styles.greenBanner}>
            <Text style={styles.greenBannerText}>حالة الطلب: {statusLabel}</Text>
          </View>
        </View>

        {/* Order Info Card */}
        <Card style={styles.infoCard}>
          <Text role="titleMd" style={styles.cardTitle}>تفاصيل الطلب الفوري</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>{assignment.orderId}</Text>
            <Text style={styles.detailLabel}>رقم الطلب</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>{assignment.captainId}</Text>
            <Text style={styles.detailLabel}>المندوب</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>غير متوفر</Text>
            <Text style={styles.detailLabel}>الجوال</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>دراجة نارية</Text>
            <Text style={styles.detailLabel}>وسيلة النقل</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>{new Date(assignment.createdAt).toLocaleTimeString('ar-SA')}</Text>
            <Text style={styles.detailLabel}>وقت الإسناد</Text>
          </View>
        </Card>

        {/* Active tracking notice */}
        <Card style={styles.noticeCard}>
          <Text role="body" style={styles.noticeText}>
            المندوب في طريقه إليك الآن. يمكنك التواصل معه مباشرة عبر تطبيق عونك.
          </Text>
        </Card>

        {onBack && (
          <Button
            label="العودة للطلبات"
            tone="secondary"
            onPress={onBack}
            style={{ marginTop: 8 }}
          />
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
    direction: "rtl",
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.surfaceBase,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colorRoles.brandStructure,
  },
  greenBanner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
  },
  greenBannerText: {
    color: colorRoles.brandStructure,
    fontWeight: "bold",
    fontSize: 13,
  },
  infoCard: {
    padding: 16,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 16,
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.surfaceBase,
  },
  detailLabel: {
    fontSize: 14,
    color: colorRoles.brandStructure,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: colorRoles.brandStructure,
    fontWeight: "bold",
  },
  noticeCard: {
    padding: 14,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
  },
  noticeText: {
    fontSize: 13,
    color: colorRoles.brandStructure,
    textAlign: "right",
    lineHeight: 20,
  },
});

// export default OrderTrackingScreen; // Unused default export