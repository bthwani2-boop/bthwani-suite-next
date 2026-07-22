import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Screen, StateView, Text, TextField, colorRoles, spacing } from "@bthwani/ui-kit";

export type SheinFormSubmitInput = {
  readonly productUrl: string;
  readonly quantity: number;
  readonly size?: string;
  readonly color?: string;
  readonly variantNotes?: string;
};

type Props = {
  onBack: () => void;
  onViewRequests?: () => void;
  onSubmit: (data: SheinFormSubmitInput) => Promise<boolean>;
};

export function SheinForm({ onBack, onViewRequests, onSubmit }: Props) {
  const [productUrl, setProductUrl] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (submitted) {
    return (
      <Screen padded>
        <StateView
          title="تم استلام الطلب"
          description="تم استلام طلب شي إن بنجاح. تابع العرض وحالة الشراء والتوصيل من طلباتك الخاصة."
          actionLabel="متابعة الطلب"
          onActionPress={onViewRequests ?? onBack}
        />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text role="headingSm" style={styles.title}>طلب من شي إن (SHEIN)</Text>

        <View style={styles.formGroup}>
          <TextField
            label="رابط المنتج"
            placeholder="أدخل رابط المنتج من تطبيق شي إن"
            value={productUrl}
            onChangeText={setProductUrl}
            autoCapitalize="none"
            {...(submitError && !productUrl.trim() ? { error: "رابط المنتج مطلوب" } : {})}
          />
          <TextField label="المقاس" placeholder="مثال: M, L, 38" value={size} onChangeText={setSize} />
          <TextField label="اللون" placeholder="مثال: أسود، أبيض" value={color} onChangeText={setColor} />
          <TextField
            label="الكمية"
            placeholder="1"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
          <TextField
            label="تفاصيل الخيار"
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
              const parsedQuantity = Number.parseInt(quantity, 10);
              if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
                setSubmitError("أدخل كمية صحيحة قبل إرسال الطلب.");
                return;
              }
              setIsSubmitting(true);
              setSubmitError(null);
              try {
                const ok = await onSubmit({
                  productUrl: productUrl.trim(),
                  quantity: parsedQuantity,
                  ...(size.trim() ? { size: size.trim() } : {}),
                  ...(color.trim() ? { color: color.trim() } : {}),
                  ...(notes.trim() ? { variantNotes: notes.trim() } : {}),
                });
                if (ok) setSubmitted(true);
                else setSubmitError("تعذر إرسال طلب شي إن. تحقق من الاتصال ثم حاول مرة أخرى.");
              } catch {
                setSubmitError("تعذر إرسال طلب شي إن. تحقق من الاتصال ثم حاول مرة أخرى.");
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={!productUrl.trim() || isSubmitting}
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
