import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Screen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";

const MAX_ADDRESS_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;

type AwnakItemType =
  | "PERSONAL_ITEMS"
  | "FOOD"
  | "HEAVY_WEIGHT"
  | "LARGE_SIZE"
  | "CAKE"
  | "FRAGILE"
  | "OTHER";
type AwnakScheduleMode = "asap" | "scheduled";

const ITEM_TYPES: readonly { readonly value: AwnakItemType; readonly label: string }[] = [
  { value: "PERSONAL_ITEMS", label: "أغراض شخصية" },
  { value: "FOOD", label: "طعام" },
  { value: "HEAVY_WEIGHT", label: "وزن ثقيل" },
  { value: "LARGE_SIZE", label: "حجم كبير" },
  { value: "CAKE", label: "كيك وتورتة" },
  { value: "FRAGILE", label: "قابل للكسر" },
  { value: "OTHER", label: "أخرى" },
];

export type AwnakFormSubmitInput = {
  readonly itemType: AwnakItemType;
  readonly pickupAddressReference: string;
  readonly dropoffAddressReference: string;
  readonly scheduleMode: AwnakScheduleMode;
  readonly scheduledAt?: string;
  readonly handlingRequirements?: string;
  readonly customerNotes?: string;
};

type Props = {
  onBack: () => void;
  onViewRequests?: () => void;
  onSubmit: (data: AwnakFormSubmitInput) => Promise<boolean>;
};

type ValidationResult =
  | { readonly ok: true; readonly scheduledAt?: string }
  | { readonly ok: false; readonly message: string };

function validateAwnakInput(input: {
  readonly pickupAddress: string;
  readonly dropoffAddress: string;
  readonly scheduleMode: AwnakScheduleMode;
  readonly scheduledDateTime: string;
}): ValidationResult {
  if (!input.pickupAddress.trim() || !input.dropoffAddress.trim()) {
    return { ok: false, message: "حدد مرجع موقع الاستلام ومرجع موقع التسليم." };
  }
  if (input.pickupAddress.trim() === input.dropoffAddress.trim()) {
    return { ok: false, message: "يجب أن يختلف موقع الاستلام عن موقع التسليم." };
  }
  if (input.scheduleMode === "asap") return { ok: true };

  const raw = input.scheduledDateTime.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return { ok: false, message: "أدخل الموعد بصيغة YYYY-MM-DDTHH:mm." };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    return { ok: false, message: "يجب أن يكون موعد التنفيذ المجدول وقتًا صالحًا في المستقبل." };
  }
  return { ok: true, scheduledAt: parsed.toISOString() };
}

