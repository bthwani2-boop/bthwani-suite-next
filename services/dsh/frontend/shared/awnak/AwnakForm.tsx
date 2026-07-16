import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Input, Screen, StateView, Typography, colorRoles, spacing } from '@bthwani/ui-kit';

type Props = {
  onBack: () => void;
  onSubmit: (data: any) => void;
};

export function AwnakForm({ onBack, onSubmit }: Props) {
  const [itemType, setItemType] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [submitted, setSubmitted] = useState(false);

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
        <Typography.Title1 style={styles.title}>طلب مشوار عونك</Typography.Title1>
        
        <View style={styles.formGroup}>
          <Input
            label="نوع الغرض"
            placeholder="ماذا تريدنا أن نوصل لك؟ (مثال: أوراق، طرد صغير)"
            value={itemType}
            onChangeText={setItemType}
          />
          <Input
            label="نقطة الاستلام"
            placeholder="من أين نستلم الغرض؟"
            value={pickupAddress}
            onChangeText={setPickupAddress}
          />
          <Input
            label="نقطة التسليم"
            placeholder="إلى أين نوصل الغرض؟"
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
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
            onPress={() => {
              onSubmit({ itemType, pickupAddress, dropoffAddress, notes });
              setSubmitted(true);
            }}
            disabled={!itemType || !pickupAddress || !dropoffAddress}
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
