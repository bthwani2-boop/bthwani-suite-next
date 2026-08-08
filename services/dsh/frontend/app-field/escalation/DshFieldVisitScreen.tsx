// app-field — DshFieldVisitScreen
// Screen for managing governed field visits and GPS evidence.
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import * as Location from "expo-location";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  InlineNotice,
  StateView,
  Text,
  Header,
  spacing,
  colorRoles,
  radius,
} from "@bthwani/ui-kit";
import {
  useFieldVisitController,
  buildVisitViewModel,
  classifyGovernedError,
  type DshLocationEvidence,
  type GovernedProblem,
} from "../../shared/field-readiness";
import { DshFieldReferenceTag } from "../components/DshFieldReferenceTag";
import {
  DshFieldProblemNotice,
  DshFieldProblemState,
} from "../components/DshFieldProblemNotice";

type Props = {
  readonly storeId: string;
  readonly onBack?: () => void;
  readonly onGoToChecklist?: (visitId: string) => void;
  readonly onGoToVerification?: (visitId: string) => void;
};

/**
 * Thrown as a governed problem rather than a bare Error so a locally detected
 * location refusal carries the same reason code, next action, and retry
 * semantics as the equivalent server refusal.
 */
class FieldLocationProblemError extends Error {
  constructor(readonly problem: GovernedProblem) {
    super(problem.message);
    this.name = "FieldLocationProblemError";
  }
}

/**
 * Resolves the canonical definition for the code (shared with the server-side
 * codes) and only then applies an optional, more specific message.
 */
function rejectLocation(code: string, message?: string): never {
  const canonical = classifyGovernedError({ code });
  throw new FieldLocationProblemError(
    message ? { ...canonical, message } : canonical,
  );
}

async function captureGovernedLocation(): Promise<DshLocationEvidence> {
  const services = await Location.hasServicesEnabledAsync();
  if (!services) rejectLocation("LOCATION_SERVICES_DISABLED");

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") rejectLocation("LOCATION_PERMISSION_DENIED");

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  if (position.mocked === true) rejectLocation("LOCATION_MOCKED");

  const { latitude, longitude, accuracy } = position.coords;
  const isValidLocation =
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
    Number.isFinite(accuracy) && accuracy !== null && accuracy > 0;
  if (!isValidLocation) rejectLocation("LOCATION_REQUIRED");

  if (accuracy && accuracy > 100) {
    rejectLocation(
      "LOCATION_ACCURACY",
      `دقة الموقع الحالية ${Math.round(accuracy)} متر وهي غير كافية. قف في مكان مفتوح بجوار المتجر ثم التقط الموقع مجددًا.`,
    );
  }

  return {
    latitude,
    longitude,
    accuracyMeters: accuracy,
    capturedAt: new Date(position.timestamp).toISOString(),
    provider: "device",
    isMocked: false,
  };
}

function toLocationProblem(error: unknown): GovernedProblem {
  if (error instanceof FieldLocationProblemError) return error.problem;
  return classifyGovernedError(error);
}

