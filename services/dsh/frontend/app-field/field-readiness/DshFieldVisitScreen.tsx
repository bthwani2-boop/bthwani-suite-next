import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { useFieldVisitController, buildVisitViewModel } from "../../shared/field-readiness";

type Props = { readonly storeId: string };

export function DshFieldVisitScreen({ storeId }: Props) {
  const identity = useIdentitySession();
  const { listState, actionState, reload, startVisit, completeVisit, resetAction } =
    useFieldVisitController(storeId, identity.state.kind);

  if (identity.state.kind !== "authenticated") {
    return (
      <StateView
        title="تسجيل الدخول مطلوب"
        description="يجب تسجيل دخولك كموظف ميداني للوصول لزيارات المتاجر."
      />
    );
  }

  if (listState.kind === "loading") return <StateView title="جاري تحميل الزيارات…" />;

  if (listState.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل الزيارات"
        description={listState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void reload()}
      />
    );
  }

  return (
    <ScrollScreen>
      <Header
        title="زيارات المتجر الميدانية"
        subtitle="سجّل زيارتك وتابع حالة التأهيل"
        actions={
          <Button
            label="بدء زيارة جديدة"
            tone="primary"
            disabled={actionState.kind === "submitting"}
            onPress={() => void startVisit({ visitType: "onboarding" })}
          />
        }
      />

      {actionState.kind === "error" && (
        <Card>
          <View style={styles.notice}>
            <Text tone="danger">{actionState.message}</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetAction} />
          </View>
        </Card>
      )}

      {actionState.kind === "success" && (
        <Card>
          <View style={styles.notice}>
            <Text tone="success">تم بدء الزيارة بنجاح</Text>
            <Button label="إغلاق" tone="ghost" onPress={resetAction} />
          </View>
        </Card>
      )}

      {listState.kind === "empty" && (
        <StateView title="لا توجد زيارات مسجّلة" description="ابدأ أول زيارة ميدانية لهذا المتجر." />
      )}

      {listState.kind === "success" &&
        listState.visits.map((visit) => {
          const vm = buildVisitViewModel(visit);
          return (
            <Card key={vm.id}>
              <View style={styles.visitRow}>
                <View style={styles.visitInfo}>
                  <Text role="titleSm">{vm.visitTypeLabel}</Text>
                  <Text role="caption" tone="muted">{vm.startedAt}</Text>
                </View>
                <View style={styles.visitActions}>
                  <Badge
                    label={vm.statusLabel}
                    tone={vm.isComplete ? "success" : vm.isInProgress ? "info" : "warning"}
                  />
                  {vm.isInProgress && (
                    <Button
                      label="إتمام الزيارة"
                      tone="success"
                      disabled={actionState.kind === "submitting"}
                      onPress={() => void completeVisit(vm.id)}
                    />
                  )}
                </View>
              </View>
            </Card>
          );
        })}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[3] },
  visitRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: spacing[4] },
  visitInfo: { gap: spacing[1], flex: 1 },
  visitActions: { flexDirection: "row-reverse", alignItems: "center", gap: spacing[2] },
});
