// Authority: services/dsh/frontend/app-client — identity and session management.
// Sovereign identity behavior: core/identity/clients.

import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Header,
  ScrollScreen,
  Text,
  TextField,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import {
  useIdentitySession,
  type SessionInfo,
} from "@bthwani/core-identity";

export type IdentityHubScreenProps = {
  readonly onBack?: () => void;
  readonly onDeleteAccount?: () => void;
};

type AsyncState = "idle" | "loading" | "error";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("ar-YE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function formatDeviceName(fingerprint: string | undefined, isCurrent: boolean): string {
  if (isCurrent) return "هذا الجهاز (الجلسة الحالية)";
  if (!fingerprint || fingerprint.trim() === "") return "هاتف ذكي";
  const lower = fingerprint.toLowerCase();
  if (
    lower.includes("cart-diagnose") ||
    lower.includes("runtime-multisurface") ||
    lower.includes("u001-") ||
    lower.includes("dsh-")
  ) {
    return "جلسة متصلة سابقة";
  }
  if (
    lower.includes("client-device") ||
    lower.includes("android") ||
    lower.includes("iphone") ||
    lower.includes("mobile")
  ) {
    return "هاتف ذكي (تطبيق العميل)";
  }
  if (
    lower.includes("web") ||
    lower.includes("browser") ||
    lower.includes("chrome") ||
    lower.includes("safari")
  ) {
    return "متصفح الويب";
  }
  return "هاتف محمول";
}

