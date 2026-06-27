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
} from "@bthwani/ui-kit";

type Props = {
  readonly orderId: string;
  readonly onBack?: () => void;
};

export function OrderTrackingScreen({ orderId, onBack }: Props) {
  return (
    <ScrollScreen>
      <View style={styles.container}>
        {/* Header Block */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>طلب عونك</Text>
          <View style={styles.greenBanner}>
            <Text style={styles.greenBannerText}>حالة الطلب: قيد التوصيل</Text>
          </View>
        </View>

        {/* Order Info Card */}
        <Card style={styles.infoCard}>
          <Text role="titleMd" style={styles.cardTitle}>تفاصيل الطلب الفوري</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>ord-17825220038491</Text>
            <Text style={styles.detailLabel}>رقم الطلب</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>عامر صالح</Text>
            <Text style={styles.detailLabel}>المندوب</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>777888999</Text>
            <Text style={styles.detailLabel}>الجوال</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>دراجة نارية</Text>
            <Text style={styles.detailLabel}>وسيلة النقل</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>11:45 ص</Text>
            <Text style={styles.detailLabel}>وقت الإسناد</Text>
          </View>
        </Card>

        {/* Active tracking notice */}
        <Card style={styles.noticeCard}>
          <Text role="body" style={styles.noticeText}>
            المندوب في طريقه إليك الآن. يمكنك التواصل معه مباشرة عبر رقم الهاتف الموضح أعلاه.
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
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
  },
  greenBanner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  greenBannerText: {
    color: "#15803D",
    fontWeight: "bold",
    fontSize: 13,
  },
  infoCard: {
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1E293B",
    textAlign: "right",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "bold",
  },
  noticeCard: {
    padding: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  noticeText: {
    fontSize: 13,
    color: "#1D4ED8",
    textAlign: "right",
    lineHeight: 20,
  },
});

export default OrderTrackingScreen;
