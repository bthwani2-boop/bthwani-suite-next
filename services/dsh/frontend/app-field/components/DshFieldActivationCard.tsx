import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { configureIdentityActivationActorType } from "@bthwani/core-identity";
import { Button, Card, Text, TextField, spacing } from "@bthwani/ui-kit";

configureIdentityActivationActorType("field");

export type DshFieldActivationCardProps = {
  readonly loading?: boolean;
  readonly error?: string;
  readonly onSubmit: (phone: string, code: string) => void;
};

export function DshFieldActivationCard({
  loading = false,
  error,
  onSubmit,
}: DshFieldActivationCardProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const normalizedCode = code.replace(/\D/g, "").slice(0, 6);
  const disabled = phone.trim().length < 8 || normalizedCode.length !== 6 || loading;

  return (
    <Card>
      <View style={styles.cardBody}>
        <View style={styles.header}>
          <Text role="titleLg" align="start">تفعيل الموظف الميداني</Text>
          <Text tone="secondary" align="start">
            أدخل رقم الهاتف والكود الصادر من لوحة التحكم لتفعيل الجلسة.
          </Text>
        </View>
        <TextField
          label="رقم الهاتف"
          value={phone}
          onChangeText={setPhone}
          placeholder="مثال: 777123456"
        />
        <TextField
          label="كود التفعيل"
          value={normalizedCode}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          {...(error ? { error } : {})}
        />
        <Button
          label="تفعيل الدخول"
          fullWidth
          loading={loading}
          disabled={disabled}
          onPress={() => onSubmit(phone.trim(), normalizedCode)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardBody: {
    gap: spacing[4],
    padding: spacing[4],
  },
  header: {
    gap: spacing[1],
  },
});
