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

type Props = {
  readonly storeId: string;
  readonly onBack?: () => void;
  readonly onGoToChecklist?: (visitId: string) => void;
  readonly onGoToVerification?: (visitId: string) => void;
};

async function captureGovernedLocation(): Promise<DshLocationEvidence> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("يجب منح صلاحية الموقع لبدء الزيارة أو إكمالها.");
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  if (position.mocked === true) {
    throw new Error("تم رفض الموقع لأن الجهاز أبلغ أنه موقع وهمي.");
  }
  const { latitude, longitude, accuracy } = position.coords;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("إحداثي خط العرض غير صالح.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("إحداثي خط الطول غير صالح.");
  }
  if (!Number.isFinite(accuracy) || accuracy === null || accuracy <= 0) {
    throw new Error("تعذر الحصول على دقة موقع قابلة للتحقق.");
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
        <Header title="تسجيل الدخول مطلوب" />
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
        <Header title="تحميل الزيارات" />
        <StateView title="جاري تحميل الزيارات…" loading />
      </View>
    );
  }

  if (listState.kind === "error") {
    return (
      <View style={styles.root}>
        <Header title="خطأ في التحميل" />
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
      <View style={styles.topActions}>
        {onBack ? <Button label="رجوع" tone="ghost" size="sm" fullWidth={false} onPress={onBack} /> : null}
      </View>
      <Header title="زيارات التأهيل الميداني" />
      <ScrollView
        style={{ flex: 1 }}
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
          <Card style={styles.noticeCard}>
            <View style={styles.noticeRow}>
              <Text tone="danger">{locationError}</Text>
              <Button label="إغلاق" tone="ghost" onPress={() => setLocationError(null)} />
            </View>
          </Card>
        ) : null}

        {actionState.kind === "error" ? (
          <Card style={styles.noticeCard}>
            <View style={styles.noticeRow}>
              <Text tone="danger">{actionState.message}</Text>
              <Button label="إغلاق" tone="ghost" onPress={resetAction} />
            </View>
          </Card>
        ) : null}

        {actionState.kind === "queued" ? (
          <Card style={styles.queuedCard}>
            <View style={styles.noticeRow}>
              <View style={styles.noticeText}>
                <Text tone="warning">{actionState.message}</Text>
                <Text role="caption" tone="muted">المرجع المحلي: {actionState.operationId}</Text>
              </View>
              <Button label="إغلاق" tone="ghost" onPress={resetAction} />
            </View>
          </Card>
        ) : null}

        {actionState.kind === "success" ? (
          <Card style={styles.successCard}>
            <View style={styles.noticeRow}>
              <Text tone="success">
                {actionState.visit.status === "complete"
                  ? "تم إكمال الزيارة الميدانية"
                  : "تم بدء الزيارة الميدانية بنجاح"}
              </Text>
              {actionState.visit.status === "complete" && onGoToVerification ? (
                <Button
                  label="رفع نتيجة التحقق"
                  tone="primary"
                  onPress={() => onGoToVerification(actionState.visit.id)}
                />
              ) : null}
              <Button label="إغلاق" tone="ghost" onPress={resetAction} />
            </View>
          </Card>
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
  topActions: { alignItems: "flex-start", paddingHorizontal: spacing[4], paddingTop: spacing[2] },
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
  noticeCard: { borderColor: colorRoles.danger, borderWidth: 1, padding: spacing[2] },
  queuedCard: { borderColor: colorRoles.warning, borderWidth: 1, padding: spacing[2] },
  successCard: { borderColor: colorRoles.success, borderWidth: 1, padding: spacing[2] },
  noticeRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  noticeText: { flex: 1, gap: spacing[1] },
});
