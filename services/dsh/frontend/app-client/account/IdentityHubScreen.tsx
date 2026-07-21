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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ar");
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
      setSessions(current);
      setSessionsState("idle");
    } catch (error) {
      setSessionsState("error");
      setSessionsMessage(errorMessage(error, "تعذر تحميل الجلسات النشطة."));
    }
  }, [listSessions, sessionState]);

  React.useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  if (sessionState.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <Header title="الهوية والجلسات" subtitle="يلزم تسجيل الدخول لعرض بيانات الحساب." />
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
      setPasswordMessage("تم تغيير كلمة المرور.");
    } catch (error) {
      setPasswordMessage(errorMessage(error, "تعذر تغيير كلمة المرور."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const revoke = async (sessionId: string) => {
    setSessionsMessage("");
    try {
      await revokeSession(sessionId);
      if (sessionId !== identity.sessionId) await refreshSessions();
    } catch (error) {
      setSessionsMessage(errorMessage(error, "تعذر سحب الجلسة."));
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
      <Header title="الهوية والجلسات" subtitle="بيانات الهوية السيادية والتحكم في الوصول" />
      <View style={styles.container}>
        {onBack ? <Button label="رجوع" tone="ghost" onPress={onBack} /> : null}

        <Card style={styles.card}>
          <Text role="titleMd" style={styles.sectionTitle}>بيانات الهوية</Text>
          <View style={styles.detailRow}>
            <Text role="caption" tone="muted">المعرّف</Text>
            <Text role="body">{identity.subject}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text role="caption" tone="muted">رقم الهاتف</Text>
            <Text role="body">{identity.phoneE164}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text role="caption" tone="muted">الأدوار</Text>
            <Text role="body">{identity.roles.join("، ")}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text role="caption" tone="muted">انتهاء الجلسة الحالية</Text>
            <Text role="body">{formatDate(identity.expiresAt)}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text role="titleMd" style={styles.sectionTitle}>الجلسات النشطة</Text>
            <Button
              label={sessionsState === "loading" ? "جاري التحديث" : "تحديث"}
              tone="ghost"
              disabled={sessionsState === "loading"}
              onPress={refreshSessions}
            />
          </View>

          {sessions.length === 0 && sessionsState !== "loading" ? (
            <Text role="body" tone="muted" style={styles.message}>لا توجد جلسات نشطة أخرى.</Text>
          ) : null}

          {sessions.map((session) => {
            const isCurrent = session.sessionId === identity.sessionId;
            return (
              <View key={session.sessionId} style={styles.sessionRow}>
                <View style={styles.sessionInfo}>
                  <Text role="body" style={styles.sessionTitle}>
                    {isCurrent ? "هذه الجلسة" : session.deviceFingerprint || "جهاز غير مسمى"}
                  </Text>
                  <Text role="caption" tone="muted">
                    أُنشئت: {formatDate(session.createdAt)}
                  </Text>
                  <Text role="caption" tone="muted">
                    تنتهي: {formatDate(session.expiresAt)}
                  </Text>
                </View>
                <Button
                  label={isCurrent ? "تسجيل الخروج" : "سحب الجلسة"}
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
          <Text role="titleMd" style={styles.sectionTitle}>تغيير كلمة المرور</Text>
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
            label={passwordSaving ? "جاري الحفظ" : "حفظ كلمة المرور"}
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
            سيُخفى الحساب وتُسحب جلساته وتُنشأ عملية الحذف في outbox. اكتب «حذف» للتأكيد.
          </Text>
          <TextField
            value={deleteConfirm}
            onChangeText={setDeleteConfirm}
            placeholder="اكتب حذف"
          />
          <Button
            label={deleting ? "جاري الحذف" : "حذف الحساب"}
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
