import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import { devBypassLogin } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  Header,
  ListItem,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  Tabs,
  spacing,
  PermissionState,
  OfflineState,
} from "@bthwani/ui-kit";
import { AuthLoginCard } from "../shared/auth/AuthLoginCard";
import {
  useCaptainDeliveryController,
  toDispatchCardViewModel,
  nextDeliveryStatus,
} from "../shared/dispatch";
import {
  useStoreRoleContextController,
  toStoreRoleStatePresentation,
} from "../shared/store";
import type { DshDispatchAssignment } from "../shared/dispatch";

type SimulatedTaskState =
  | "real"
  | "none"
  | "offered"
  | "driver_assigned"
  | "driver_arrived_store"
  | "picked_up"
  | "arrived_customer"
  | "delivered";

export function DshCaptainSurface() {
  const identity = useIdentitySession();
  const deliveryController = useCaptainDeliveryController();
  
  // Developer simulation states
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isSimulatedGpsDisabled, setIsSimulatedGpsDisabled] = useState(false);
  const [simulatedTaskState, setSimulatedTaskState] = useState<SimulatedTaskState>("real");
  const [showSimPanel, setShowSimPanel] = useState(false);

  // Surface and active tab states
  const [activeTab, setActiveTab] = useState<"operations" | "history">("operations");
  const [storeReason, setStoreReason] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [proofCode, setProofCode] = useState("");

  const storeController = useStoreRoleContextController("captain", identity.state.kind);

  // Authentication Guard
  if (identity.state.kind !== "authenticated") {
    return (
      <ScrollScreen>
        <Header title="دخول الكابتن" subtitle="يرجى تسجيل الدخول للوصول إلى سطح تشغيل الكابتن" />
        <AuthLoginCard
          title="تسجيل دخول الكابتن"
          subtitle="بعد الدخول سيظهر سطح تشغيل الكابتن والمهام المعيّنة لهويتك."
          loading={identity.state.kind === "authenticating"}
          {...(identity.state.kind === "error" ? { error: identity.state.message } : {})}
          onSubmit={(username, password) => void identity.login(username, password)}
          onDevBypass={() => devBypassLogin("captain")}
        />
      </ScrollScreen>
    );
  }

  const captainUsername = identity.state.identity.subject;

  // Connection Guard
  if (isSimulatedOffline) {
    return (
      <ScrollScreen>
        <OfflineState
          title="أنت غير متصل بالإنترنت"
          description="يرجى التحقق من اتصال الشبكة وإعادة المحاولة لتحديث المهام والوصول لسطح التشغيل."
          actionLabel="إعادة المحاولة"
          onActionPress={() => setIsSimulatedOffline(false)}
        />
      </ScrollScreen>
    );
  }

  // Location/GPS Guard
  if (isSimulatedGpsDisabled) {
    return (
      <ScrollScreen>
        <PermissionState
          title="خدمات الموقع الجغرافي معطلة"
          description="يتطلب تطبيق الكابتن تفعيل خدمات الـ GPS لمتابعة الرحلة وإثبات الوصول إلى المتجر والعميل."
          actionLabel="تمكين الوصول للموقع"
          onActionPress={() => setIsSimulatedGpsDisabled(false)}
        />
      </ScrollScreen>
    );
  }

  // Resolve assignments and active mission (real or simulated)
  const assignments =
    deliveryController.state.kind === "success"
      ? deliveryController.state.assignments
      : [];

  const realActiveAssignment = assignments.find(
    (a) => a.status === "offered" || a.status === "accepted"
  );

  let activeAssignment: DshDispatchAssignment | undefined;

  if (simulatedTaskState === "real") {
    activeAssignment = realActiveAssignment;
  } else if (simulatedTaskState !== "none") {
    activeAssignment = {
      id: "asgn-sim-007",
      orderId: "order-sim-2026",
      captainId: captainUsername,
      assignedBy: "operator-sim-001",
      status: simulatedTaskState === "offered" ? "offered" : "accepted",
      responseDeadlineAt: new Date(Date.now() + 600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      delivery: {
        id: "del-sim-007",
        assignmentId: "asgn-sim-007",
        orderId: "order-sim-2026",
        captainId: captainUsername,
        status: (simulatedTaskState === "offered" ? "driver_assigned" : simulatedTaskState) as any,
        podMethod: "code",
        podReference: simulatedTaskState === "delivered" ? "OTP-9988" : "",
        note: "يرجى تسليم الطلب للعميل والتأكد من استلام كود OTP من الجوال.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  // Setup store context controller (relying on real or fallback config)
  const simulatedStoreId = "store-sim-101";
  const activeStoreId = activeAssignment
    ? activeAssignment.id // Use assignment ID or fallback store ID
    : simulatedStoreId;

  // Build completed assignments list
  const completedAssignments =
    simulatedTaskState === "real"
      ? assignments.filter((a) => a.status === "completed" || a.status === "declined")
      : [
          {
            id: "asgn-history-1",
            orderId: "order-prev-556",
            captainId: captainUsername,
            assignedBy: "operator-001",
            status: "completed" as const,
            responseDeadlineAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            delivery: {
              id: "del-prev-556",
              assignmentId: "asgn-history-1",
              orderId: "order-prev-556",
              captainId: captainUsername,
              status: "delivered" as const,
              podMethod: "code",
              podReference: "OTP-8811",
              note: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        ];

  // Action handlers
  const handleAccept = (id: string) => {
    if (simulatedTaskState !== "real") {
      setSimulatedTaskState("driver_assigned");
      return;
    }
    void deliveryController.accept(id);
  };

  const handleDecline = (id: string) => {
    if (simulatedTaskState !== "real") {
      setSimulatedTaskState("none");
      setDeclineReason("");
      return;
    }
    void deliveryController.decline(id, declineReason);
    setDeclineReason("");
  };

  const handleAdvance = (assignment: DshDispatchAssignment) => {
    if (simulatedTaskState !== "real") {
      const nextStatus = nextDeliveryStatus(assignment.delivery.status);
      if (nextStatus) {
        setSimulatedTaskState(nextStatus as any);
      }
      return;
    }
    void deliveryController.advance(assignment.id, assignment.delivery.status);
  };

  const handleProof = (id: string) => {
    if (simulatedTaskState !== "real") {
      setSimulatedTaskState("delivered");
      setProofCode("");
      return;
    }
    void deliveryController.submitProof(id, {
      method: "code",
      reference: proofCode.trim(),
    });
    setProofCode("");
  };

  // Render Header section
  const renderHeader = () => {
    let subtitle = "غير نشط · في انتظار تفعيل الاستقبال";
    let statusLabel = "غير متاح";
    let statusTone: "warning" | "success" | "info" = "warning";

    if (activeAssignment) {
      subtitle = `مهمة نشطة: طلب #${activeAssignment.orderId.slice(-6).toUpperCase()}`;
      statusLabel = activeAssignment.status === "offered" ? "عرض جديد" : "في مهمة";
      statusTone = activeAssignment.status === "offered" ? "warning" : "info";
    } else {
      subtitle = "جاهز لاستلام مهام التوصيل الجديدة";
      statusLabel = "نشط ومتاح";
      statusTone = "success";
    }

    return (
      <Header
        title={`مرحباً، كابتن ${captainUsername}`}
        subtitle={subtitle}
        actions={
          <View style={styles.headerRight}>
            <Badge label={statusLabel} tone={statusTone} />
            {simulatedTaskState !== "real" && (
              <Badge label="محاكاة نشطة" tone="warning" />
            )}
          </View>
        }
      />
    );
  };

  // Render Store checklist and readiness
  const renderStoreReadinessSection = () => {
    if (storeController.state.kind === "loading") {
      return (
        <Card style={styles.storeCard}>
          <Text align="center" tone="secondary">جاري تحميل بيانات الاستلام...</Text>
        </Card>
      );
    }

    const hasRealStore = storeController.state.kind === "success";
    const captainStore = hasRealStore ? storeController.experience?.captain : null;

    // Use actual store data or fallback premium visual values
    const storeName = captainStore?.store.displayName ?? "سوبر ماركت النخبة النموذجية";
    const storeCategory = captainStore?.store.categoryLabel ?? "مواد غذائية وتموينات";
    const storeIsOpen = captainStore?.store.isOpen ?? true;
    const storeWindow = captainStore?.estimatedWindowLabel ?? "15-20 دقيقة";
    const storeAddress = captainStore?.locationLabel ?? "شارع التخصصي، تقاطع العروبة، الرياض";
    const serviceModes = captainStore?.serviceModesLabel ?? "استلام مباشر للسيارة والباب الخلفي";
    const instructions = captainStore?.pickupInstruction ?? "يرجى التوجه إلى الباب الخلفي المخصص للشركاء واستلام الطلب مغلقاً بحافظة الأمان الحرارية.";
    const checks = captainStore?.pickupChecks ?? [
      { id: "check-1", label: "ملاءمة حقيبة التبريد", detail: "الحقيبة الحرارية نظيفة وجاهزة", ready: true },
      { id: "check-2", label: "الموقع الجغرافي للمتجر", detail: "الوصول الفعلي لنقطة الإحداثيات", ready: true },
      { id: "check-3", label: "تطابق رقم الفاتورة والملصق", detail: "التحقق البصري من ملصق الشحنة", ready: false },
    ];

    return (
      <View style={styles.sectionContainer}>
        <Text role="titleSm" align="start">جاهزية نقطة الاستلام</Text>
        <Card>
          <View style={styles.storeCard}>
            <View style={styles.row}>
              <View style={styles.titleBlock}>
                <Text role="titleMd" align="start">{storeName}</Text>
                <Text tone="secondary" role="caption" align="start">{storeCategory}</Text>
              </View>
              <Badge
                label={storeIsOpen ? "مفتوح" : "مغلق"}
                tone={storeIsOpen ? "success" : "danger"}
              />
            </View>

            <View style={styles.badgesRow}>
              <Badge label={`الموقع: ${storeAddress}`} tone="info" />
              <Badge label={`الوقت المتوقع: ${storeWindow}`} tone="neutral" />
            </View>

            <ListItem title="طرق خدمة المتجر" subtitle={serviceModes} />

            {/* Checklist */}
            <View style={styles.checksSection}>
              <Text role="label" tone="secondary" align="start">فحوصات الجاهزية قبل التحرك:</Text>
              {checks.map((check) => (
                <ListItem
                  key={check.id}
                  title={check.label}
                  subtitle={check.detail}
                  trailing={
                    <Badge
                      label={check.ready ? "جاهز" : "معلق"}
                      tone={check.ready ? "success" : "warning"}
                    />
                  }
                />
              ))}
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text role="bodyStrong" align="start">تعليمات المتجر للتوصيل:</Text>
              <Text tone="secondary" role="bodySm" align="start">{instructions}</Text>
            </View>

            {/* Local Store Readiness Report Form */}
            <View style={styles.formContainer}>
              <TextField
                label="تقرير حالة نقطة الاستلام"
                value={storeReason}
                onChangeText={setStoreReason}
                placeholder="اكتب ملاحظات حول الجاهزية أو العوائق..."
              />
              <View style={styles.buttonRow}>
                <Button
                  label="تأكيد جاهزية المتجر"
                  tone="success"
                  disabled={storeReason.trim().length < 3 || storeController.actionState.kind === "submitting"}
                  onPress={() => {
                    if (simulatedTaskState !== "real") {
                      alert("تمت محاكاة تقديم التقرير بنجاح.");
                      setStoreReason("");
                      return;
                    }
                    if (captainStore) {
                      void storeController.submit({
                        kind: "captain",
                        storeId: captainStore.store.id,
                        input: {
                          expectedVersion: captainStore.store.version,
                          readiness: "ready",
                          reason: storeReason.trim(),
                        },
                      });
                      setStoreReason("");
                    }
                  }}
                />
                <Button
                  label="الإبلاغ عن عائق"
                  tone="danger"
                  disabled={storeReason.trim().length < 3 || storeController.actionState.kind === "submitting"}
                  onPress={() => {
                    if (simulatedTaskState !== "real") {
                      alert("تمت محاكاة تقرير عائق المتجر.");
                      setStoreReason("");
                      return;
                    }
                    if (captainStore) {
                      void storeController.submit({
                        kind: "captain",
                        storeId: captainStore.store.id,
                        input: {
                          expectedVersion: captainStore.store.version,
                          readiness: "blocked",
                          reason: storeReason.trim(),
                        },
                      });
                      setStoreReason("");
                    }
                  }}
                />
              </View>
            </View>

            {storeController.actionState.kind === "success" && (
              <Text tone="success" role="bodySm">تم إرسال تقرير المتجر بنجاح.</Text>
            )}
            {storeController.actionState.kind === "error" && (
              <Text tone="danger" role="bodySm">{storeController.actionState.message}</Text>
            )}
          </View>
        </Card>
      </View>
    );
  };

  // Render active mission details and timeline
  const renderActiveMission = () => {
    if (!activeAssignment) {
      return (
        <Card>
          <View style={styles.standbyCard}>
            <Text role="titleLg" align="center">في انتظار الطلب التالي...</Text>
            <Text tone="secondary" align="center" style={styles.standbyText}>
              لا توجد أي مهام نشطة معينة لحسابك حالياً. يمكنك تحديث لوحة العمليات أو الانتقال لوضع الاستعداد لتلقي العروض الفورية.
            </Text>
            <Button
              label="تحديث المهام يدويًا"
              tone="primary"
              onPress={deliveryController.reload}
            />
          </View>
        </Card>
      );
    }

    const vm = toDispatchCardViewModel(activeAssignment);
    const deliveryStatus = activeAssignment.delivery.status;

    // Show store checklist for appropriate pickup phases
    const showStoreChecklist =
      deliveryStatus === "driver_assigned" ||
      deliveryStatus === "driver_arrived_store" ||
      deliveryStatus === "picked_up";

    return (
      <View style={styles.sectionContainer}>
        <Text role="titleSm" align="start">المهمة النشطة الحالية</Text>
        <Card>
          <View style={styles.missionCard}>
            <View style={styles.row}>
              <View style={styles.titleBlock}>
                <Text role="titleLg" align="start">{vm.orderLabel}</Text>
                <Text tone="secondary" role="bodySm" align="start">
                  {vm.nextActionLabel}
                </Text>
              </View>
              <Badge
                label={vm.deliveryLabel}
                tone={deliveryStatus === "delivered" ? "success" : "info"}
              />
            </View>

            {/* Info rows */}
            <ListItem title="رمز العملية الفريد" subtitle={activeAssignment.id} />
            <ListItem title="الوجهة والمستلم" subtitle="العميل: حي الياسمين، فيلا 12، الرياض" />
            <ListItem title="طريقة إثبات التوصيل (PoD)" subtitle="كود OTP رقمي مؤمن لجوال العميل" />

            {/* Custom Visual Journey Progress Timeline */}
            <View style={styles.timelineContainer}>
              <Text role="caption" tone="secondary" align="start">
                دورة تشغيل الرحلة والتقدم:
              </Text>
              <View style={styles.timeline}>
                {vm.timeline.map((step) => (
                  <View key={step.id} style={styles.timelineStep}>
                    <Badge
                      label={step.label}
                      tone={step.complete ? "success" : "neutral"}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Operations Action Area */}
            <View style={styles.actionPanel}>
              {activeAssignment.status === "offered" && (
                <View style={styles.stack}>
                  <TextField
                    label="ملاحظة الرفض الاختيارية"
                    value={declineReason}
                    onChangeText={setDeclineReason}
                    placeholder="اكتب سبب الرفض هنا في حال عدم القبول..."
                  />
                  <View style={styles.buttonRow}>
                    <Button
                      label="قبول المهمة والبدء فوراً"
                      tone="success"
                      onPress={() => handleAccept(activeAssignment!.id)}
                    />
                    <Button
                      label="رفض العرض الحالي"
                      tone="danger"
                      onPress={() => handleDecline(activeAssignment!.id)}
                    />
                  </View>
                </View>
              )}

              {activeAssignment.status === "accepted" &&
                deliveryStatus !== "arrived_customer" &&
                deliveryStatus !== "delivered" && (
                  <Button
                    label={vm.nextActionLabel}
                    tone="primary"
                    fullWidth
                    onPress={() => handleAdvance(activeAssignment!)}
                  />
                )}

              {activeAssignment.status === "accepted" &&
                deliveryStatus === "arrived_customer" && (
                  <View style={styles.stack}>
                    <TextField
                      label="رمز إثبات التسليم للعميل (OTP)"
                      value={proofCode}
                      onChangeText={setProofCode}
                      placeholder="مثال: OTP-9988"
                    />
                    <Button
                      label="تأكيد كود إثبات تسليم الشحنة"
                      tone="success"
                      disabled={proofCode.trim().length < 2}
                      onPress={() => handleProof(activeAssignment!.id)}
                    />
                  </View>
                )}

              {deliveryStatus === "delivered" && (
                <View style={styles.successStateAlert}>
                  <Text tone="success" role="bodyStrong" align="center">
                    ✓ تم اكتمال تسليم الطلب وإثبات التوصيل بنجاح.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {showStoreChecklist && renderStoreReadinessSection()}
      </View>
    );
  };

  // Render History logs list
  const renderHistory = () => {
    if (completedAssignments.length === 0) {
      return (
        <Card>
          <View style={styles.emptyContainer}>
            <Text tone="secondary" align="center">سجل المهام والعمليات فارغ تماماً.</Text>
          </View>
        </Card>
      );
    }

    return (
      <View style={styles.sectionContainer}>
        <Text role="titleSm" align="start">المهام المكتملة والمرفوضة سابقاً</Text>
        {completedAssignments.map((assignment) => {
          const vm = toDispatchCardViewModel(assignment as any);
          return (
            <Card key={assignment.id}>
              <View style={styles.historyCard}>
                <View style={styles.row}>
                  <View style={styles.titleBlock}>
                    <Text role="titleSm" align="start">{vm.orderLabel}</Text>
                    <Text role="caption" tone="secondary" align="start">
                      تاريخ اكتمال المهمة: {new Date(assignment.updatedAt).toLocaleDateString("ar-SA")}
                    </Text>
                  </View>
                  <Badge
                    label={assignment.status === "completed" ? "مكتملة" : "مرفوضة"}
                    tone={assignment.status === "completed" ? "success" : "danger"}
                  />
                </View>
                <ListItem title="إثبات التسليم (PoD)" subtitle={vm.proofLabel} />
              </View>
            </Card>
          );
        })}
      </View>
    );
  };

  // Developer Accordion Simulation Panel
  const renderDeveloperPanel = () => {
    return (
      <View style={styles.simPanelContainer}>
        <Button
          label={showSimPanel ? "إخفاء لوحة محاكاة الحالات" : "عرض لوحة محاكاة الحالات التشغيلية 🛠"}
          tone="secondary"
          size="sm"
          onPress={() => setShowSimPanel(!showSimPanel)}
        />
        {showSimPanel && (
          <Card style={styles.simPanelCard}>
            <View style={styles.simPanelContent}>
              <Text role="bodyStrong" align="start">محاكاة حالات الاتصال والأعطال:</Text>
              <View style={styles.simButtonsRow}>
                <Button
                  label={isSimulatedOffline ? "تعطيل محاكاة Offline" : "محاكاة حالة Offline"}
                  tone={isSimulatedOffline ? "success" : "danger"}
                  size="sm"
                  onPress={() => setIsSimulatedOffline(!isSimulatedOffline)}
                />
                <Button
                  label={isSimulatedGpsDisabled ? "تعطيل محاكاة الموقع" : "محاكاة تعطيل GPS"}
                  tone={isSimulatedGpsDisabled ? "success" : "danger"}
                  size="sm"
                  onPress={() => setIsSimulatedGpsDisabled(!isSimulatedGpsDisabled)}
                />
              </View>

              <Text role="bodyStrong" align="start" style={styles.simPanelTextMargin}>
                تعديل حالة الشحنة النشطة والخطوات التشغيلية:
              </Text>
              <View style={styles.simStateGrid}>
                {[
                  { id: "real", label: "البيانات الحقيقية" },
                  { id: "none", label: "لا توجد مهمة" },
                  { id: "offered", label: "مهمة معروضة" },
                  { id: "driver_assigned", label: "توجه للمتجر" },
                  { id: "driver_arrived_store", label: "وصل للمتجر" },
                  { id: "picked_up", label: "جاري التوصيل" },
                  { id: "arrived_customer", label: "وصل للعميل" },
                  { id: "delivered", label: "مكتملة ومسلمة" },
                ].map((st) => (
                  <Button
                    key={st.id}
                    label={st.label}
                    tone={simulatedTaskState === st.id ? "primary" : "secondary"}
                    size="sm"
                    onPress={() => {
                      setSimulatedTaskState(st.id as any);
                    }}
                  />
                ))}
              </View>
            </View>
          </Card>
        )}
      </View>
    );
  };

  return (
    <ScrollScreen>
      {renderHeader()}
      <View style={styles.container}>
        <Tabs
          items={[
            { id: "operations", label: "لوحة العمليات والمهام" },
            { id: "history", label: "سجل الرحلات المنتهية" },
          ]}
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "operations" | "history")}
        />

        {/* Global actions response messages */}
        {deliveryController.actionState.kind === "error" && (
          <StateView
            tone="danger"
            title="فشل تحديث حالة التوصيل"
            description={deliveryController.actionState.message}
          />
        )}
        {deliveryController.actionState.kind === "success" && (
          <StateView
            tone="success"
            title="تم حفظ التحديث بنجاح"
            description="تم حفظ وتمرير تحديث المهمة الحالية في الخادم."
          />
        )}

        {/* Render Active Operation Tab or History Tab */}
        {activeTab === "operations" ? renderActiveMission() : renderHistory()}

        {/* Developer simulation panel */}
        {renderDeveloperPanel()}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[4],
  },
  headerRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[2],
  },
  sectionContainer: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
  standbyCard: {
    padding: spacing[6],
    alignItems: "center",
    gap: spacing[4],
  },
  standbyText: {
    maxWidth: 440,
    marginTop: spacing[2],
  },
  missionCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  timelineContainer: {
    gap: spacing[2],
    marginTop: spacing[2],
  },
  timeline: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: spacing[1],
  },
  timelineStep: {
    marginVertical: spacing[1],
  },
  actionPanel: {
    marginTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: "rgba(10, 47, 92, 0.08)",
    paddingTop: spacing[3],
  },
  stack: {
    gap: spacing[3],
  },
  buttonRow: {
    flexDirection: "row-reverse",
    gap: spacing[3],
  },
  storeCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  badgesRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  formContainer: {
    marginTop: spacing[2],
    gap: spacing[3],
  },
  checksSection: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  instructionsContainer: {
    backgroundColor: "rgba(10, 47, 92, 0.03)",
    padding: spacing[3],
    borderRadius: 8,
    marginTop: spacing[2],
  },
  historyCard: {
    padding: spacing[4],
    gap: spacing[2],
  },
  emptyContainer: {
    padding: spacing[6],
    alignItems: "center",
  },
  successStateAlert: {
    backgroundColor: "rgba(31, 139, 76, 0.08)",
    padding: spacing[3],
    borderRadius: 8,
    alignItems: "center",
  },
  simPanelContainer: {
    marginTop: spacing[6],
    gap: spacing[2],
  },
  simPanelCard: {
    padding: spacing[4],
  },
  simPanelContent: {
    gap: spacing[2],
  },
  simButtonsRow: {
    flexDirection: "row-reverse",
    gap: spacing[2],
  },
  simPanelTextMargin: {
    marginTop: spacing[3],
  },
  simStateGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});
