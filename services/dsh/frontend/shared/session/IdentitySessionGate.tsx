import React, { useState, type ReactNode } from "react";
import { StyleSheet, View, Platform } from "react-native";
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
  getIdentityDeviceFingerprint,
  identityErrorPresentation,
  identitySessionAuthorizesSurface,
  useIdentitySession,
  type ActivationActorType,
  type ActorIdentity,
} from "@bthwani/core-identity";
import { requestDevelopmentSession } from "./dev-session-broker.adapter";

export type DshSurfaceRole = ActorIdentity["roles"][number];

export type IdentitySessionGateProps = {
  readonly requiredRole: DshSurfaceRole;
  readonly requiredSurface?: string;
  readonly children: ReactNode;
};

declare const __DEV__: boolean;

function isPlatformAccessActorType(role: DshSurfaceRole): role is ActivationActorType {
  return role === "partner" || role === "captain" || role === "field";
}

function accessCodeIssuer(role: ActivationActorType): string {
  switch (role) {
    case "captain":
      return "قسم العمليات";
    case "field":
    case "partner":
      return "قسم الشركاء";
    default:
      return "القسم المسؤول";
  }
}

function errorCode(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "IDENTITY_UNAVAILABLE";
}

function quickDeveloperLoginLabel(
  role: DshSurfaceRole,
  surface?: string,
): string | null {
  switch (role) {
    case "operator":
      return surface === "control-panel" ? "دخول سريع كمشغل التطوير المحلي" : null;
    case "client":
      return surface === "app-client" ? "دخول سريع كعميل التطوير المحلي" : null;
    case "partner":
      return surface === "app-partner" ? "دخول سريع كشريك التطوير المحلي" : null;
    case "field":
      return surface === "app-field" ? "دخول سريع كمندوب التطوير المحلي" : null;
    case "captain":
      return surface === "app-captain" ? "دخول سريع ككابتن التطوير المحلي" : null;
    default:
      return null;
  }
}

