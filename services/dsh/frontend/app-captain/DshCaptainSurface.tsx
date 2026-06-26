import React, { useState, useMemo } from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
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
} from "../shared/store";
import type { DshDispatchAssignment } from "../shared/dispatch";

// Types
type SimulatedTaskState =
  | "real"
  | "none"
  | "offered"
  | "driver_assigned"
  | "driver_arrived_store"
  | "picked_up"
  | "arrived_customer"
  | "delivered";

type ActiveTab = "home" | "orders" | "wallet" | "support" | "profile";

// Local Custom BottomNavBar for app-captain (matches bthwani premium standard)
type BottomNavItem = {
  id: string;
  label: string;
  icon: string;
};

function LocalBottomNavBar({
  items,
  activeId,
  onSelect,
  launcherLabel = "الخريطة",
  launcherIcon = "🗺️",
  onLauncherPress,
  launcherActive = false,
}: {
  items: readonly BottomNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  launcherLabel?: string;
  launcherIcon?: string;
  onLauncherPress?: () => void;
  launcherActive?: boolean;
}) {
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2, 4);

  return (
    <View style={navStyles.wrapper}>
      <View style={navStyles.bar}>
        <View style={navStyles.row}>
          {leftItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item.id)}
                style={navStyles.navButton}
              >
                <Text style={[navStyles.iconText, isActive && navStyles.activeColor]}>
                  {item.icon}
                </Text>
                <Text style={[navStyles.navLabel, isActive && navStyles.activeColor]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          <View style={navStyles.launcherPlaceholder}>
            <Pressable onPress={onLauncherPress} style={navStyles.launcherLabelArea}>
              <Text style={[navStyles.launcherLabelText, launcherActive && navStyles.activeColor]}>
                {launcherLabel}
              </Text>
            </Pressable>
          </View>
          {rightItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item.id)}
                style={navStyles.navButton}
              >
                <Text style={[navStyles.iconText, isActive && navStyles.activeColor]}>
                  {item.icon}
                </Text>
                <Text style={[navStyles.navLabel, isActive && navStyles.activeColor]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable
        onPress={onLauncherPress}
        style={[navStyles.launcher, launcherActive && navStyles.launcherActive]}
      >
        <Text style={navStyles.launcherIconText}>{launcherIcon}</Text>
      </Pressable>
    </View>
  );
}

