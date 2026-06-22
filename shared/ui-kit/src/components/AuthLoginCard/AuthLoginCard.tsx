import { useState } from "react";
import { Card } from "../Card";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { Button } from "../Button";
import { Block } from "../_shared";

export type AuthLoginCardProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onSubmit: (username: string, password: string) => void;
};

export function AuthLoginCard({
  title,
  subtitle,
  loading = false,
  error,
  onSubmit,
}: AuthLoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const disabled = username.trim().length === 0 || password.length < 12;

  return (
    <Card>
      <Block gap="$4" padding="$4">
        <Block gap="$1">
          <Text role="titleLg" align="start">{title}</Text>
          <Text tone="secondary" align="start">{subtitle}</Text>
        </Block>
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
      </Block>
    </Card>
  );
}