function IdentityAccessPanel({
  requiredRole,
  requiredSurface,
  errorMessage,
}: {
  readonly requiredRole: DshSurfaceRole;
  readonly requiredSurface?: string;
  readonly errorMessage?: string;
}) {
  const { login, activate, adoptSession } = useIdentitySession();
  const platformAccessRequired = isPlatformAccessActorType(requiredRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const errorPresentation = errorMessage ? identityErrorPresentation(errorMessage) : null;
  const quickLoginLabel = quickDeveloperLoginLabel(requiredRole, requiredSurface);
  const quickLoginEnabled =
    typeof __DEV__ !== "undefined"
    && __DEV__
    && Platform.OS !== "web"
    && quickLoginLabel !== null;

  const submitLogin = async () => {
    if (!username.trim() || !password) {
      setFeedback("أدخل اسم المستخدم وكلمة المرور.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    try {
      await login(username.trim(), password);
    } catch (error) {
      setFeedback(identityErrorPresentation(errorCode(error)).description);
    } finally {
      setSubmitting(false);
    }
  };

  const submitPlatformAccessCode = async () => {
    if (!platformAccessRequired || !phone.trim() || !/^\d{6}$/.test(code.trim())) {
      setFeedback("أدخل رقم الهاتف وكود الدخول المكوّن من ستة أرقام.");
      return;
    }
    setSubmitting(true);
    setFeedback("");
    try {
      await activate(requiredRole, phone.trim(), code.trim());
    } catch (error) {
      setFeedback(identityErrorPresentation(errorCode(error)).description);
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuickDeveloperLogin = async () => {
    if (!quickLoginEnabled || !requiredSurface) return;

    setSubmitting(true);
    setFeedback("");
    try {
      const deviceFingerprint = await getIdentityDeviceFingerprint();
      await adoptSession(await requestDevelopmentSession({
        role: requiredRole,
        surface: requiredSurface,
        deviceFingerprint,
      }));
    } catch (error) {
      setFeedback(identityErrorPresentation(errorCode(error)).description);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.accessRoot}>
      <Card style={styles.accessCard}>
        <Text role="titleLg" style={styles.title}>الدخول إلى بثواني</Text>
        <Text role="body" tone="muted" style={styles.description}>
          {platformAccessRequired
            ? `استخدم كود الدخول الصادر لك من ${accessCodeIssuer(requiredRole)} بعد اعتماد حسابك.`
            : "استخدم بيانات الحساب للدخول إلى التطبيق."}
        </Text>

        {errorPresentation ? (
          <View style={styles.errorPanel}>
            <Text role="body" style={styles.errorText}>{errorPresentation.title}</Text>
            <Text role="caption" style={styles.errorText}>{errorPresentation.description}</Text>
          </View>
        ) : null}

        {platformAccessRequired ? (
          <View style={styles.form}>
            <TextField
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم الهاتف المرتبط بالحساب"
              keyboardType="phone-pad"
            />
            <Text role="caption" tone="muted" style={styles.activationNotice}>
              كود الدخول تمنحه منصة بثواني ولا يُرسل تلقائيًا للتحقق من رقم الهاتف. لا يمكن طلبه من التطبيق.
            </Text>
            <TextField
              value={code}
              onChangeText={setCode}
              placeholder="كود الدخول من 6 أرقام"
              keyboardType="numeric"
              maxLength={6}
            />
            <Button
              label={submitting ? "جاري تسجيل الجهاز" : "تسجيل هذا الجهاز والدخول"}
              tone="primary"
              disabled={submitting || !phone.trim() || !/^\d{6}$/.test(code.trim())}
              onPress={submitPlatformAccessCode}
            />
          </View>
        ) : (
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
        )}

        {quickLoginEnabled && quickLoginLabel ? (
          <View style={styles.developmentLogin}>
            <Text role="caption" tone="muted" style={styles.developmentNotice}>
              بيئة التطوير المحلية فقط
            </Text>
            <Button
              label={submitting ? "جاري الدخول السريع" : quickLoginLabel}
              tone="secondary"
              disabled={submitting}
              onPress={submitQuickDeveloperLogin}
            />
          </View>
        ) : null}

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
  const { state, retryBootstrap } = useIdentitySession();

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

    case "service_unavailable": {
      const presentation = identityErrorPresentation(state.message);
      return (
        <ErrorState
          title={presentation.title}
          description={state.retainedSession
            ? "تعذر التحقق من الخدمة مؤقتًا. بقيت الجلسة محفوظة ولن يُطلب منك تسجيل الدخول بسبب الانقطاع."
            : presentation.description}
          actionLabel="إعادة الفحص"
          onActionPress={() => void retryBootstrap()}
        />
      );
    }

    case "error":
      return (
        <IdentityAccessPanel
          requiredRole={requiredRole}
          {...(requiredSurface === undefined ? {} : { requiredSurface })}
          errorMessage={state.message}
        />
      );

    case "signed_out":
      return (
        <IdentityAccessPanel
          requiredRole={requiredRole}
          {...(requiredSurface === undefined ? {} : { requiredSurface })}
        />
      );

    case "authenticated": {
      const hasRole = state.identity.roles.includes(requiredRole);
      const surfaceAuthorized = requiredSurface === undefined
        ? hasRole
        : identitySessionAuthorizesSurface(state.identity, requiredRole, requiredSurface);

      if (!surfaceAuthorized) {
        return (
          <PermissionState
            title="لا تملك صلاحية الوصول"
            description={
              !hasRole
                ? `هذه الواجهة مخصصة لدور "${requiredRole}" ولا يملكه المستخدم الحالي.`
                : `الجلسة الحالية ليست جلسة موثوقة لسطح "${requiredSurface}".`
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
  form: {
    gap: spacing[3],
  },
  errorPanel: {
    gap: spacing[1],
  },
  errorText: {
    textAlign: "right",
    color: colorRoles.brandAction,
  },
  activationNotice: {
    textAlign: "right",
  },
  developmentLogin: {
    gap: spacing[2],
    paddingTop: spacing[2],
  },
  developmentNotice: {
    textAlign: "center",
  },
  feedback: {
    textAlign: "right",
    color: colorRoles.brandStructure,
  },
});
