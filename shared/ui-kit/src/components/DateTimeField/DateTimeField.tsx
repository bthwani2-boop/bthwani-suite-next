import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../Text";
import { Icon } from "../Icon/Icon";
import { Sheet } from "../Sheet";
import { Button } from "../Button";
import { Chip } from "../Chip";
import { colorRoles } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";

export type DateTimeFieldProps = {
  label?: string;
  /** Current value, or null/undefined when nothing is picked yet. */
  value?: Date | null;
  onChange: (value: Date) => void;
  placeholder?: string;
  error?: string;
  /** Presets shown as day-offset chips inside the picker sheet. Defaults to اليوم/غدًا/بعد يومين. */
  dayPresets?: readonly { label: string; offsetDays: number }[];
};

const DEFAULT_PRESETS: readonly { label: string; offsetDays: number }[] = [
  { label: "اليوم", offsetDays: 0 },
  { label: "غدًا", offsetDays: 1 },
  { label: "بعد يومين", offsetDays: 2 },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatFriendly(date: Date): string {
  const datePart = date.toLocaleDateString("ar-YE", { day: "numeric", month: "long" });
  const timePart = date.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} — ${timePart}`;
}

/**
 * A real date/time picker: no field ever asks the user to type an ISO string.
 * Opens a bottom sheet with day-offset presets and simple hour/minute steppers,
 * and always outputs a concrete Date.
 */
export function DateTimeField({ label, value, onChange, placeholder = "اختر الوقت", error, dayPresets = DEFAULT_PRESETS }: DateTimeFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Date>(value ?? new Date());

  const openSheet = () => {
    setDraft(value ?? new Date());
    setOpen(true);
  };

  const applyDayOffset = (offsetDays: number) => {
    const base = startOfDay(new Date());
    base.setDate(base.getDate() + offsetDays);
    base.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    setDraft(base);
  };

  const adjustMinutes = (delta: number) => {
    setDraft((current) => new Date(current.getTime() + delta * 60_000));
  };

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <View style={{ gap: spacing[2], width: "100%" }}>
      {label ? <Text role="label">{label}</Text> : null}
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={{
          minHeight: 46,
          borderWidth: 1,
          borderColor: error ? colorRoles.danger : colorRoles.borderSubtle,
          borderRadius: 12,
          paddingHorizontal: spacing[3],
          backgroundColor: colorRoles.surfaceMuted,
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text role="body" tone={value ? "default" : "muted"} style={{ textAlign: "right" }}>
          {value ? formatFriendly(value) : placeholder}
        </Text>
        <Icon name="calendar-outline" size={18} tone="muted" />
      </Pressable>
      {error ? <Text role="caption" tone="danger">{error}</Text> : null}

      <Sheet open={open} onOpenChange={setOpen} title={label ?? "اختر الوقت"}>
        <View style={{ gap: spacing[4], paddingBottom: spacing[4] }}>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] }}>
            {dayPresets.map((preset) => (
              <Chip
                key={preset.label}
                label={preset.label}
                selected={startOfDay(draft).getTime() === (() => {
                  const d = startOfDay(new Date());
                  d.setDate(d.getDate() + preset.offsetDays);
                  return d.getTime();
                })()}
                onPress={() => applyDayOffset(preset.offsetDays)}
              />
            ))}
          </View>

          <View style={{ alignItems: "center", gap: spacing[2] }}>
            <Text role="titleMd">{formatFriendly(draft)}</Text>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: spacing[4] }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تأخير نصف ساعة"
                onPress={() => adjustMinutes(30)}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colorRoles.surfaceMuted }}
              >
                <Icon name="add" size={20} tone="brand" />
              </Pressable>
              <Text role="bodySm" tone="muted">كل ضغطة = 30 دقيقة</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تبكير نصف ساعة"
                onPress={() => adjustMinutes(-30)}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colorRoles.surfaceMuted }}
              >
                <Icon name="remove" size={20} tone="brand" />
              </Pressable>
            </View>
          </View>

          <Button label="تأكيد الوقت" tone="primary" onPress={confirm} fullWidth />
        </View>
      </Sheet>
    </View>
  );
}
