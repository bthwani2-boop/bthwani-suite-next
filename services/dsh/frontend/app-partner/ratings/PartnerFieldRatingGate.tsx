import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Icon, Text, colorRoles, spacing } from "@bthwani/ui-kit";
import {
  fetchPartnerFieldRatingPrompt,
  submitPartnerFieldRating,
  type PartnerFieldRatingPrompt,
} from "../../shared/provider-ratings/provider-ratings.api";

export function PartnerFieldRatingGate({ children }: { readonly children: React.ReactNode }) {
  const [prompt, setPrompt] = React.useState<PartnerFieldRatingPrompt | null>(null);
  const [score, setScore] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetchPartnerFieldRatingPrompt()
      .then((next) => { if (!cancelled) setPrompt(next); })
      .catch(() => { if (!cancelled) setPrompt(null); });
    return () => { cancelled = true; };
  }, []);

  const visible = Boolean(prompt?.eligible && !prompt.completed && !dismissed);

  const submit = async () => {
    if (score < 1 || score > 5) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitPartnerFieldRating(score, comment.trim());
      setPrompt((current) => current ? { ...current, completed: true } : current);
    } catch {
      setError("تعذر حفظ التقييم. تحقق من الاتصال وحاول مجددًا.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
        <View style={styles.overlay}>
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.iconCircle}>
              <Icon name="people-outline" size={28} tone="brand" />
            </View>
            <Text role="titleMd" style={styles.title}>قيّم الميداني</Text>
            <Text role="body" tone="muted" style={styles.description}>
              ظهر متجرك بعد الانضمام والتفعيل. قيّم الميداني الذي ساعد في استكمال رحلة الانضمام{prompt?.partnerName ? ` لمتجر ${prompt.partnerName}` : ""}.
            </Text>

            <View style={styles.stars} accessibilityRole="radiogroup">
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: score === value }}
                  accessibilityLabel={`${value} من 5`}
                  onPress={() => setScore(value)}
                  style={styles.starButton}
                >
                  <Icon name={value <= score ? "star" : "star-outline"} size={34} tone={value <= score ? "brand" : "muted"} />
                </Pressable>
              ))}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="ملاحظة اختيارية"
              placeholderTextColor={colorRoles.textMuted}
              multiline
              maxLength={1000}
              style={styles.input}
              textAlign="right"
            />

            {error ? <Text role="bodySm" tone="danger" style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إرسال تقييم الميداني"
              disabled={score === 0 || submitting}
              onPress={() => void submit()}
              style={[styles.primaryButton, (score === 0 || submitting) && styles.disabled]}
            >
              {submitting ? <ActivityIndicator color={colorRoles.surfaceBase} /> : <Text role="bodyStrong" style={styles.primaryLabel}>إرسال التقييم</Text>}
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
    maxWidth: 480,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: 20,
    padding: spacing[5],
    gap: spacing[3],
    alignItems: "stretch",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorRoles.surfaceMuted,
  },
  title: { textAlign: "center" },
  description: { textAlign: "center", lineHeight: 23 },
  stars: { flexDirection: "row-reverse", justifyContent: "center", gap: spacing[1] },
  starButton: { padding: spacing[1] },
  input: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: 12,
    padding: spacing[3],
    color: colorRoles.textPrimary,
    backgroundColor: colorRoles.surfaceMuted,
  },
  error: { textAlign: "right" },
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
