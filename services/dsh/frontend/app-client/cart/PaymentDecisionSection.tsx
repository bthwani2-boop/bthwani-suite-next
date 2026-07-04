import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import {
  Badge,
  Button,
  Icon,
  Surface,
  Text,
  colorRoles,
  radius,
} from "@bthwani/ui-kit";
import type { PaymentDecisionOption, PaymentMethodKey } from "../../shared/finance-wlt-link";

type Props = {
  readonly paymentMethod: PaymentMethodKey;
  readonly options: readonly PaymentDecisionOption[];
  readonly onSelectMethod: (method: PaymentMethodKey) => void;
};

export function PaymentDecisionSection({ paymentMethod, options, onSelectMethod }: Props) {
  return (
    <Surface tone="default" style={styles.cardFrame}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
        <Text role="bodySm" weight="bold" style={styles.cardLabel}>قرار الدفع</Text>
        <Badge label="معاينة دفع" tone="info" />
      </View>
      <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: "right", marginBottom: 6 }}>
        معاينة الدفع غير منفذة ماليًا · WLT يملك منطق الدفع الفعلي
      </Text>

      <View style={{ gap: 8 }}>
        {options.map((opt) => {
          const isSelected = opt.id === paymentMethod;
          return (
            <Pressable
              key={opt.id}
              disabled={opt.disabled}
              onPress={() => onSelectMethod(opt.id)}
              style={[
                styles.paymentCard,
                isSelected && styles.paymentCardActive,
                opt.disabled && { opacity: 0.4 },
              ]}
            >
              <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, flex: 1 }}>
                  <View style={[styles.radioDot, isSelected && styles.radioDotActive]} />
                  <View style={{ alignItems: "flex-end", flex: 1 }}>
                    <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, textAlign: "right" }}>{opt.title}</Text>
                    <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: "right" }}>{opt.description}</Text>
                  </View>
                </View>
                {opt.statusLabel && (
                  <Badge label={opt.statusLabel} tone={opt.statusTone ?? "info"} />
                )}
              </View>

              {opt.amountRows && isSelected && (
                <View style={styles.paymentBreakdown}>
                  {opt.amountRows.map((row) => (
                    <View key={row.label} style={{ flexDirection: "row-reverse", justifyContent: "space-between", marginVertical: 2 }}>
                      <Text role="caption" style={{ color: colorRoles.textSecondary }}>{row.label}</Text>
                      <Text role="caption" weight="bold" style={{ color: row.tone === "brand" ? colorRoles.brandAction : colorRoles.textPrimary }}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {opt.helperText && isSelected && (
                <Text role="caption" style={{ color: colorRoles.danger, textAlign: "right", marginTop: 4 }}>{opt.helperText}</Text>
              )}

              {opt.action && isSelected && (
                <Button
                  label={opt.action.label}
                  tone="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={opt.action.onPress}
                  style={{ alignSelf: "flex-start", marginTop: 6 }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  cardFrame: {
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
  },
  cardLabel: {
    color: colorRoles.textPrimary,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colorRoles.surfaceBase,
    gap: 4,
  },
  paymentCardActive: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.surfaceBase,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: "transparent",
  },
  radioDotActive: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.brandAction,
  },
  paymentBreakdown: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colorRoles.borderSubtle,
  },
});