export function AwnakForm({ onBack, onViewRequests, onSubmit }: Props) {
  const [itemType, setItemType] = useState<AwnakItemType>("PERSONAL_ITEMS");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [scheduleMode, setScheduleMode] = useState<AwnakScheduleMode>("asap");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [handlingRequirements, setHandlingRequirements] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const swapLocations = () => {
    if (isSubmitting) return;
    setPickupAddress(dropoffAddress);
    setDropoffAddress(pickupAddress);
  };

  const submit = async () => {
    if (isSubmitting) return;
    const validation = validateAwnakInput({
      pickupAddress,
      dropoffAddress,
      scheduleMode,
      scheduledDateTime,
    });
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const ok = await onSubmit({
        itemType,
        pickupAddressReference: pickupAddress.trim(),
        dropoffAddressReference: dropoffAddress.trim(),
        scheduleMode,
        ...(validation.scheduledAt ? { scheduledAt: validation.scheduledAt } : {}),
        ...(handlingRequirements.trim()
          ? { handlingRequirements: handlingRequirements.trim() }
          : {}),
        ...(customerNotes.trim() ? { customerNotes: customerNotes.trim() } : {}),
      });
      if (ok) setSubmitted(true);
      else setSubmitError("تعذر إنشاء طلب عونك. لم تُثبت الخدمة الطلب؛ حاول مرة أخرى.");
    } catch {
      setSubmitError("تعذر إنشاء طلب عونك. تحقق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Screen padded>
        <StateView
          tone="success"
          title="تم استلام طلب عونك"
          description="تم إنشاء الطلب وقراءته من DSH. تابع التسعير، اعتماد الدفع، إسناد الكابتن، التنفيذ، وإثبات التسليم من طلباتك الخاصة."
          actionLabel="متابعة الطلب"
          onActionPress={onViewRequests ?? onBack}
        />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Text role="headingSm" style={styles.title}>طلب مشوار عونك</Text>
          <Text role="bodySm" tone="muted" style={styles.description}>
            اطلب نقل غرض بين موقعين. تراجع العمليات قابلية التنفيذ والسعر، ثم يبدأ الإسناد بعد موافقتك.
          </Text>
        </View>

        <View style={styles.section}>
          <Text role="titleSm" style={styles.sectionTitle}>نوع الغرض</Text>
          <View style={styles.choiceRow}>
            {ITEM_TYPES.map((option) => (
              <Button
                key={option.value}
                label={option.label}
                tone={itemType === option.value ? "primary" : "secondary"}
                size="sm"
                fullWidth={false}
                disabled={isSubmitting}
                onPress={() => setItemType(option.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text role="titleSm" style={styles.sectionTitle}>المسار</Text>
          <TextField
            label="مرجع موقع الاستلام"
            placeholder="اسم المكان، الشارع، المبنى، أو تعليمات الوصول"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            multiline
            numberOfLines={2}
            maxLength={MAX_ADDRESS_LENGTH}
            disabled={isSubmitting}
          />
          <Button
            label="تبديل موقعَي الاستلام والتسليم"
            tone="ghost"
            size="sm"
            disabled={isSubmitting || (!pickupAddress.trim() && !dropoffAddress.trim())}
            onPress={swapLocations}
          />
          <TextField
            label="مرجع موقع التسليم"
            placeholder="اسم المكان، الشارع، المبنى، أو تعليمات الوصول"
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            multiline
            numberOfLines={2}
            maxLength={MAX_ADDRESS_LENGTH}
            disabled={isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text role="titleSm" style={styles.sectionTitle}>وقت التنفيذ</Text>
          <View style={styles.choiceRow}>
            <Button
              label="بأقرب وقت"
              tone={scheduleMode === "asap" ? "primary" : "secondary"}
              size="sm"
              fullWidth={false}
              disabled={isSubmitting}
              onPress={() => setScheduleMode("asap")}
            />
            <Button
              label="موعد مجدول"
              tone={scheduleMode === "scheduled" ? "primary" : "secondary"}
              size="sm"
              fullWidth={false}
              disabled={isSubmitting}
              onPress={() => setScheduleMode("scheduled")}
            />
          </View>
          {scheduleMode === "scheduled" ? (
            <TextField
              label="موعد التنفيذ"
              placeholder="YYYY-MM-DDTHH:mm"
              value={scheduledDateTime}
              onChangeText={setScheduledDateTime}
              autoCapitalize="none"
              maxLength={16}
              disabled={isSubmitting}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <TextField
            label="متطلبات المناولة"
            placeholder="مثال: قابل للكسر، يحتاج شخصين، يحفظ مبردًا"
            value={handlingRequirements}
            onChangeText={setHandlingRequirements}
            multiline
            numberOfLines={3}
            maxLength={MAX_NOTES_LENGTH}
            disabled={isSubmitting}
          />
          <TextField
            label="ملاحظات للعمليات والكابتن"
            placeholder="تفاصيل الاتصال أو الوصول أو المستلم"
            value={customerNotes}
            onChangeText={setCustomerNotes}
            multiline
            numberOfLines={4}
            maxLength={MAX_NOTES_LENGTH}
            disabled={isSubmitting}
          />
        </View>

        {submitError ? (
          <StateView tone="danger" title="تعذر إرسال الطلب" description={submitError} />
        ) : null}

        <View style={styles.actions}>
          <Button
            label="إلغاء"
            tone="secondary"
            disabled={isSubmitting}
            onPress={onBack}
            style={styles.actionButton}
          />
          <Button
            label={isSubmitting ? "جاري تثبيت الطلب..." : "إرسال للمراجعة والتسعير"}
            tone="primary"
            loading={isSubmitting}
            disabled={isSubmitting || !pickupAddress.trim() || !dropoffAddress.trim()}
            onPress={() => void submit()}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing[4], paddingBottom: spacing[10], gap: spacing[5] },
  header: { gap: spacing[2] },
  title: { textAlign: "right" },
  description: { textAlign: "right" },
  section: { gap: spacing[3] },
  sectionTitle: { textAlign: "right" },
  choiceRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[2] },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing[3], marginTop: spacing[2] },
  actionButton: { flex: 1, minWidth: 150 },
});
