import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { Icon, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import {
  fetchClientOrderRatingPrompt,
  fetchPendingClientOrderRatingPrompt,
  submitClientOrderRatings,
  type ClientOrderRatingPrompt,
} from "../../shared/provider-ratings/provider-ratings.api";
import {
  clearClientOrderRatingAttempt,
  getOrCreateClientOrderRatingAttempt,
} from "../../shared/provider-ratings/client-order-rating-attempt";

function StarSelector(props: { readonly label: string; readonly value: number; readonly onChange: (value: number) => void }) {
  return (
    <View style={styles.ratingGroup}>
      <Text role="bodyStrong" style={styles.groupLabel}>{props.label}</Text>
      <View style={styles.stars} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: props.value === value }}
            accessibilityLabel={`${props.label}: ${value} من 5`}
            onPress={() => props.onChange(value)}
            style={styles.starButton}
          >
            <Icon name={value <= props.value ? "star" : "star-outline"} size={32} tone={value <= props.value ? "brand" : "muted"} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ClientOrderRatingGate({ children }: { readonly children: React.ReactNode }) {
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const [prompt, setPrompt] = React.useState<ClientOrderRatingPrompt | null>(null);
  const [captainScore, setCaptainScore] = React.useState(0);
  const [orderScore, setOrderScore] = React.useState(0);
  const [captainComment, setCaptainComment] = React.useState("");
  const [orderComment, setOrderComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [promptLoadError, setPromptLoadError] = React.useState<string | null>(null);

  const loadPrompt = React.useCallback(async () => {
    if (!actorId) {
      setPrompt(null);
      setPromptLoadError(null);
      return;
    }
    try {
      setPromptLoadError(null);
      setPrompt(await fetchPendingClientOrderRatingPrompt());
    } catch {
      setPrompt(null);
      setPromptLoadError("تعذر التحقق من التقييمات المعلقة حاليًا.");
    }
  }, [actorId]);

  React.useEffect(() => { void loadPrompt(); }, [loadPrompt]);

  const visible = Boolean(prompt?.eligible && !prompt.completed && !dismissed);
  const canSubmit = captainScore > 0 && orderScore > 0 && !submitting;

  const submit = async () => {
    if (!prompt?.orderId || !canSubmit) return;
    if (!actorId) {
      setError("يجب تسجيل الدخول قبل حفظ التقييم.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const input = {
      captainScore,
      orderScore,
      captainComment: captainComment.trim(),
      orderComment: orderComment.trim(),
    };
    try {
      const attempt = await getOrCreateClientOrderRatingAttempt(actorId, prompt.orderId, input);
      await submitClientOrderRatings(prompt.orderId, input, attempt.context);
      const readback = await fetchClientOrderRatingPrompt(prompt.orderId);
      if (!readback.completed || !readback.captainRated || !readback.orderRated) {
        throw new Error("client order rating canonical readback is incomplete");
      }
      await clearClientOrderRatingAttempt(actorId, prompt.orderId, attempt.signature);
      setPrompt((current) => current ? { ...current, completed: true, captainRated: true, orderRated: true } : current);
    } catch {
      setError("تعذر حفظ تقييم الطلب والكابتن. حاول مجددًا.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {children}
      {promptLoadError ? (
        <View style={styles.promptError} accessibilityLiveRegion="polite">
          <Text role="bodySm" tone="danger">{promptLoadError}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="إعادة التحقق من التقييمات" onPress={() => void loadPrompt()}>
            <Text role="bodySm" tone="action">إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : null}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setDismissed(true)}>
        <View style={styles.overlay}>
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.iconCircle}>
              <Icon name="checkmark-circle-outline" size={30} tone="brand" />
            </View>
            <Text role="titleMd" style={styles.title}>تم استلام طلبك</Text>
            <Text role="body" tone="muted" style={styles.description}>
              قيّم الكابتن والطلب{prompt?.orderNumber ? ` رقم ${prompt.orderNumber}` : ""}. لا يظهر التقييم إلا بعد تحقق DSH من التسليم وملكية الطلب.
            </Text>

            <StarSelector label="تقييم الكابتن" value={captainScore} onChange={setCaptainScore} />
            <TextInput
              value={captainComment}
              onChangeText={setCaptainComment}
              placeholder="ملاحظة عن الكابتن (اختيارية)"
              placeholderTextColor={colorRoles.textMuted}
              maxLength={1000}
              style={styles.input}
              textAlign="right"
            />

            <StarSelector label="تقييم الطلب" value={orderScore} onChange={setOrderScore} />
            <TextInput
              value={orderComment}
              onChangeText={setOrderComment}
              placeholder="ملاحظة عن الطلب (اختيارية)"
              placeholderTextColor={colorRoles.textMuted}
              maxLength={1000}
              style={styles.input}
              textAlign="right"
            />

            {error ? <Text role="bodySm" tone="danger" style={styles.error}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إرسال تقييم الكابتن والطلب"
              disabled={!canSubmit}
              onPress={() => void submit()}
              style={[styles.primaryButton, !canSubmit && styles.disabled]}
            >
              {submitting ? <ActivityIndicator color={colorRoles.surfaceBase} /> : <Text role="bodyStrong" style={styles.primaryLabel}>إرسال التقييمين</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setDismissed(true)} style={styles.laterButton}>
              <Text role="bodySm" tone="muted">لاحقًا</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colorRoles.mediaScrimStrong,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[4],
  },
  card: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 20,
    padding: spacing[5],
    gap: spacing[3],
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceMuted,
  },
  title: { textAlign: "center" },
  description: { textAlign: "center", lineHeight: 23 },
  ratingGroup: { gap: spacing[1] },
  groupLabel: { textAlign: "right" },
  stars: { flexDirection: "row-reverse", justifyContent: "center", gap: spacing[1] },
  starButton: { padding: spacing[1] },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 12,
    padding: spacing[3],
    color: colorRoles.textPrimary,
    backgroundColor: colorRoles.surfaceMuted,
  },
  error: { textAlign: "right" },
  promptError: {
    position: "absolute",
    top: spacing[3],
    left: spacing[3],
    right: spacing[3],
    zIndex: 2,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[3],
    borderRadius: 12,
    backgroundColor: colorRoles.surfaceBase,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colorRoles.brandAction,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: colorRoles.surfaceBase },
  disabled: { opacity: 0.45 },
  laterButton: { minHeight: 40, alignItems: "center", justifyContent: "center" },
});
