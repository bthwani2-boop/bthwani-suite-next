import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Button, Screen, StateView, Text, colorRoles, spacing } from '@bthwani/ui-kit';

export type AwnakFormSubmitInput = {
  readonly itemType: string;
  readonly pickupAddressReference: string;
  readonly dropoffAddressReference: string;
  readonly customerNotes?: string;
};

type Props = {
  onBack: () => void;
  onSubmit: (data: AwnakFormSubmitInput) => Promise<boolean>;
};

export function AwnakForm({ onBack, onSubmit }: Props) {
  const [itemType, setItemType] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (submitted) {
    return (
      <Screen padded>
        <StateView
          title="تم استلام الطلب"
          description="تم استلام طلب عونك بنجاح وسيقوم أحد مندوبينا بالتواصل معك."
          actionLabel="العودة للرئيسية"
          onActionPress={onBack}
        />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text role="headingSm" style={styles.title}>طلب مشوار عونك</Text>
        
        <View style={styles.formGroup}>
          <TextInput
            placeholder="ماذا تريدنا أن نوصل لك؟ (مثال: أوراق، طرد صغير)"
            value={itemType}
            onChangeText={setItemType}
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="من أين نستلم الغرض؟"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            style={styles.input}
            textAlign="right"
          />
          <TextInput
            placeholder="إلى أين نوصل الغرض؟"
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
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
              setIsSubmitting(true);
              setSubmitError(null);
              try {
                const ok = await onSubmit({
                  itemType: itemType.trim(),
                  pickupAddressReference: pickupAddress.trim(),
                  dropoffAddressReference: dropoffAddress.trim(),
                  ...(notes.trim() ? { customerNotes: notes.trim() } : {}),
                });
                if (ok) {
                  setSubmitted(true);
                } else {
                  setSubmitError('تعذر إرسال طلب عونك. تحقق من الاتصال ثم حاول مرة أخرى.');
                }
              } catch {
                setSubmitError('تعذر إرسال طلب عونك. تحقق من الاتصال ثم حاول مرة أخرى.');
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
