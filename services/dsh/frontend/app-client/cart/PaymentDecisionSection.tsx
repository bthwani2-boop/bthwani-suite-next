import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Surface,
  Text,
  colorRoles,
  radius,
} from "@bthwani/ui-kit";
import type {
  PaymentDecisionOption,
  PaymentMethodKey,
} from "../../shared/finance-wlt-link";

type Props = {
  readonly paymentMethod: PaymentMethodKey;
  readonly options: readonly PaymentDecisionOption[];
  readonly onSelectMethod: (method: PaymentMethodKey) => void;
};

export function PaymentDecisionSection({
  paymentMethod,
  options,
  onSelectMethod,
}: Props) {
  return (
    <Surface tone="default" style={styles.cardFrame}>
      <View style={styles.headerRow}>
        <Text role="bodySm" weight="bold" style={styles.cardLabel}>
          وسيلة الدفع
        </Text>
        <Badge label="WLT" tone="info" />
      </View>
      <Text role="caption" style={styles.description}>
        لا تُحسب أرصدة أو مبالغ داخل الواجهة. يعتمد checkout النتيجة المالية
        ويربطها بمرجع WLT.
      </Text>

      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = option.id === paymentMethod;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{
                selected: isSelected,
                disabled: option.disabled === true,
              }}
              disabled={option.disabled}
              onPress={() => onSelectMethod(option.id)}
              style={[
                styles.paymentCard,
                isSelected && styles.paymentCardActive,
                option.disabled && styles.paymentCardDisabled,
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionIdentity}>
                  <View
                    style={[styles.radioDot, isSelected && styles.radioDotActive]}
                  />
                  <View style={styles.optionText}>
                    <Text role="bodyStrong" style={styles.optionTitle}>
                      {option.title}
                    </Text>
                    <Text role="caption" style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                </View>
                {option.statusLabel ? (
                  <Badge
                    label={option.statusLabel}
                    tone={option.statusTone ?? "info"}
                  />
                ) : null}
              </View>

              {option.helperText ? (
                <Text role="caption" style={styles.helperText}>
                  {option.helperText}
                </Text>
              ) : null}

              {option.action && isSelected ? (
                <Button
                  label={option.action.label}
                  tone="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={option.action.onPress}
                  style={styles.actionButton}
                />
              ) : null}
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
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    color: colorRoles.textPrimary,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  description: {
    color: colorRoles.textSecondary,
    textAlign: "right",
    lineHeight: 19,
  },
  options: { gap: 8 },
  paymentCard: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colorRoles.surfaceBase,
    gap: 6,
  },
  paymentCardActive: {
    borderColor: colorRoles.brandAction,
  },
  paymentCardDisabled: { opacity: 0.48 },
  optionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  optionIdentity: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  optionText: { alignItems: "flex-end", flex: 1 },
  optionTitle: { color: colorRoles.textPrimary, textAlign: "right" },
  optionDescription: {
    color: colorRoles.textSecondary,
    textAlign: "right",
    lineHeight: 18,
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
  helperText: {
    color: colorRoles.textSecondary,
    textAlign: "right",
    lineHeight: 18,
  },
  actionButton: { alignSelf: "flex-start", marginTop: 4 },
});