// Local Map Layer component simulating the streets and demand zones
function LocalMapLayer({
  isAvailable,
  orderPanelNode,
}: {
  isAvailable: boolean;
  orderPanelNode: React.ReactNode;
}) {
  // Street lines and demand circle layout configs
  return (
    <View style={mapStyles.container}>
      <View style={mapStyles.mapArea}>
        {/* Streets Grid */}
        <View style={[mapStyles.streetLine, { top: 120, left: 60, width: 8, height: 320 }]} />
        <View style={[mapStyles.streetLine, { top: 200, left: 60, right: 60, height: 8 }]} />
        <View style={[mapStyles.streetLine, { top: 320, right: 40, width: 220, height: 8, transform: [{ rotate: "-15deg" }] }]} />
        <View style={[mapStyles.streetLine, { bottom: 160, left: 100, right: 40, height: 8, transform: [{ rotate: "10deg" }] }]} />

        {/* Demand Zones Overlay (Pink & Blue Circles from Donor) */}
        <View style={[mapStyles.demandZone, { top: 60, right: 40, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255, 80, 13, 0.16)", borderColor: "rgba(255, 80, 13, 0.12)" }]} />
        <View style={[mapStyles.demandZone, { top: 210, left: 30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255, 80, 13, 0.10)", borderColor: "rgba(255, 80, 13, 0.08)" }]} />
        <View style={[mapStyles.demandZone, { bottom: 120, right: 80, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(10, 47, 92, 0.12)", borderColor: "rgba(10, 47, 92, 0.08)" }]} />

        {/* Captain Location Center Dot */}
        {isAvailable && (
          <View style={[mapStyles.captainDot, { top: 194, left: 180 }]}>
            <View style={mapStyles.captainDotInner} />
          </View>
        )}
      </View>
      <View style={mapStyles.orderPanelFloat}>{orderPanelNode}</View>
    </View>
  );
}

// MAIN SURFACE
export function DshCaptainSurface() {
  const identity = useIdentitySession();
  const deliveryController = useCaptainDeliveryController();
  
  // Unconditional hook initialization to respect React Rules of Hooks
  const storeController = useStoreRoleContextController("captain", identity.state.kind);

  // Simulation states
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isSimulatedGpsDisabled, setIsSimulatedGpsDisabled] = useState(false);
  const [simulatedTaskState, setSimulatedTaskState] = useState<SimulatedTaskState>("real");
  const [showSimPanel, setShowSimPanel] = useState(false);

  // Tab and form states
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [activeOrderExpanded, setActiveOrderExpanded] = useState(false);
  const [storeReason, setStoreReason] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [proofCode, setProofCode] = useState("");

  // Auth Guard
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

  // Offline Guard
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

  // GPS Guard
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

  // Resolve assignments
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

  // Build history lists
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

  // Nav Items definition
  const bottomNavItems = [
    { id: "orders", label: "الطلبات", icon: "📋" },
    { id: "wallet", label: "المحفظة", icon: "💳" },
    { id: "support", label: "الدعم", icon: "💬" },
    { id: "profile", label: "حسابي", icon: "👤" },
  ] as const;

  // Render Order panel to float on top of map
  const renderHomeOrderPanel = () => {
    if (!activeAssignment) {
      return (
        <Card style={styles.floatingPanel}>
          <View style={styles.compactPanelHeader}>
            <Badge label="مستعد للطلبات" tone="success" />
            <Text role="bodyStrong">في انتظار الطلب التالي</Text>
          </View>
          <Text role="caption" tone="muted" align="start">
            تغطية الرحلات والطلب نشط في منطقتك الحالية.
          </Text>
          <Button
            size="sm"
            label="تحديث يدوي"
            tone="secondary"
            onPress={deliveryController.reload}
          />
        </Card>
      );
    }

    const vm = toDispatchCardViewModel(activeAssignment);
    const deliveryStatus = activeAssignment.delivery.status;

    if (activeOrderExpanded) {
      return (
        <Card style={styles.floatingPanel}>
          <View style={styles.expandedHeader}>
            <View style={styles.titleBlock}>
              <Text role="caption" tone="muted">الطلب النشط</Text>
              <Text role="bodyStrong">{vm.orderLabel}</Text>
            </View>
            <Button
              size="sm"
              tone="ghost"
              label="طي"
              onPress={() => setActiveOrderExpanded(false)}
            />
          </View>

          <View style={styles.expandedDetails}>
            <ListItem title="الاستلام من المتجر" subtitle="سوبر ماركت النخبة النموذجية" />
            <ListItem title="التسليم للعميل" subtitle="حي الياسمين، الرياض" />
            <ListItem title="حالة التوصيل الحالية" subtitle={vm.deliveryLabel} />
            <ListItem title="الإجراء التالي للمهمة" subtitle={vm.nextActionLabel} />

            {/* Custom Visual Journey Timeline */}
            <View style={styles.timelineContainer}>
              <Text role="caption" tone="secondary" align="start">تتبع المسار:</Text>
              <View style={styles.timeline}>
                {vm.timeline.map((step) => (
                  <Badge
                    key={step.id}
                    label={step.label}
                    tone={step.complete ? "success" : "neutral"}
                  />
                ))}
              </View>
            </View>

            {/* Operations CTA Panel */}
            <View style={styles.actionPanel}>
              {activeAssignment.status === "offered" && (
                <View style={styles.stack}>
                  <TextField
                    label="ملاحظة الرفض الاختيارية"
                    value={declineReason}
                    onChangeText={setDeclineReason}
                    placeholder="اكتب سبب الرفض عند الرغبة..."
                  />
                  <View style={styles.buttonRow}>
                    <Button
                      label="قبول المهمة"
                      tone="success"
                      onPress={() => handleAccept(activeAssignment!.id)}
                    />
                    <Button
                      label="رفض العرض"
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
                      label="رمز إثبات التسليم (OTP)"
                      value={proofCode}
                      onChangeText={setProofCode}
                      placeholder="OTP-9988"
                    />
                    <Button
                      label="تأكيد وتسليم الشحنة"
                      tone="success"
                      disabled={proofCode.trim().length < 2}
                      onPress={() => handleProof(activeAssignment!.id)}
                    />
                  </View>
                )}

              {deliveryStatus === "delivered" && (
                <View style={styles.successStateAlert}>
                  <Text tone="success" role="bodyStrong" align="center">
                    ✓ تم اكتمال مهمة التوصيل بنجاح.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
      );
    }

    return (
      <Card style={styles.floatingPanel}>
        <View style={styles.compactPanelHeader}>
          <View style={styles.titleBlock}>
            <View style={styles.compactBadgeRow}>
              <Badge label="نشط" tone="success" />
              <Text role="bodyStrong">{vm.orderLabel}</Text>
            </View>
            <Text role="bodySm" tone="secondary" align="start">
              Burger Lab ➔ العميل
            </Text>
          </View>
          <Button
            size="sm"
            tone="secondary"
            label="توسيع"
            onPress={() => setActiveOrderExpanded(true)}
          />
        </View>
      </Card>
    );
  };

  // Render other tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case "orders":
        return (
          <ScrollScreen>
            <Header title="سجل الطلبات والمهام" subtitle="عرض العمليات السابقة والمكتملة" />
            <View style={styles.tabContainer}>
              {completedAssignments.map((assignment) => {
                const vm = toDispatchCardViewModel(assignment as any);
                return (
                  <Card key={assignment.id} style={styles.cardPadding}>
                    <View style={styles.row}>
                      <View style={styles.titleBlock}>
                        <Text role="bodyStrong" align="start">{vm.orderLabel}</Text>
                        <Text role="caption" tone="secondary" align="start">
                          مكتمل: {new Date(assignment.updatedAt).toLocaleDateString("ar-SA")}
                        </Text>
                      </View>
                      <Badge
                        label={assignment.status === "completed" ? "مكتملة" : "مرفوضة"}
                        tone={assignment.status === "completed" ? "success" : "danger"}
                      />
                    </View>
                    <ListItem title="إثبات التسليم" subtitle={vm.proofLabel} />
                  </Card>
                );
              })}
            </View>
          </ScrollScreen>
        );

      case "wallet":
        return (
          <ScrollScreen>
            <Header title="المحفظة الرقمية" subtitle="مستحقات وتأمين كابتن التوصيل" />
            <View style={styles.tabContainer}>
              <Card style={styles.cardPadding}>
                <Text role="titleMd" align="start">الرصيد المتاح للسحب</Text>
                <Text role="titleLg" tone="success" align="start" style={styles.balanceText}>
                  185.50 ر.س
                </Text>
                <ListItem title="COD مستلم ذمة مالية" subtitle="0.00 ر.س" />
                <ListItem title="عمولة التطبيق" subtitle="15%" />
              </Card>
            </View>
          </ScrollScreen>
        );

      case "support":
        return (
          <ScrollScreen>
            <Header title="مركز دعم الكابتن" subtitle="التواصل، الجاهزية والتعليمات" />
            <View style={styles.tabContainer}>
              <Card style={styles.cardPadding}>
                <Text role="titleMd" align="start">جاهزية نقطة الاستلام</Text>
                <TextField
                  label="تقرير عوائق المتجر"
                  value={storeReason}
                  onChangeText={setStoreReason}
                  placeholder="ملاحظات جاهزية المتجر..."
                />
                <View style={styles.buttonRow}>
                  <Button
                    label="المتجر جاهز"
                    tone="success"
                    onPress={() => {
                      alert("تم حفظ التقرير");
                      setStoreReason("");
                    }}
                  />
                  <Button
                    label="يوجد عائق"
                    tone="danger"
                    onPress={() => {
                      alert("تم الإبلاغ عن العائق");
                      setStoreReason("");
                    }}
                  />
                </View>
              </Card>
            </View>
          </ScrollScreen>
        );

      case "profile":
        return (
          <ScrollScreen>
            <Header title="الملف الشخصي للكابتن" subtitle="بيانات الهوية ومحاكاة المطور" />
            <View style={styles.tabContainer}>
              <Card style={styles.cardPadding}>
                <ListItem title="معرف الكابتن" subtitle={captainUsername} />
                <ListItem title="البريد الإلكتروني" subtitle="captain@bthwani.com" />
                <Button
                  label="تسجيل الخروج"
                  tone="danger"
                  onPress={() => void identity.logout()}
                />
              </Card>

              {/* Developer Panel */}
              <View style={styles.simPanelContainer}>
                <Button
                  label={showSimPanel ? "إخفاء محاكاة الحالات" : "عرض محاكاة الحالات التشغيلية 🛠"}
                  tone="secondary"
                  size="sm"
                  onPress={() => setShowSimPanel(!showSimPanel)}
                />
                {showSimPanel && (
                  <Card style={styles.simPanelCard}>
                    <Text role="bodyStrong" align="start">الأعطال والشبكة:</Text>
                    <View style={styles.simButtonsRow}>
                      <Button
                        label={isSimulatedOffline ? "تعطيل Offline" : "محاكاة Offline"}
                        tone={isSimulatedOffline ? "success" : "danger"}
                        size="sm"
                        onPress={() => setIsSimulatedOffline(!isSimulatedOffline)}
                      />
                      <Button
                        label={isSimulatedGpsDisabled ? "تعطيل الموقع" : "تعطيل الـ GPS"}
                        tone={isSimulatedGpsDisabled ? "success" : "danger"}
                        size="sm"
                        onPress={() => setIsSimulatedGpsDisabled(!isSimulatedGpsDisabled)}
                      />
                    </View>

                    <Text role="bodyStrong" align="start" style={styles.simPanelTextMargin}>
                      محاكاة دورة الشحنة:
                    </Text>
                    <View style={styles.simStateGrid}>
                      {[
                        { id: "real", label: "الحقيقي" },
                        { id: "none", label: "لا توجد مهمة" },
                        { id: "offered", label: "عرض جديد" },
                        { id: "driver_assigned", label: "توجه للمتجر" },
                        { id: "driver_arrived_store", label: "وصل للمتجر" },
                        { id: "picked_up", label: "جاري التوصيل" },
                        { id: "arrived_customer", label: "وصل للعميل" },
                        { id: "delivered", label: "مسلمة ومكتملة" },
                      ].map((st) => (
                        <Button
                          key={st.id}
                          label={st.label}
                          tone={simulatedTaskState === st.id ? "primary" : "secondary"}
                          size="sm"
                          onPress={() => setSimulatedTaskState(st.id as any)}
                        />
                      ))}
                    </View>
                  </Card>
                )}
              </View>
            </View>
          </ScrollScreen>
        );

      default:
        return null;
    }
  };

  const hasActiveMission = Boolean(activeAssignment);

  return (
    <View style={styles.rootWrapper}>
      {/* Top Header */}
      <Header
        title="سطح تشغيل الكابتن"
        subtitle={hasActiveMission ? "مهمة نشطة قيد التشغيل" : "جاهز لتلقي الطلبات الجديدة"}
        actions={
          <View style={styles.headerRight}>
            <Badge
              label={hasActiveMission ? "في مهمة" : "نشط ومتاح"}
              tone={hasActiveMission ? "info" : "success"}
            />
            {simulatedTaskState !== "real" && (
              <Badge label="محاكاة" tone="warning" />
            )}
          </View>
        }
      />

      {/* Body Area */}
      <View style={styles.bodyWrapper}>
        {activeTab === "home" ? (
          <LocalMapLayer
            isAvailable={true}
            orderPanelNode={renderHomeOrderPanel()}
          />
        ) : (
          renderTabContent()
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <LocalBottomNavBar
        items={bottomNavItems}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as any)}
        onLauncherPress={() => {
          setActiveTab("home");
        }}
        launcherActive={activeTab === "home"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: "#FFFCF8", // lightTheme warm background
  },
  bodyWrapper: {
    flex: 1,
    position: "relative",
    paddingBottom: 64 + 16, // bottom nav bar clearance
  },
  floatingPanel: {
    padding: spacing[3],
    marginHorizontal: spacing[3],
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0A2F5C",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  compactPanelHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[2],
  },
  compactBadgeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[2],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[1],
  },
  expandedHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10, 47, 92, 0.08)",
    paddingBottom: spacing[2],
    marginBottom: spacing[2],
  },
  expandedDetails: {
    gap: spacing[2],
  },
  timelineContainer: {
    gap: spacing[1],
    marginTop: spacing[2],
  },
  timeline: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[1],
    marginTop: spacing[1],
  },
  actionPanel: {
    borderTopWidth: 1,
    borderTopColor: "rgba(10, 47, 92, 0.08)",
    paddingTop: spacing[3],
    marginTop: spacing[2],
  },
  stack: {
    gap: spacing[2],
  },
  buttonRow: {
    flexDirection: "row-reverse",
    gap: spacing[2],
  },
  successStateAlert: {
    backgroundColor: "rgba(31, 139, 76, 0.08)",
    padding: spacing[2],
    borderRadius: 8,
    alignItems: "center",
  },
  tabContainer: {
    padding: spacing[4],
    gap: spacing[4],
  },
  cardPadding: {
    padding: spacing[4],
    gap: spacing[3],
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  balanceText: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
    fontSize: 28,
    fontWeight: "800",
  },
  headerRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing[2],
  },
  simPanelContainer: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
  simPanelCard: {
    padding: spacing[4],
    gap: spacing[3],
  },
  simButtonsRow: {
    flexDirection: "row-reverse",
    gap: spacing[2],
  },
  simPanelTextMargin: {
    marginTop: spacing[2],
  },
  simStateGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing[2],
  },
});

const navStyles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 16,
  },
  row: {
    flex: 1,
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: spacing[2],
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconText: {
    fontSize: 18,
    color: "#64748B",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  activeColor: {
    color: "#FF500D", // brandAction orange
  },
  launcherPlaceholder: {
    width: 68,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  launcherLabelArea: {
    marginTop: 28,
  },
  launcherLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  launcher: {
    position: "absolute",
    top: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF500D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#FF500D",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  launcherActive: {
    backgroundColor: "#0A2F5C", // active launcher dark blue
    shadowColor: "#0A2F5C",
  },
  launcherIconText: {
    fontSize: 22,
  },
});

const mapStyles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  mapArea: {
    flex: 1,
    backgroundColor: "#F8F5F0", // lightTheme surfaceMuted background
    position: "relative",
  },
  streetLine: {
    position: "absolute",
    backgroundColor: "rgba(10, 47, 92, 0.08)",
    borderRadius: 4,
  },
  demandZone: {
    position: "absolute",
    borderWidth: 1,
  },
  captainDot: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0A2F5C",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  captainDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF500D",
  },
  orderPanelFloat: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    zIndex: 100,
  },
});
