import { useState } from "react";
import { View } from "react-native";
import { Card, Text, TextField, Button, spacing } from "@bthwani/ui-kit";

export type AuthLoginCardProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onSubmit: (username: string, password: string) => void;
  readonly onDevBypass?: () => void;
};

declare const __DEV__: boolean | undefined;

export function AuthLoginCard({
  title,
  subtitle,
  loading = false,
  error,
  onSubmit,
  onDevBypass,
}: AuthLoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const disabled = username.trim().length === 0 || password.length < 4;
  const showDevButton = __DEV__ === true && onDevBypass !== undefined;

  return (
    <Card>
      <View style={{ gap: spacing[4], padding: spacing[4] }}>
        <View style={{ gap: spacing[1] }}>
          <Text role="titleLg" align="start">{title}</Text>
          <Text tone="secondary" align="start">{subtitle}</Text>
        </View>
        <TextField
          label="اسم المستخدم"
          value={username}
          onChangeText={setUsername}
          placeholder="أدخل اسم المستخدم"
        />
        <TextField
          label="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          placeholder="أدخل كلمة المرور"
          secureTextEntry
          {...(error ? { error } : {})}
        />
        <Button
          label="تسجيل الدخول"
          fullWidth
          loading={loading}
          disabled={disabled}
          onPress={() => onSubmit(username.trim(), password)}
        />
        {showDevButton && (
          <Button
            label="[DEV] دخول المطور بدون كلمة مرور"
            fullWidth
            tone="secondary"
            onPress={onDevBypass}
          />
        )}
      </View>
    </Card>
  );
}
