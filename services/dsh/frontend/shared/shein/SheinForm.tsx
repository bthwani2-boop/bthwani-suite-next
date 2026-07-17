import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Button, Screen, StateView, Text, colorRoles, spacing } from '@bthwani/ui-kit';

export type SheinFormSubmitInput = {
  readonly productUrl: string;
  readonly quantity: number;
  readonly size?: string;
  readonly color?: string;
  readonly variantNotes?: string;
};

type Props = {
  onBack: () => void;
  onSubmit: (data: SheinFormSubmitInput) => Promise<boolean>;
};

export function SheinForm({ onBack, onSubmit }: Props) {
  const [productUrl, setProductUrl] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (submitted) {
    return (
      <Screen padded>
        <StateView
          title="تم استلام الطلب"
          description="تم استلام طلب شي ان بنجاح وسنقوم بالتواصل معك قريباً."
          actionLabel="العودة للرئيسية"
          onActionPress={onBack}
        />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text role="headingSm" style={styles.title}>طلب من شي ان (SHEIN)</Text>
        
        <View style={styles.formGroup}>
          <TextInput
            placeholder="أدخل رابط المنتج من تطبيق شي ان"
            value={productUrl}
            onChangeText={setProductUrl}
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="مثال: M, L, 38"
            value={size}
            onChangeText={setSize}
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="مثال: أسود، أبيض"
            value={color}
            onChangeText={setColor}
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="1"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="أي تفاصيل أخرى تود إضافتها"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[styles.input, styles.textArea]}
            textAlign="right"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actions}>
          <Button
            label="إلغاء"
            tone="secondary"
            onPress={onBack}
            style={styles.actionButton}
          />
          <Button
            label={isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
            tone="primary"
            onPress={async () => {
              const parsedQuantity = Number.parseInt(quantity, 10);
              if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
                setSubmitError('أدخل كمية صحيحة قبل إرسال الطلب.');
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
                if (ok) {
                  setSubmitted(true);
                } else {
                  setSubmitError('تعذر إرسال طلب شي ان. تحقق من الاتصال ثم حاول مرة أخرى.');
                }
              } catch {
                setSubmitError('تعذر إرسال طلب شي ان. تحقق من الاتصال ثم حاول مرة أخرى.');
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
  container: {
    paddingVertical: spacing[4],
  },
  title: {
    marginBottom: spacing[6],
    textAlign: 'right',
  },
  formGroup: {
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  input: {
    borderColor: colorRoles.borderSubtle,
    borderRadius: 12,
    borderWidth: 1,
    color: colorRoles.textPrimary,
    minHeight: 48,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    writingDirection: 'rtl',
  },
  textArea: {
    minHeight: 96,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
  },
  errorText: {
    color: colorRoles.danger,
    marginTop: spacing[3],
    textAlign: 'right',
  },
});
