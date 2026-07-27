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

const MAX_QUANTITY = 1000;
const MAX_ADDRESS_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;

export type SheinFormSubmitInput = {
  readonly productUrl: string;
  readonly quantity: number;
  readonly size?: string;
  readonly color?: string;
  readonly variantNotes?: string;
  readonly deliveryAddressReference?: string;
  readonly handlingRequirements?: string;
  readonly customerNotes?: string;
};

type Props = {
  onBack: () => void;
  onViewRequests?: () => void;
  onSubmit: (data: SheinFormSubmitInput) => Promise<boolean>;
};

type ValidationResult =
  | { readonly ok: true; readonly quantity: number }
  | { readonly ok: false; readonly message: string };

function validateSheinInput(productUrl: string, quantity: string): ValidationResult {
  const normalizedUrl = productUrl.trim();
  if (!/^https?:\/\/[^\s]+$/i.test(normalizedUrl)) {
    return { ok: false, message: "أدخل رابط منتج صالحًا يبدأ بـ http:// أو https://." };
  }

  const parsedQuantity = Number.parseInt(quantity, 10);
  if (
    !Number.isFinite(parsedQuantity)
    || String(parsedQuantity) !== quantity.trim()
    || parsedQuantity < 1
    || parsedQuantity > MAX_QUANTITY
  ) {
    return { ok: false, message: `يجب أن تكون الكمية رقمًا صحيحًا من 1 إلى ${MAX_QUANTITY}.` };
  }

  return { ok: true, quantity: parsedQuantity };
}

export function SheinForm({ onBack, onViewRequests, onSubmit }: Props) {
  const [productUrl, setProductUrl] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [variantNotes, setVariantNotes] = useState("");
  const [deliveryAddressReference, setDeliveryAddressReference] = useState("");
  const [handlingRequirements, setHandlingRequirements] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = async () => {
    if (isSubmitting) return;
    const validation = validateSheinInput(productUrl, quantity);
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const ok = await onSubmit({
        productUrl: productUrl.trim(),
        quantity: validation.quantity,
        ...(size.trim() ? { size: size.trim() } : {}),
        ...(color.trim() ? { color: color.trim() } : {}),
        ...(variantNotes.trim() ? { variantNotes: variantNotes.trim() } : {}),
        ...(deliveryAddressReference.trim()
          ? { deliveryAddressReference: deliveryAddressReference.trim() }
          : {}),
        ...(handlingRequirements.trim()
          ? { handlingRequirements: handlingRequirements.trim() }
          : {}),
        ...(customerNotes.trim() ? { customerNotes: customerNotes.trim() } : {}),
      });
      if (ok) setSubmitted(true);
      else setSubmitError("تعذر إرسال طلب شي إن. لم تُثبت الخدمة إنشاء الطلب؛ حاول مرة أخرى.");
    } catch {
      setSubmitError("تعذر إرسال طلب شي إن. تحقق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Screen padded>
        <StateView
          tone="success"
          title="تم استلام الطلب"
          description="تم إنشاء طلب شي إن وقراءته من DSH. تابع العرض، اعتماد الدفع، الشراء، الاستلام الوارد، الفرز، والتوصيل من طلباتك الخاصة."
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
          <Text role="headingSm" style={styles.title}>طلب شراء مساعد من شي إن</Text>
          <Text role="bodySm" tone="muted" style={styles.description}>
            أرسل رابط المنتج وخياراته. تراجع العمليات الطلب، تُصدر عرضًا ماليًا من WLT، ثم يبدأ الشراء والتوصيل بعد موافقتك.
          </Text>
        </View>

        <View style={styles.formGroup}>
          <TextField
            label="رابط المنتج"
            placeholder="https://..."
            value={productUrl}
            onChangeText={setProductUrl}
            autoCapitalize="none"
            maxLength={2000}
            disabled={isSubmitting}
          />
          <TextField
            label="الكمية"
            placeholder="1"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            maxLength={4}
            disabled={isSubmitting}
          />
          <View style={styles.twoColumnRow}>
            <View style={styles.flexField}>
              <TextField label="المقاس" placeholder="مثال: M أو 38" value={size} onChangeText={setSize} maxLength={120} disabled={isSubmitting} />
            </View>
            <View style={styles.flexField}>
              <TextField label="اللون" placeholder="مثال: أسود" value={color} onChangeText={setColor} maxLength={120} disabled={isSubmitting} />
            </View>
          </View>
          <TextField
            label="تفاصيل الخيار"
            placeholder="رقم الخيار، البديل المقبول، أو أي مواصفات لازمة"
            value={variantNotes}
            onChangeText={setVariantNotes}
            multiline
            numberOfLines={3}
            maxLength={MAX_NOTES_LENGTH}
            disabled={isSubmitting}
          />
          <TextField
            label="مرجع عنوان التسليم"
            placeholder="اسم العنوان أو وصفه كما سيظهر لفريق العمليات"
            value={deliveryAddressReference}
            onChangeText={setDeliveryAddressReference}
            multiline
            numberOfLines={2}
            maxLength={MAX_ADDRESS_LENGTH}
            disabled={isSubmitting}
          />
          <TextField
            label="تعليمات المناولة والتسليم"
            placeholder="مثال: تغليف إضافي، قابل للكسر، أو التسليم لشخص محدد"
            value={handlingRequirements}
            onChangeText={setHandlingRequirements}
            multiline
            numberOfLines={3}
            maxLength={MAX_NOTES_LENGTH}
            disabled={isSubmitting}
          />
          <TextField
            label="ملاحظات للعمليات"
            placeholder="أي معلومات تساعد على التسعير والشراء"
            value={customerNotes}
            onChangeText={setCustomerNotes}
            multiline
            numberOfLines={3}
            maxLength={MAX_NOTES_LENGTH}
            disabled={isSubmitting}
          />
        </View>

        {submitError ? <StateView tone="danger" title="تعذر إرسال الطلب" description={submitError} /> : null}

        <View style={styles.actions}>
          <Button label="إلغاء" tone="secondary" disabled={isSubmitting} onPress={onBack} style={styles.actionButton} />
          <Button
            label={isSubmitting ? "جاري تثبيت الطلب..." : "إرسال للمراجعة والتسعير"}
            tone="primary"
            loading={isSubmitting}
            disabled={!productUrl.trim() || isSubmitting}
            onPress={() => void submit()}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing[4], paddingBottom: spacing[10] },
  header: { gap: spacing[2], marginBottom: spacing[5] },
  title: { textAlign: "right" },
  description: { textAlign: "right" },
  formGroup: { gap: spacing[4], marginBottom: spacing[5] },
  twoColumnRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing[3] },
  flexField: { flex: 1, minWidth: 140 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing[3], marginTop: spacing[4] },
  actionButton: { flex: 1, minWidth: 150 },
});
