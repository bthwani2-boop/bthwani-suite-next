import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ScrollScreen,
  Text,
  spacing,
  colorRoles,
} from '@bthwani/ui-kit';

export function DshCaptainOrdersScreen() {
  return (
    <ScrollScreen>
      <View style={styles.container}>
        {/* Header Block */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>تفاصيل المهمة المسندة</Text>
          <Badge label="جاري التوصيل" tone="info" />
        </View>

        {/* Task Details Card */}
        <Card style={styles.infoCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>طلب مرن (عونك)</Text>
            <Text style={styles.detailLabel}>نوع الطلب</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>محمد أحمد</Text>
            <Text style={styles.detailLabel}>العميل</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>771122334</Text>
            <Text style={styles.detailLabel}>جوال العميل</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>بيت بوس - شارع الخمسين</Text>
            <Text style={styles.detailLabel}>موقع التوصيل</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailValue}>3.2 كم</Text>
            <Text style={styles.detailLabel}>المسافة المقدرة</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailValue, { color: colorRoles.brandAction }]}>4,500 ر.ي</Text>
            <Text style={styles.detailLabel}>القيمة الإجمالية للطلب</Text>
          </View>
        </Card>

        {/* Action Button */}
        <Button
          label="تأكيد تسليم الطلب"
          tone="success"
          onPress={() => {}}
          style={{ height: 48, borderRadius: 8 }}
        />
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
    fontSize: 18,
    fontWeight: "bold",
    color: colorRoles.brandStructure,
  },
  infoCard: {
    padding: 16,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
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
});

export default DshCaptainOrdersScreen;
