import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Input, Screen, StateView, Typography, colorRoles, spacing } from '@bthwani/ui-kit';

type Props = {
  onBack: () => void;
  onSubmit: (data: any) => Promise<void>;
};

export function SheinForm({ onBack, onSubmit }: Props) {
  const [productUrl, setProductUrl] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        <Typography.Title1 style={styles.title}>طلب من شي ان (SHEIN)</Typography.Title1>
        
        <View style={styles.formGroup}>
          <Input
            label="رابط المنتج"
            placeholder="أدخل رابط المنتج من تطبيق شي ان"
            value={productUrl}
            onChangeText={setProductUrl}
          />
          <Input
            label="المقاس"
            placeholder="مثال: M, L, 38"
            value={size}
            onChangeText={setSize}
          />
          <Input
            label="اللون"
            placeholder="مثال: أسود، أبيض"
            value={color}
            onChangeText={setColor}
          />
          <Input
            label="الكمية"
            placeholder="1"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />
          <Input
            label="ملاحظات إضافية"
            placeholder="أي تفاصيل أخرى تود إضافتها"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <View style={styles.actions}>
          <Button
            title="إلغاء"
            variant="outline"
            onPress={onBack}
            style={styles.actionButton}
          />
          <Button
            title="إرسال الطلب"
            variant="primary"
            onPress={async () => {
              setIsSubmitting(true);
              try {
                await onSubmit({ productUrl, size, color, quantity: parseInt(quantity, 10), notes });
                setSubmitted(true);
              } catch (e) {
                // handle error
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={!productUrl || isSubmitting}
            style={styles.actionButton}
          />
        </View>
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
    textAlign: 'left',
  },
  formGroup: {
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
  },
});
