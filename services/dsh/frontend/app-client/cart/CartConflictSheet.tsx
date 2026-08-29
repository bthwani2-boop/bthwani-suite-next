import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Surface, Text, colorRoles, radius, spacing } from "@bthwani/ui-kit";

export type CartConflictSheetProps = {
  readonly onKeepServer: () => void;
  readonly onReviewOffline: () => void;
};

export const CartConflictSheet: React.FC<CartConflictSheetProps> = ({
  onKeepServer,
  onReviewOffline,
}) => {
  return (
    <View style={styles.backdrop} accessibilityViewIsModal accessibilityRole="alert">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="إغلاق تنبيه تعارض السلة"
        onPress={onReviewOffline}
        style={StyleSheet.absoluteFill}
      />
      <Surface tone="default" style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.warningBadge}>
            <Text role="bodyStrong" style={styles.warningMark}>!</Text>
          </View>
          <Text role="titleMd" style={styles.title}>تضارب في السلة</Text>
        </View>
        <Text role="body" style={styles.description}>
          تم تعديل سلتك من جهاز آخر أو أثناء انقطاع الاتصال. نمنع التعديلات المتضاربة حتى لا يتم تأكيد طلب غير صحيح.
        </Text>
        <Button
          label="مزامنة مع الخادم وتجاهل تعديلاتي"
          tone="primary"
          onPress={onKeepServer}
        />
        <Button
          label="تحديث سلة الخادم وإبقاء تعديلي معلّقًا"
          tone="secondary"
          onPress={onReviewOffline}
        />
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    alignItems: "center",
    justifyContent: "flex-end",
    padding: spacing[4],
    backgroundColor: colorRoles.mediaScrimStrong,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    gap: spacing[3],
    padding: spacing[5],
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  warningBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.warning,
  },
  warningMark: {
    color: colorRoles.surfaceBase,
    fontSize: 18,
    textAlign: "center",
  },
  title: {
    flex: 1,
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  description: {
    color: colorRoles.textSecondary,
    lineHeight: 22,
    textAlign: "right",
  },
});
