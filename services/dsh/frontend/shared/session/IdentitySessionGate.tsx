import React, { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  PermissionState,
  Text,
  TextField,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import {
  useIdentitySession,
  type ActivationActorType,
  type ActorIdentity,
} from "@bthwani/core-identity";

export type DshSurfaceRole = ActorIdentity["roles"][number];

export type IdentitySessionGateProps = {
  readonly requiredRole: DshSurfaceRole;
  readonly requiredSurface?: string;
  readonly children: ReactNode;
};

type SignInMode = "login" | "activation";

function isActivationActorType(role: DshSurfaceRole): role is ActivationActorType {
  return role === "client" || role === "partner" || role === "captain" || role === "field";
}

function IdentityAccessPanel({
  requiredRole,
  errorMessage,
}: {
  readonly requiredRole: DshSurfaceRole;
  readonly errorMessage?: string;
}) {
  const { login, requestOtp, activate } = useIdentitySession();
  const activationAvailable = isActivationActorType(requiredRole);
  const [mode, setMode] = useState<SignInMode>(activationAvailable ? "activation" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitLogin = async () => {
    if (!username.trim() || !password) {
      setFeedback("أدخل اسم المستخدم وكلمة المرور.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    await login(username.trim(), password);
    setSubmitting(false);
  };

  const issueOtp = async () => {
    if (!activationAvailable || !phone.trim()) {
      setFeedback("أدخل رقم الهاتف المرتبط بالحساب.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    try {
      const issued = await requestOtp(requiredRole, phone.trim());
      setFeedback(`تم إصدار رمز تفعيل للرقم ${issued.maskedPhone}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "تعذر إصدار رمز التفعيل.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitActivation = async () => {
    if (!activationAvailable || !phone.trim() || !/^\d{6}$/.test(code.trim())) {
      setFeedback("أدخل رقم الهاتف ورمز تفعيل مكوّنًا من ستة أرقام.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    await activate(requiredRole, phone.trim(), code.trim());
    setSubmitting(false);
  };

  return (
    <View style={styles.accessRoot}>
      <Card style={styles.accessCard}>
        <Text role="titleLg" style={styles.title}>الدخول إلى بثواني</Text>
        <Text role="body" tone="muted" style={styles.description}>
          استخدم بيانات الحساب أو رمز التفعيل المخصص لهذا التطبيق.
        </Text>

        {errorMessage ? (
          <Text role="caption" style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <View style={styles.modeRow}>
          <Button
            label="تسجيل الدخول"
            tone={mode === "login" ? "primary" : "ghost"}
            onPress={() => {
              setMode("login");
              setFeedback("");
            }}
          />
          {activationAvailable ? (
            <Button
              label="التفعيل بالرمز"
              tone={mode === "activation" ? "primary" : "ghost"}
              onPress={() => {
                setMode("activation");
                setFeedback("");
              }}
            />
          ) : null}
        </View>

        {mode === "login" ? (
          <View style={styles.form}>
            <TextField
              value={username}
              onChangeText={setUsername}
              placeholder="اسم المستخدم"
              autoCapitalize="none"
            />
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              secureTextEntry
            />
            <Button
              label={submitting ? "جاري الدخول" : "دخول"}
              tone="primary"
              disabled={submitting}
              onPress={submitLogin}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <TextField
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم الهاتف"
              keyboardType="phone-pad"
            />
            <Button
              label={submitting ? "جاري الإصدار" : "طلب رمز التفعيل"}
              tone="secondary"
              disabled={submitting}
              onPress={issueOtp}
            />
            <TextField
              value={code}
              onChangeText={setCode}
              placeholder="رمز التفعيل من 6 أرقام"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Button
              label={submitting ? "جاري التفعيل" : "تفعيل ودخول"}
              tone="primary"
              disabled={submitting}
              onPress={submitActivation}
            />
          </View>
        )}

        {feedback ? <Text role="caption" style={styles.feedback}>{feedback}</Text> : null}
      </Card>
    </View>
  );
}

export function IdentitySessionGate({
  requiredRole,
  requiredSurface,
  children,
}: IdentitySessionGateProps) {
  const { state } = useIdentitySession();

  switch (state.kind) {
    case "restoring":
    case "authenticating":
      return <LoadingState title="جاري التحقق من الجلسة" description="يتم استعادة جلسة الدخول الحالية." />;

    case "unconfigured":
      return (
        <ErrorState
          title="الجلسة غير مهيأة"
          description="لم يتم تهيئة خدمة الهوية لهذا التطبيق بعد. تواصل مع فريق التشغيل."
        />
      );

    case "error":
      return <IdentityAccessPanel requiredRole={requiredRole} errorMessage={state.message} />;

    case "signed_out":
      return <IdentityAccessPanel requiredRole={requiredRole} />;

    case "authenticated": {
      const hasRole = state.identity.roles.includes(requiredRole);
      const hasSurfaceAccess =
        requiredSurface === undefined || state.identity.surfaceAccess[requiredSurface] === true;

      if (!hasRole || !hasSurfaceAccess) {
        return (
          <PermissionState
            title="لا تملك صلاحية الوصول"
            description={
              !hasRole
                ? `هذه الواجهة مخصصة لدور "${requiredRole}" ولا يملكه المستخدم الحالي.`
                : `المستخدم الحالي لا يملك صلاحية الوصول إلى سطح "${requiredSurface}".`
            }
          />
        );
      }

      return <>{children}</>;
    }

    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

const styles = StyleSheet.create({
  accessRoot: {
    flex: 1,
    justifyContent: "center",
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceMuted,
  },
  accessCard: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: spacing[5],
    gap: spacing[3],
  },
  title: {
    textAlign: "right",
    color: colorRoles.brandStructure,
  },
  description: {
    textAlign: "right",
  },
  modeRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  form: {
    gap: spacing[3],
  },
  errorText: {
    textAlign: "right",
    color: colorRoles.brandAction,
  },
  feedback: {
    textAlign: "right",
    color: colorRoles.brandStructure,
  },
});
