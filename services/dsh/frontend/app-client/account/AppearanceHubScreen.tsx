import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Badge,
  Card,
  ScrollScreen,
  StateView,
  Text,
  TopBar,
  spacing,
  colorRoles,
} from "@bthwani/ui-kit";
import type { ClientAppearanceMode } from "../../../../../apps/app-client/runtime/src/preferences/client-appearance";

export type AppearanceHubScreenProps = {
  appearanceMode: ClientAppearanceMode;
  resolvedTheme: "light" | "dark";
  onAppearanceModeChange: (mode: ClientAppearanceMode) => Promise<void>;
  onBack?: () => void;
};

type AppearanceOption = {
  readonly mode: ClientAppearanceMode;
  readonly title: string;
  readonly description: string;
  readonly modeLabel: string;
};

const OPTIONS: readonly AppearanceOption[] = [
  {
    mode: "system",
    title: "اتباع مظهر الجهاز",
    description: "يتحوّل التطبيق تلقائيًا بين الفاتح والداكن عند تغيير إعداد الجهاز.",
    modeLabel: "System",
  },
  {
    mode: "lightPremium",
    title: "المظهر الفاتح",
    description: "واجهة فاتحة ثابتة مناسبة للاستخدام النهاري والقراءة تحت الإضاءة القوية.",
    modeLabel: "Light",
  },
  {
    mode: "darkGlass",
    title: "المظهر الداكن",
    description: "واجهة داكنة ثابتة لتقليل السطوع في البيئات المظلمة.",
    modeLabel: "Dark",
  },
];

function AppearanceOptionRow({
  option,
  selected,
  disabled,
  onPress,
}: {
  option: AppearanceOption;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${option.title}، ${option.description}`}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Card style={[styles.optionCard, selected && styles.optionCardSelected]}>
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text role="titleSm" style={styles.optionTitle}>{option.title}</Text>
            <Text role="caption" tone="muted" style={styles.optionDesc}>{option.description}</Text>
          </View>
          <View style={styles.optionBadges}>
            <Badge label={option.modeLabel} tone="info" />
            {selected ? <Badge label="محدد" tone="success" /> : null}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export function AppearanceHubScreen({
  appearanceMode,
  resolvedTheme,
  onAppearanceModeChange,
  onBack,
}: AppearanceHubScreenProps) {
  const [savingMode, setSavingMode] = React.useState<ClientAppearanceMode | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectMode = React.useCallback(async (mode: ClientAppearanceMode) => {
    if (savingMode !== null || mode === appearanceMode) return;
    setSavingMode(mode);
    setError(null);
    try {
      await onAppearanceModeChange(mode);
    } catch {
      setError("تعذر حفظ المظهر على الجهاز. لم يتم عرض نجاح وهمي.");
    } finally {
      setSavingMode(null);
    }
  }, [appearanceMode, onAppearanceModeChange, savingMode]);

  return (
    <View style={styles.root}>
      <TopBar
        title="المظهر"
        subtitle={`المظهر الفعلي الآن: ${resolvedTheme === "dark" ? "داكن" : "فاتح"}`}
        {...(onBack ? { onBack } : {})}
      />
      <ScrollScreen>
        <View style={styles.container} accessibilityRole="radiogroup">
          {OPTIONS.map((option) => (
            <AppearanceOptionRow
              key={option.mode}
              option={option}
              selected={appearanceMode === option.mode}
              disabled={savingMode !== null}
              onPress={() => void selectMode(option.mode)}
            />
          ))}
          {savingMode !== null ? <StateView loading title="جارٍ حفظ المظهر…" /> : null}
          {error ? <StateView tone="danger" title="تعذر حفظ المظهر" description={error} /> : null}
        </View>
      </ScrollScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  container: {
    padding: spacing[4],
    gap: spacing[3],
  },
  optionCard: {
    padding: spacing[4],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
  },
  optionCardSelected: {
    borderColor: colorRoles.brandAction,
  },
  optionRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  optionInfo: {
    flex: 1,
    gap: spacing[1],
  },
  optionTitle: {
    fontWeight: "700",
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  optionDesc: {
    textAlign: "right",
    lineHeight: 20,
  },
  optionBadges: {
    alignItems: "flex-end",
    gap: spacing[2],
  },
});