export function DshFieldVisitScreen({ storeId, onBack, onGoToChecklist, onGoToVerification }: Props) {
  const identity = useIdentitySession();
  const { listState, actionState, reload, startVisit, completeVisit, resetAction } =
    useFieldVisitController(storeId, identity.state.kind);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationProblem, setLocationProblem] = useState<GovernedProblem | null>(null);

  const hasActiveVisit = useMemo(
    () => listState.kind === "success" && listState.visits.some((visit) => visit.status === "in_progress"),
    [listState],
  );
  const startQueued =
    actionState.kind === "queued" && actionState.operationType === "create_visit";

  const handleCompleteVisit = useCallback(async (visitId: string) => {
    setLocationBusy(true);
    setLocationProblem(null);
    try {
      const completionLocation = await captureGovernedLocation();
      await completeVisit(visitId, { completionLocation });
    } catch (error) {
      setLocationProblem(toLocationProblem(error));
    } finally {
      setLocationBusy(false);
    }
  }, [completeVisit]);

  const handleStartVisit = useCallback(async () => {
    if (hasActiveVisit || startQueued) {
      // Same reason code the server would return, so the employee reads one
      // consistent explanation whichever side detects the conflict.
      setLocationProblem(classifyGovernedError({ code: "VISIT_ALREADY_IN_PROGRESS" }));
      return;
    }
    setLocationBusy(true);
    setLocationProblem(null);
    try {
      const startLocation = await captureGovernedLocation();
      await startVisit({ visitType: "onboarding", startLocation });
    } catch (error) {
      setLocationProblem(toLocationProblem(error));
    } finally {
      setLocationBusy(false);
    }
  }, [hasActiveVisit, startQueued, startVisit]);

  const problemHandlers = useMemo(
    () => ({
      recapture_location: () => void handleStartVisit(),
      refresh_record: () => void reload(),
      refresh_scope: () => void reload(),
    }),
    [handleStartVisit, reload],
  );

  if (identity.state.kind !== "authenticated") {
    return (
      <View style={styles.root}>
        <Header title="تسجيل الدخول مطلوب" {...(onBack ? { onBack } : {})} />
        <StateView
          tone="danger"
          title="تسجيل الدخول مطلوب"
          description="يجب تسجيل دخولك كموظف ميداني للوصول لزيارات تأهيل الشركاء."
          {...(onBack ? { actionLabel: "رجوع", onActionPress: onBack } : {})}
        />
      </View>
    );
  }

  if (listState.kind === "idle" || listState.kind === "loading") {
    return (
      <View style={styles.root}>
        <Header title="زيارات التأهيل الميداني" {...(onBack ? { onBack } : {})} />
        <StateView title="جاري تحميل الزيارات…" loading />
      </View>
    );
  }

  if (listState.kind === "error") {
    return (
      <View style={styles.root}>
        <Header title="زيارات التأهيل الميداني" {...(onBack ? { onBack } : {})} />
        <DshFieldProblemState
          problem={listState.problem}
          handlers={problemHandlers}
          onRetry={() => void reload()}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header title="زيارات التأهيل الميداني" {...(onBack ? { onBack } : {})} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text role="titleMd" style={styles.headerTitle}>زيارات التأهيل الميداني</Text>
            <Button
              label={startQueued ? "محفوظة للمزامنة" : hasActiveVisit ? "زيارة جارية" : "بدء زيارة جديدة"}
              tone="primary"
              disabled={
                actionState.kind === "submitting" ||
                locationBusy ||
                hasActiveVisit ||
                startQueued
              }
              onPress={() => void handleStartVisit()}
            />
          </View>
          <Text role="caption" tone="muted" style={styles.headerSubtitle}>
            الزيارات مرتبطة بمسار اعتماد الشركاء، ويجب أن تعتمد على موقع جهاز حقيقي قابل للتحقق.
          </Text>
        </Card>

        {locationProblem ? (
          <DshFieldProblemNotice
            problem={locationProblem}
            handlers={problemHandlers}
            onRetry={() => void handleStartVisit()}
            onDismiss={() => setLocationProblem(null)}
          />
        ) : null}

        {actionState.kind === "error" ? (
          <DshFieldProblemNotice
            problem={actionState.problem}
            handlers={problemHandlers}
            onRetry={() => void reload()}
            onDismiss={resetAction}
          />
        ) : null}

        {actionState.kind === "queued" ? (
          <InlineNotice
            tone="info"
            title="تم الحفظ وستُزامَن العملية تلقائيًا"
            description={actionState.message}
            action={
              <View style={{ gap: spacing[2], alignItems: "flex-end" }}>
                <DshFieldReferenceTag label="رقم العملية" value={actionState.operationId} />
                <Button label="إغلاق" tone="ghost" onPress={resetAction} />
              </View>
            }
          />
        ) : null}

        {actionState.kind === "success" ? (
          <InlineNotice
            tone="success"
            title={
              actionState.visit.status === "complete"
                ? "تم إكمال الزيارة الميدانية"
                : "تم بدء الزيارة الميدانية بنجاح"
            }
            action={
              <View style={{ flexDirection: "row-reverse", gap: spacing[2] }}>
                {actionState.visit.status === "complete" && onGoToVerification ? (
                  <Button
                    label="رفع نتيجة التحقق"
                    tone="primary"
                    onPress={() => onGoToVerification(actionState.visit.id)}
                  />
                ) : null}
                <Button label="إغلاق" tone="ghost" onPress={resetAction} />
              </View>
            }
          />
        ) : null}

        {listState.kind === "empty" ? (
          <StateView
            title="لا توجد زيارات مسجّلة"
            description="ابدأ أول زيارة ميدانية بعد التحقق من الموقع."
            actionLabel="بدء الزيارة"
            onActionPress={() => void handleStartVisit()}
          />
        ) : null}

        {listState.kind === "success"
          ? listState.visits.map((visit) => {
              const viewModel = buildVisitViewModel(visit);
              return (
                <Card key={viewModel.id} style={styles.visitCard}>
                  <View style={styles.visitRow}>
                    <View style={styles.visitInfo}>
                      <Text role="titleSm" style={styles.visitTitle}>{viewModel.visitTypeLabel}</Text>
                      <Text role="caption" tone="muted" style={styles.visitDate}>{viewModel.startedAt}</Text>
                    </View>
                    <View style={styles.visitActions}>
                      <Badge
                        label={viewModel.statusLabel}
                        tone={viewModel.isComplete ? "success" : viewModel.isInProgress ? "info" : "warning"}
                      />
                      {viewModel.isInProgress ? (
                        <View style={styles.inlineActions}>
                          {onGoToChecklist ? (
                            <Button
                              label="قائمة التحقق"
                              tone="primary"
                              size="sm"
                              onPress={() => onGoToChecklist(viewModel.id)}
                            />
                          ) : null}
                          <Button
                            label="إتمام الزيارة"
                            tone="success"
                            size="sm"
                            disabled={actionState.kind === "submitting" || locationBusy}
                            onPress={() => void handleCompleteVisit(viewModel.id)}
                          />
                        </View>
                      ) : null}
                      {viewModel.isComplete && onGoToVerification ? (
                        <Button
                          label="رفع نتيجة التحقق"
                          tone="primary"
                          size="sm"
                          onPress={() => onGoToVerification(viewModel.id)}
                        />
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })
          : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colorRoles.surfaceBase },
  scroll: { flex: 1 },
  content: { padding: spacing[4], gap: spacing[4] },
  headerCard: {
    padding: spacing[4],
    gap: spacing[2],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  headerRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontWeight: "bold", color: colorRoles.textPrimary },
  headerSubtitle: { textAlign: "right" },
  visitCard: {
    padding: spacing[3],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    marginBottom: spacing[2],
  },
  visitRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  visitInfo: { alignItems: "flex-end" },
  visitTitle: { fontWeight: "bold" },
  visitDate: { marginTop: 2 },
  visitActions: { alignItems: "flex-start", gap: spacing[1] },
  inlineActions: { flexDirection: "row-reverse", gap: spacing[2], marginTop: spacing[2] },
});
