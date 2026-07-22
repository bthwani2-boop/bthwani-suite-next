import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Screen, StateView, Text, TextField, colorRoles, spacing } from "@bthwani/ui-kit";

export type AwnakFormSubmitInput = {
  readonly itemType: string;
  readonly pickupAddressReference: string;
  readonly dropoffAddressReference: string;
  readonly customerNotes?: string;
};

type Props = {
  onBack: () => void;
  onViewRequests?: () => void;
  onSubmit: (data: AwnakFormSubmitInput) => Promise<boolean>;
};

export function AwnakForm({ onBack, onViewRequests, onSubmit }: Props) {
  const [itemType, setItemType] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (submitted) {
    return (
      <Screen padded>
        <StateView
          title="تم استلام الطلب"
          description="تم استلام طلب عونك بنجاح. تابع العرض وإسناد الكابتن وحالة التسليم من طلباتك الخاصة."
          actionLabel="متابعة الطلب"
          onActionPress={onViewRequests ?? onBack}
        />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text role="headingSm" style={styles.title}>طلب مشوار عونك</Text>

        <View style={styles.formGroup}>
          <TextField
            label="نوع الغرض"
            placeholder="مثال: أوراق أو طرد صغير"
            value={itemType}
            onChangeText={setItemType}
            error={submitError && !itemType.trim() ? "نوع الغرض مطلوب" : undefined}
          />
          <TextField
            label="مرجع موقع الاستلام"
            placeholder="من أين نستلم الغرض؟"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            error={submitError && !pickupAddress.trim() ? "مرجع الاستلام مطلوب" : undefined}
          />
          <TextField
            label="مرجع موقع التسليم"
            placeholder="إلى أين نوصل الغرض؟"
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            error={submitError && !dropoffAddress.trim() ? "مرجع التسليم مطلوب" : undefined}
          />
          <TextField
            label="ملاحظات العميل"
            placeholder="أي تفاصيل أخرى تود إضافتها"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            maxLength={2000}
          />
        </View>

        <View style={styles.actions}>
          <Button label="إلغاء" tone="secondary" onPress={onBack} style={styles.actionButton} />
          <Button
            label={isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
            tone="primary"
            loading={isSubmitting}
            onPress={async () => {
              setIsSubmitting(true);
              setSubmitError(null);
              try {
                const ok = await onSubmit({
                  itemType: itemType.trim(),
                  pickupAddressReference: pickupAddress.trim(),
                  dropoffAddressReference: dropoffAddress.trim(),
                  ...(notes.trim() ? { customerNotes: notes.trim() } : {}),
                });
                if (ok) setSubmitted(true);
                else setSubmitError("تعذر إرسال طلب عونك. تحقق من الاتصال ثم حاول مرة أخرى.");
              } catch {
                setSubmitError("تعذر إرسال طلب عونك. تحقق من الاتصال ثم حاول مرة أخرى.");
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={!itemType.trim() || !pickupAddress.trim() || !dropoffAddress.trim() || isSubmitting}
            style={styles.actionButton}
          />
        </View>
        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing[4] },
  title: { marginBottom: spacing[6], textAlign: "right" },
  formGroup: { gap: spacing[4], marginBottom: spacing[6] },
  actions: { flexDirection: "row", gap: spacing[3] },
  actionButton: { flex: 1 },
  errorText: { color: colorRoles.danger, marginTop: spacing[3], textAlign: "right" },
});