export function IdentityHubScreen({ onBack, onDeleteAccount }: IdentityHubScreenProps) {
  const {
    state: sessionState,
    listSessions,
    revokeSession,
    changePassword,
    deleteAccount,
  } = useIdentitySession();
  const [sessions, setSessions] = React.useState<SessionInfo[]>([]);
  const [sessionsState, setSessionsState] = React.useState<AsyncState>("idle");
  const [sessionsMessage, setSessionsMessage] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordMessage, setPasswordMessage] = React.useState("");
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");
  const [deleteMessage, setDeleteMessage] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const refreshSessions = React.useCallback(async () => {
    if (sessionState.kind !== "authenticated") return;
    setSessionsState("loading");
    setSessionsMessage("");
    try {
      const current = await listSessions();
      // Filter out invalid/expired sessions
      const now = Date.now();
      const valid = current.filter((s) => {
        const exp = new Date(s.expiresAt).getTime();
        return Number.isNaN(exp) || exp > now;
      });
      setSessions(valid);
      setSessionsState("idle");
    } catch (error) {
      setSessionsState("error");
      setSessionsMessage(errorMessage(error, "تعذر تحميل الأجهزة المتصلة."));
    }
  }, [listSessions, sessionState]);

  React.useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  if (sessionState.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <Header title="الأمان والحساب" subtitle="يلزم تسجيل الدخول لعرض بيانات الحساب." />
      </ScrollScreen>
    );
  }

  const identity = sessionState.identity;

  const savePassword = async () => {
    if (password.length < 6) {
      setPasswordMessage("يجب أن تتكون كلمة المرور من ستة أحرف على الأقل.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMessage("كلمتا المرور غير متطابقتين.");
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage("");
    try {
      await changePassword(password);
      setPassword("");
      setConfirmPassword("");
      setPasswordMessage("تم حفظ كلمة المرور بنجاح.");
    } catch (error) {
      setPasswordMessage(errorMessage(error, "تعذر حفظ كلمة المرور."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const revoke = async (sessionId: string) => {
    setSessionsMessage("");
    try {
      await revokeSession(sessionId);
      if (sessionId !== identity.sessionId) {
        await refreshSessions();
      }
    } catch (error) {
      setSessionsMessage(errorMessage(error, "تعذر إنهاء الجلسة."));
    }
  };

  const removeAccount = async () => {
    if (deleteConfirm !== "حذف") return;
    setDeleting(true);
    setDeleteMessage("");
    try {
      await deleteAccount();
      setDeleteConfirm("");
      onDeleteAccount?.();
    } catch (error) {
      setDeleteMessage(errorMessage(error, "تعذر حذف الحساب."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollScreen>
      <Header title="الأمان والحساب" subtitle="إدارة بيانات الدخول والأجهزة المتصلة" />
      <View style={styles.container}>
        {onBack ? <Button label="رجوع" tone="ghost" onPress={onBack} /> : null}

        <Card style={styles.card}>
          <Text role="titleMd" style={styles.sectionTitle}>بيانات الحساب</Text>
          <View style={styles.detailRow}>
            <Text role="caption" tone="muted">رقم الهاتف</Text>
            <Text role="body">{identity.phoneE164 || "غير مسجل"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text role="caption" tone="muted">حالة الحساب</Text>
            <Text role="body" style={styles.statusActive}>نشط وموثق</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text role="titleMd" style={styles.sectionTitle}>الأجهزة المتصلة</Text>
            <Button
              label={sessionsState === "loading" ? "جاري التحديث" : "تحديث"}
              tone="ghost"
              disabled={sessionsState === "loading"}
              onPress={refreshSessions}
            />
          </View>

          {sessions.length === 0 && sessionsState !== "loading" ? (
            <Text role="body" tone="muted" style={styles.message}>لا توجد أجهزة متصلة أخرى.</Text>
          ) : null}

          {sessions.map((session) => {
            const isCurrent = session.sessionId === identity.sessionId;
            return (
              <View key={session.sessionId} style={styles.sessionRow}>
                <View style={styles.sessionInfo}>
                  <Text role="body" style={styles.sessionTitle}>
                    {formatDeviceName(session.deviceFingerprint, isCurrent)}
                  </Text>
                  <Text role="caption" tone="muted">
                    آخر تسجيل: {formatDate(session.createdAt)}
                  </Text>
                </View>
                <Button
                  label={isCurrent ? "تسجيل الخروج" : "إنهاء الجلسة"}
                  tone={isCurrent ? "secondary" : "danger"}
                  onPress={() => revoke(session.sessionId)}
                />
              </View>
            );
          })}

          {sessionsMessage ? (
            <Text role="caption" style={styles.errorText}>{sessionsMessage}</Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text role="titleMd" style={styles.sectionTitle}>كلمة المرور والأمان</Text>
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="كلمة المرور الجديدة"
            secureTextEntry
          />
          <TextField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="تأكيد كلمة المرور"
            secureTextEntry
          />
          <Button
            label={passwordSaving ? "جاري الحفظ" : "تحديث كلمة المرور"}
            tone="primary"
            disabled={passwordSaving}
            onPress={savePassword}
          />
          {passwordMessage ? (
            <Text role="caption" style={styles.message}>{passwordMessage}</Text>
          ) : null}
        </Card>

        <Card style={[styles.card, styles.dangerCard]}>
          <Text role="titleMd" style={styles.dangerTitle}>حذف الحساب</Text>
          <Text role="body" style={styles.dangerText}>
            عند تأكيد حذف الحساب، سيتم إغلاق حسابك نهائياً وإنهاء كافة الجلسات النشطة وحذف بياناتك وفقاً لسياسة الخصوصية. اكتب كلمة «حذف» للمتابعة.
          </Text>
          <TextField
            value={deleteConfirm}
            onChangeText={setDeleteConfirm}
            placeholder="اكتب حذف"
          />
          <Button
            label={deleting ? "جاري الحذف" : "حذف الحساب نهائياً"}
            tone="danger"
            disabled={deleting || deleteConfirm !== "حذف"}
            onPress={removeAccount}
          />
          {deleteMessage ? (
            <Text role="caption" style={styles.errorText}>{deleteMessage}</Text>
          ) : null}
        </Card>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[3],
  },
  card: {
    padding: spacing[4],
    gap: spacing[3],
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  sectionTitle: {
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  detailRow: {
    gap: spacing[1],
    alignItems: "flex-end",
  },
  statusActive: {
    color: colorRoles.brandAction,
  },
  sessionRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.surfaceMuted,
  },
  sessionInfo: {
    flex: 1,
    alignItems: "flex-end",
    gap: spacing[1],
  },
  sessionTitle: {
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  message: {
    textAlign: "right",
    color: colorRoles.brandStructure,
  },
  errorText: {
    textAlign: "right",
    color: colorRoles.brandAction,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: colorRoles.brandAction,
  },
  dangerTitle: {
    textAlign: "right",
    color: colorRoles.brandAction,
  },
  dangerText: {
    textAlign: "right",
    color: colorRoles.brandAction,
  },
});
