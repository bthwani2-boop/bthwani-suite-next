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
  type DshLocationEvidence,
} from "../../shared/field-readiness";
import { DshFieldReferenceTag } from "../components/DshFieldReferenceTag";

type Props = {
  readonly storeId: string;
  readonly onBack?: () => void;
  readonly onGoToChecklist?: (visitId: string) => void;
  readonly onGoToVerification?: (visitId: string) => void;
};

async function captureGovernedLocation(): Promise<DshLocationEvidence> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("يجب السماح بالوصول إلى موقعك لبدء الزيارة أو إكمالها.");
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  if (position.mocked === true) {
    throw new Error("تعذر تأكيد موقعك. أوقف أي تطبيق لمحاكاة الموقع وحاول مجددًا.");
  }
  const { latitude, longitude, accuracy } = position.coords;
  const isValidLocation =
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
    Number.isFinite(accuracy) && accuracy !== null && accuracy > 0;
  if (!isValidLocation) {
    throw new Error("تعذر تأكيد موقعك بدقة كافية. تأكد من تفعيل GPS واتصال الإنترنت وحاول من داخل موقع المتجر.");
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

export function DshFieldVisitScreen({ storeId, onBack, onGoToChecklist, onGoToVerification }: Props) {
  const identity = useIdentitySession();
  const { listState, actionState, reload, startVisit, completeVisit, resetAction } =
    useFieldVisitController(storeId, identity.state.kind);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const hasActiveVisit = useMemo(
    () => listState.kind === "success" && listState.visits.some((visit) => visit.status === "in_progress"),
    [listState],
  );
  const startQueued = actionState.kind === "queued" && actionState.message.includes("بدء الزيارة");

  const handleCompleteVisit = useCallback(async (visitId: string) => {
    setLocationBusy(true);
    setLocationError(null);
    try {
      const completionLocation = await captureGovernedLocation();
      await completeVisit(visitId, { completionLocation });
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : String(error));
    } finally {
      setLocationBusy(false);
    }
  }, [completeVisit]);

  const handleStartVisit = useCallback(async () => {
    if (hasActiveVisit || startQueued) {
      setLocationError("توجد زيارة حية أو محفوظة للمزامنة؛ لا يمكن بدء زيارة ثانية للمتجر نفسه.");
      return;
    }
    setLocationBusy(true);
    setLocationError(null);
    try {
      const startLocation = await captureGovernedLocation();
      await startVisit({ visitType: "onboarding", startLocation });
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : String(error));
    } finally {
      setLocationBusy(false);
    }
  }, [hasActiveVisit, startQueued, startVisit]);

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
        <StateView
          tone="danger"
          title="تعذر تحميل الزيارات"
          description={listState.message}
          actionLabel="إعادة المحاولة"
          onActionPress={() => void reload()}
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

        {locationError ? (
          <InlineNotice
            tone="danger"
            title="تعذر تحديد الموقع"
            description={locationError}
            action={<Button label="إغلاق" tone="ghost" onPress={() => setLocationError(null)} />}
          />
        ) : null}

        {actionState.kind === "error" ? (
          <InlineNotice
            tone="danger"
            title="تعذر تنفيذ العملية"
            description={actionState.message}
            action={<Button label="إغلاق" tone="ghost" onPress={resetAction} />}
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
