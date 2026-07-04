import React, { useState, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View, Pressable, ScrollView, TextInput, TouchableOpacity } from "react-native";
import {
  Badge,
  Button,
  LoadingState,
  ScrollScreen,
  StateView,
  Text,
  TopBar,
  Divider,
  Icon,
  Surface,
  colorRoles,
  radius,
  spacing,
  useDirection,
  useTheme,
  KeyValueList,
  Box,
} from "@bthwani/ui-kit";
import { useCheckoutController } from "../../shared/checkout";
import { useCreateOrderController, useClientOrderDetailController } from "../../shared/orders";
import type { DshCart } from "../../shared/cart";
import type { DshCreateIntentInput, DshPaymentMethod } from "../../shared/checkout";

type Props = {
  readonly cart: DshCart;
  readonly deliveryAddress?: string | undefined;
  readonly note?: string | undefined;
  readonly paymentMethod: DshPaymentMethod;
  readonly onSuccess?: ((intentId: string) => void) | undefined;
  readonly onCancel?: (() => void) | undefined;
};

export function CheckoutScreen({ cart, deliveryAddress = "", note = "", paymentMethod, onSuccess, onCancel }: Props) {
  const controller = useCheckoutController();
  const createOrderController = useCreateOrderController();
  const { direction, isRTL } = useDirection();

  useEffect(() => {
    // Automatically submit order on mount (eliminates redundant intermediate confirmation screen)
    const input: DshCreateIntentInput = {
      cartId: cart.id,
      storeId: cart.storeId,
      fulfillmentMode: cart.fulfillmentMode,
      paymentMethod,
      ...(deliveryAddress ? { deliveryAddress } : {}),
      ...(note ? { note } : {}),
    };
    void controller.submit(input);
  }, [cart.id, cart.storeId, cart.fulfillmentMode, paymentMethod, deliveryAddress, note]);

  // Order creation side effect (runs once the payment intent succeeds)
  useEffect(() => {
    if (
      controller.state.kind === "success" &&
      createOrderController.state.kind === "idle"
    ) {
      const { intent } = controller.state;

      const orderInput = {
        checkoutIntentId: intent.id,
      };

      void createOrderController.submit(orderInput);
    }
  }, [controller.state.kind, createOrderController.state.kind, cart, createOrderController.submit]);

  if (controller.state.kind === "idle" || controller.state.kind === "confirming" || controller.state.kind === "loading") {
    return <LoadingState title="جاري معالجة نية الدفع وتأكيد الحجز..." />;
  }

  if (controller.state.kind === "success") {
    const { intent } = controller.state;

    if (createOrderController.state.kind === "submitting") {
      return <LoadingState title="تم تأكيد الدفع! جاري تسجيل الطلب النهائي..." />;
    }

    if (createOrderController.state.kind === "error") {
      return (
        <View style={styles.container}>
          <TopBar title="فشل إنشاء الطلب" {...(onCancel ? { onBack: onCancel } : {})} />
          <ScrollScreen>
            <StateView
              title="عذراً، فشل تسجيل الطلب"
              description={createOrderController.state.message}
              actionLabel="رجوع لتعديل السلة"
              onActionPress={onCancel}
            />
          </ScrollScreen>
        </View>
      );
    }

    if (createOrderController.state.kind === "success") {
      return (
        <ActiveOrderTracker
          orderId={createOrderController.state.order.id}
          wltSessionId={intent.wltPaymentSessionId}
          onSuccess={onSuccess}
          fulfillmentMode={cart.fulfillmentMode}
        />
      );
    }
  }

  if (controller.state.kind === "payment_pending") {
    const { intent } = controller.state;
    return (
      <View style={styles.container}>
        <TopBar title="في انتظار الدفع" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <StateView
            title="في انتظار مرجع الدفع WLT"
            description="أنشأ DSH نية checkout فقط. المتابعة المالية قيد المعالجة من WLT."
            tone="warning"
          />
          <Button
            tone="ghost"
            label="إلغاء نية الطلب"
            onPress={() => void controller.cancel(intent.id)}
            style={styles.cancelBtn}
          />
        </ScrollScreen>
      </View>
    );
  }

  if (controller.state.kind === "blocked_payment_unavailable") {
    return (
      <View style={styles.container}>
        <TopBar title="الدفع غير متاح" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <StateView
            title="WLT غير متاح"
            description="لا يمكن إتمام الطلب بدون مرجع دفع WLT. يرجى المحاولة مرة أخرى عند عودة الخدمة."
            tone="danger"
            actionLabel="رجوع"
            {...(onCancel ? { onActionPress: onCancel } : {})}
          />
        </ScrollScreen>
      </View>
    );
  }

  if (controller.state.kind === "out_of_area") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد التغطية" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <StateView
            title="الموقع خارج نطاق التوصيل"
            description="المتجر لا يقدم خدمات التوصيل للموقع المحدد حالياً."
            tone="danger"
            actionLabel="رجوع للتعديل"
            {...(onCancel ? { onActionPress: onCancel } : {})}
          />
        </ScrollScreen>
      </View>
    );
  }

  if (controller.state.kind === "error") {
    return (
      <View style={styles.container}>
        <TopBar title="فشل الطلب" {...(onCancel ? { onBack: onCancel } : {})} />
        <ScrollScreen>
          <StateView
            title="عذراً، لم نتمكن من إكمال طلبك"
            description={controller.state.message}
            actionLabel="رجوع لتعديل البيانات"
            onActionPress={onCancel}
          />
        </ScrollScreen>
      </View>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Order Tracker component (handles real-time order states & tracking)
// ─────────────────────────────────────────────────────────────────────────────
// Active Order Tracker component (handles real-time order states & tracking)
function ActiveOrderTracker({
  orderId,
  wltSessionId,
  onSuccess,
  fulfillmentMode,
}: {
  readonly orderId: string;
  readonly wltSessionId: string;
  readonly onSuccess?: ((id: string) => void) | undefined;
  readonly fulfillmentMode?: string | undefined;
}) {
  const detailController = useClientOrderDetailController(orderId);
  const { direction, isRTL } = useDirection();

  // Simulated Proximity and Bell States (for testing & 2026 premium feel)
  const [proximityState, setProximityState] = useState<"enroute" | "near_customer" | "at_door" | "bell_rang">("enroute");
  const [bellRang, setBellRang] = useState(false);
  const [customerBellRung, setCustomerBellRung] = useState(false);

  const handleRingCaptainBell = () => {
    setCustomerBellRung(true);
    setChatMessages((prev) => [
      ...prev,
      {
        id: `sys-client-bell-${Date.now()}`,
        sender: "تنبيه الجرس",
        text: "🔔 قمت بقرع جرس الكابتن لتنبيهه بوجودك في موقع الاستلام.",
        time: "الآن",
        side: "center",
      },
    ]);
  };

  // Chat UI is local-only until a real DSH support/chat endpoint is connected.
  const [chatInputValue, setChatInputValue] = useState("");
  const [chatAttachments, setChatAttachments] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; side: "start" | "end" | "center" }>>([
    {
      id: "system-1",
      sender: "نظام المتابعة",
      text: "المراسلة المباشرة غير متاحة لهذا الطلب حتى يتم ربط قناة دعم تشغيلية حقيقية.",
      time: "الآن",
      side: "center"
    }
  ]);

  const [isSupportExpanded, setIsSupportExpanded] = useState(false);
  const [supportReason, setSupportReason] = useState<string | null>(null);
  const [supportNote, setSupportNote] = useState("");
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // Ratings
  const [storeRating, setStoreRating] = useState(0);
  const [captainRating, setCaptainRating] = useState(0);
  const [ratingsSubmitted, setRatingsSubmitted] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Determine current active order status from the real backend only.
  const order = detailController.state.kind === "success" ? detailController.state.order : null;
  const status: string = order ? order.status : "pending";
  const isPickup = fulfillmentMode === "pickup";


  // Derive tracking presentation state from the real backend order status only (no simulated/auto-timed transitions).
  useEffect(() => {
    if (!order) return;
    if (order.status === "picked_up") {
      setProximityState("enroute");
    } else if (order.status === "arrived_customer") {
      setProximityState("bell_rang");
      setBellRang(true);
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === "bell-real-status")) return prev;
        return [
          ...prev,
          {
            id: "bell-real-status",
            sender: "تنبيه الجرس",
            text: "🔔 وصل الكابتن وقام بقرع جرس الوصول لتنبيهك بالاستلام دون كشف رقم هاتفك حفاظاً على الخصوصية.",
            time: "الآن",
            side: "center",
          },
        ];
      });
    } else if (order.status === "delivered") {
      setProximityState("bell_rang");
    }
  }, [order]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages]);

  if (detailController.state.kind === "loading" || !order) {
    return <LoadingState title="جاري الاتصال بالنظام وتتبع حالة الطلب..." />;
  }

  if (detailController.state.kind === "error") {
    return (
      <View style={styles.container}>
        <TopBar title="خطأ في التتبع" />
        <ScrollScreen>
          <StateView
            title="تعذر تحميل حالة الطلب"
            description={detailController.state.message}
            actionLabel="إعادة المحاولة"
            onActionPress={() => void detailController.reload()}
          />
        </ScrollScreen>
      </View>
    );
  }

  // Map status to steps
  const steps = [
    { id: "1", title: "تم استلام الطلب", detail: "تمت العملية المالية وإرسال الطلب للمحل." },
    { id: "2", title: "الطلب تحت التجهيز", detail: "المتجر يقوم بتحضير وتعبئة منتجاتك الآن." },
    { id: "3", title: "الطلب في الطريق إليك", detail: "الكابتن استلم الطلب وهو متوجه لعنوانك." },
    { id: "4", title: "تأكيد الوصول والتسليم", detail: "وصل الكابتن عند الباب، يرجى الاستلام وتأكيد الطلب." },
  ];

  let activeStep = "1";
  let statusText = "تم إرسال الطلب";
  let statusTone: "success" | "action" | "warning" | "danger" = "action";

  if (status === "pending") {
    activeStep = "1";
    statusText = "تم إرسال الطلب";
  } else if (status === "store_accepted" || status === "preparing") {
    activeStep = "2";
    statusText = "قيد التجهيز في المتجر";
  } else if (status === "ready_for_pickup" || status === "driver_assigned" || status === "driver_arrived_store") {
    activeStep = "3";
    statusText = "جاري تعيين الكابتن والتوجه للمحل";
    statusTone = "warning";
  } else if (status === "picked_up") {
    activeStep = "3";
    statusText = "الكابتن في الطريق إليك";
    statusTone = "warning";
  } else if (status === "arrived_customer" || status === "delivered") {
    activeStep = "4";
    statusText = "وصل الكابتن - يرجى الاستلام";
    statusTone = "success";
  } else if (status === "cancelled") {
    statusText = "تم إلغاء الطلب";
    statusTone = "danger";
  }

  const isDelivered = status === "delivered";
  const activeNum = parseInt(activeStep);

  const handleSendMessage = () => {
    if (!chatInputValue.trim() && chatAttachments.length === 0) return;
    const cleanText = chatInputValue.trim();
    const attachmentsLabel = chatAttachments.length ? ` [مرفق: ${chatAttachments.join("، ")}]` : "";
    
    const clientMsg = {
      id: `client-${Date.now()}`,
      sender: "العميل",
      text: `${cleanText || "أرسل مرفقات تواصل"}${attachmentsLabel}`,
      time: "الآن",
      side: "end" as const
    };

    setChatMessages(prev => [...prev, clientMsg]);
    setChatInputValue("");
    setChatAttachments([]);

    setChatMessages(prev => [...prev, {
      id: `support-unavailable-${Date.now()}`,
      sender: "نظام المتابعة",
      text: "لم يتم إرسال الرسالة لأن قناة المحادثة التشغيلية غير مفعلة بعد.",
      time: "الآن",
      side: "center" as const
    }]);
  };

  const toggleAttachment = (kind: string) => {
    setChatAttachments(current =>
      current.includes(kind) ? current.filter(k => k !== kind) : [...current, kind]
    );
  };

  const quickActions = [
    {
      id: "camera",
      label: "كاميرا",
      icon: <Icon name="camera-outline" size={18} color={chatAttachments.includes("camera") ? colorRoles.brandAction : colorRoles.brandStructure} />,
      selected: chatAttachments.includes("camera"),
      disabled: status === "delivered",
      onPress: () => toggleAttachment("camera")
    },
    {
      id: "video",
      label: "فيديو",
      icon: <Icon name="videocam-outline" size={18} color={chatAttachments.includes("video") ? colorRoles.brandAction : colorRoles.brandStructure} />,
      selected: chatAttachments.includes("video"),
      disabled: status === "delivered",
      onPress: () => toggleAttachment("video")
    },
    {
      id: "voice",
      label: "صوت",
      icon: <Icon name="mic-outline" size={18} color={chatAttachments.includes("voice") ? colorRoles.brandAction : colorRoles.brandStructure} />,
      selected: chatAttachments.includes("voice"),
      disabled: status === "delivered",
      onPress: () => toggleAttachment("voice")
    }
  ];

  const supportIssues = [
    { id: "delay", label: "تأخر كبير في التوصيل" },
    { id: "wrong_items", label: "الطلب يحتوي أصنافاً خاطئة" },
    { id: "missing_items", label: "بعض المنتجات ناقصة" },
    { id: "bad_quality", label: "المنتج تالف أو جودته سيئة" },
    { id: "other", label: "أخرى" }
  ];

  // Support form quick action toggle

  return (
    <View style={styles.container}>
      <TopBar title="تتبع ومتابعة الطلب" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. Operational Status Hero */}
        <Surface tone="action" style={styles.statusHero} gap={2}>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row-reverse", gap: 10, alignItems: "center" }}>
              <View style={styles.pulseIconContainer}>
                <Icon name="pulse-outline" size={24} color={colorRoles.surfaceBase} />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text role="titleMd" style={{ color: colorRoles.surfaceBase, fontWeight: "bold" }}>
                  {isDelivered ? "تم وصول الطلب بنجاح ✓" : "جاري توصيل ومتابعة طلبك"}
                </Text>
                <Text role="caption" style={{ color: "rgba(255, 255, 255, 0.9)", marginTop: 2, fontWeight: "600" }}>
                  رقم الطلب: #DSH-{orderId.slice(0, 8).toUpperCase()}
                </Text>
              </View>
            </View>
            <Badge label={statusText} tone={statusTone === "success" ? "success" : statusTone === "danger" ? "danger" : "action"} />
          </View>

          {/* Smart Bilateral Bell Action inside the hero card */}
          {status !== "delivered" && status !== "cancelled" && (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.12)", paddingTop: 10 }}>
              <TouchableOpacity
                style={[
                  { height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", flexDirection: "row-reverse", gap: 8 },
                  customerBellRung ? { backgroundColor: colorRoles.brandStructure } : { backgroundColor: colorRoles.brandAction }
                ]}
                onPress={handleRingCaptainBell}
                disabled={customerBellRung}
              >
                <Icon name="notifications-active" size={18} color={colorRoles.surfaceBase} />
                <Text role="body" style={{ color: colorRoles.surfaceBase, fontWeight: "bold" }}>
                  {customerBellRung ? "تم رن جرس الكابتن ✓" : "قرع جرس الكابتن 🔔"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Surface>

        {/* 1.1 Doorbell Alert Banner (Rings to catch attention without showing phone number) */}
        {bellRang && (
          <Surface tone="action" style={styles.bellAlertCard}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
              <View style={styles.bellPulseOutline}>
                <Icon name="notifications" size={24} color={colorRoles.surfaceBase} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text role="bodyStrong" style={{ color: colorRoles.surfaceBase, fontWeight: "bold" }}>قرع الكابتن جرس الوصول! 🔔</Text>
                <Text role="caption" style={{ color: "rgba(255, 255, 255, 0.9)", marginTop: 2 }}>
                  تنبيه: الكابتن عند الباب الآن وبانتظارك لاستلام الطلب (حفاظاً على خصوصية رقمك الفعلي).
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* 1.2 Smart Proximity Card (Pulsing details showing distance and ETA) */}
        {!isPickup && (status === "picked_up" || status === "arrived_customer" || status === "delivered") && (
          <Surface
            tone={proximityState === "bell_rang" ? "action" : proximityState === "at_door" ? "success" : proximityState === "near_customer" ? "warning" : "info"}
            style={styles.cardFrame}
          >
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignSelf: "stretch", alignItems: "center" }}>
              <Text role="bodySm" weight="bold" style={{ color: colorRoles.textPrimary }}>حالة اقتراب كابتن التوصيل 🚴</Text>
              <Badge
                label={proximityState === "bell_rang" ? "انتظار عند الباب" : proximityState === "at_door" ? "وصل للبيت" : proximityState === "near_customer" ? "قريب جداً" : "في الطريق"}
                tone={proximityState === "bell_rang" ? "action" : proximityState === "at_door" ? "success" : proximityState === "near_customer" ? "warning" : "info"}
              />
            </View>
            <Box layoutDirection="row" align="center" gap={3} style={{ marginTop: 6, alignSelf: "stretch" }}>
              <Icon
                name={proximityState === "bell_rang" ? "notifications-active" : proximityState === "at_door" ? "home" : proximityState === "near_customer" ? "navigate" : "bicycle"}
                size={22}
                color={proximityState === "bell_rang" ? colorRoles.brandAction : proximityState === "at_door" ? colorRoles.success : proximityState === "near_customer" ? colorRoles.brandAction : colorRoles.brandAction}
              />
              <Text role="bodySm" style={{ flex: 1, textAlign: "right", color: colorRoles.textPrimary }}>
                {proximityState === "bell_rang"
                  ? "تم قرع جرس الباب. الكابتن ينتظرك بالخارج لاستلام الطلب."
                  : proximityState === "at_door"
                    ? "الكابتن يقف عند الباب الآن. استعد لفتح الباب واستلام الطلب."
                    : proximityState === "near_customer"
                      ? "الكابتن على بعد أقل من 500 متر. سيصل خلال دقيقتين."
                      : "انطلق الكابتن بالطلب وهو في طريقه لموقعك المحدد."}
              </Text>
            </Box>
          </Surface>
        )}

        {/* 2. Horizontal Milestones (Correct RTL layout utilizing Box row layout direction) */}
        <Surface tone="default" style={styles.cardFrame}>
          <Text role="bodySm" weight="bold" style={styles.cardLabel}>مراحل الطلب</Text>
          <Box layoutDirection="row" align="center" justify="space-between" style={styles.horizontalMilestonesContainer}>
            <View style={styles.milestonesProgressLine} />
            <View style={[
              styles.milestonesProgressLineActive, 
              isRTL ? { right: "12.5%" } : { left: "12.5%" }, 
              { width: `${(activeNum - 1) * 25.3}%` }
            ]} />
            
            {["تم الطلب", "التجهيز", "في الطريق", "التسليم"].map((label, idx) => {
              const stepIndex = idx + 1;
              const isPassed = stepIndex < activeNum;
              const isCurrent = stepIndex === activeNum;
              return (
                <Box key={label} align="center" style={{ flex: 1, zIndex: 2 }}>
                  <View style={[
                    styles.milestoneDot,
                    isPassed && styles.milestoneDotPassed,
                    isCurrent && styles.milestoneDotCurrent
                  ]}>
                    {isPassed ? (
                      <Icon name="checkmark" size={10} color={colorRoles.surfaceBase} />
                    ) : (
                      <View style={isCurrent ? styles.milestoneDotInnerActive : null} />
                    )}
                  </View>
                  <Text role="caption" style={[
                    styles.milestoneLabel,
                    isCurrent && { color: colorRoles.brandAction, fontWeight: "bold" }
                  ]}>
                    {label}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Surface>

        {/* 3. StageRail (Vertical Timeline with Card Scales) */}
        <Surface tone="default" style={styles.cardFrame}>
          <Text role="bodySm" weight="bold" style={styles.cardLabel}>جدول التتبع التفصيلي</Text>
          <View style={{ gap: 16, marginTop: 12 }}>
            {steps.map((step, index) => {
              const stepNum = index + 1;
              const isDone = stepNum < activeNum || (activeStep === "4" && status === "delivered");
              const isActive = stepNum === activeNum && status !== "delivered";

              return (
                <View key={step.id} style={{ flexDirection: "row-reverse", gap: 12, alignItems: "flex-start" }}>
                  <View style={{ alignItems: "center", width: 28 }}>
                    <View style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isActive && styles.stepCircleActive,
                    ]}>
                      {isDone ? (
                        <Icon name="checkmark-sharp" size={12} color={colorRoles.surfaceBase} />
                      ) : (
                        <Text style={[styles.stepNumberText, isActive && { color: colorRoles.surfaceBase }]}>{stepNum}</Text>
                      )}
                    </View>
                    {index < steps.length - 1 && (
                      <View style={[styles.stepLine, isDone && { backgroundColor: colorRoles.success }]} />
                    )}
                  </View>

                  <View style={[
                    styles.stepCardContent,
                    isActive && styles.stepCardContentActive
                  ]}>
                    <Text role="bodySm" weight={isActive ? "bold" : "regular"} style={[
                      { textAlign: "right", color: colorRoles.textPrimary },
                      isActive && { color: colorRoles.brandAction },
                    ]}>
                      {step.title}
                    </Text>
                    <Text role="caption" style={{ textAlign: "right", color: colorRoles.textSecondary, marginTop: 2 }}>
                      {step.detail}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Surface>

        {/* 4. Smart Tracking Info & Pulse Updates */}
        <Surface tone="raised" style={styles.cardFrame} gap={2}>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text role="bodySm" weight="bold" style={styles.cardLabel}>معلومات الوصول التقديرية</Text>
            <Badge label="تحديث مباشر" tone="success" />
          </View>
          <KeyValueList
            items={[
              { label: "رقم الطلب الموحد", value: `#DSH-${orderId.slice(0, 8).toUpperCase()}`, tone: "action" },
              { label: "معرّف التتبع الكامل", value: orderId },
              { label: "الوقت التقريبي للوصول", value: isDelivered ? "تم التسليم" : status === "arrived_customer" ? "عند الباب حالياً" : "تقريباً 15 دقيقة", tone: isDelivered ? "success" : status === "arrived_customer" ? "warning" : "action" },
              { label: "آلية التتبع", value: "تحديث تلقائي عبر خادم DSH" }
            ]}
          />
        </Surface>

        {/* 5. OrderLinkedChat (Exact Premium Implementation & Unified Communication Box) */}
        <Surface tone="default" style={styles.chatBoxSurface}>
          {/* Header section with title and status */}
          <View style={styles.chatHeader}>
            <View style={{ alignItems: "flex-end" }}>
              <Text role="bodySm" weight="bold" style={{ color: colorRoles.textPrimary }}>مراسلة وتتبع الطلب 💬</Text>
              <Text role="caption" style={{ color: colorRoles.textSecondary }}>صندوق محادثة حي ومفتوح لتوجيه وتعديل التفاصيل.</Text>
            </View>
            <Badge
              label={status === "delivered" ? "الدردشة مقفلة" : "مرتبطة بهذا الطلب"}
              tone={status === "delivered" ? "warning" : "action"}
            />
          </View>

          {/* Captain details built right inside the chat header for a cohesive look */}
          {!isPickup && (
            <View style={styles.captainChatHeader}>
              {status !== "pending" && status !== "store_accepted" && status !== "preparing" ? (
                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <View style={{ flexDirection: "row-reverse", gap: 10, alignItems: "center" }}>
                    <View style={styles.chatAvatar}>
                      <Icon name="bicycle" size={20} color={colorRoles.surfaceBase} />
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text role="bodyStrong" style={{ fontSize: 13, color: colorRoles.textPrimary }}>أحمد الكابتن (مكلّف بالتوصيل)</Text>
                      <Text role="caption" style={{ color: colorRoles.textSecondary }}>دراجة نارية · لوحة: 9548-صنعاء</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.callButton}>
                    <Text style={styles.callButtonText}>اتصال 📞</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row-reverse", gap: 10, alignItems: "center", width: "100%" }}>
                  <View style={[styles.chatAvatar, { backgroundColor: colorRoles.surfaceBase }]}>
                    <Icon name="bicycle" size={20} color={colorRoles.brandStructure} />
                  </View>
                  <View style={{ alignItems: "flex-end", flex: 1, marginRight: 8 }}>
                    <Text role="bodyStrong" style={{ fontSize: 13, color: colorRoles.textSecondary }}>جاري تعيين الكابتن...</Text>
                    <Text role="caption" style={{ color: colorRoles.textMuted }}>سيتواصل معك الكابتن فور خروجه بالطلب.</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Messages list (full scroll view thread history - replica with improvements) */}
          <ScrollView
            ref={scrollRef}
            style={styles.chatThreadArea}
            contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.map((msg) => {
              if (msg.side === "center") {
                return (
                  <View key={msg.id} style={{ alignItems: "center", marginVertical: 4 }}>
                    <View style={styles.systemBubble}>
                      <Text style={styles.systemText}>{msg.text}</Text>
                    </View>
                  </View>
                );
              }
              const isClient = msg.side === "end";
              return (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageBubbleWrapper, 
                    isClient ? styles.messageSelf : styles.messageOther,
                    // Force the actual alignment based on RTL
                    { alignSelf: isClient ? (isRTL ? "flex-start" : "flex-end") : (isRTL ? "flex-end" : "flex-start") }
                  ]}
                >
                  <Surface
                    tone={isClient ? "action" : "inset"}
                    style={[
                      styles.messageBubble,
                      isClient ? styles.messageBubbleSelf : styles.messageBubbleOther
                    ]}
                  >
                    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <Text style={[styles.messageSender, isClient && { color: colorRoles.surfaceBase }]}>{msg.sender}</Text>
                      <Text style={[styles.messageTime, isClient && { color: "rgba(255,255,255,0.7)" }]}>{msg.time}</Text>
                    </View>
                    <Text style={[styles.messageBody, isClient && { color: colorRoles.surfaceBase }]}>{msg.text}</Text>
                  </Surface>
                </View>
              );
            })}
          </ScrollView>

          {/* Attachment preview bar (shows selected quick actions) */}
          {chatAttachments.length > 0 && (
            <View style={styles.attachmentPreviewBar}>
              {chatAttachments.map((att) => (
                <View key={att} style={styles.attachmentBadge}>
                  <Text style={styles.attachmentBadgeText}>
                    {att === "camera" ? "📸 صورة جاهزة للإرفاق" : att === "video" ? "🎥 فيديو جاهز للإرفاق" : "🎙️ تسجيل صوتي"}
                  </Text>
                  <TouchableOpacity onPress={() => toggleAttachment(att)}>
                    <Icon name="close" size={14} color={colorRoles.brandAction} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Composer Input Area (replica with improvements) */}
          <Surface tone="inset" style={styles.chatInputCard}>
            <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                {quickActions.map((action) => (
                  <Pressable
                    key={action.id}
                    disabled={action.disabled}
                    onPress={action.onPress}
                    style={[
                      styles.chatQuickAction,
                      action.selected && styles.chatQuickActionSelected,
                      action.disabled && { opacity: 0.4 }
                    ]}
                  >
                    {action.icon}
                  </Pressable>
                ))}
              </View>
              <Text role="bodySm" style={{ color: colorRoles.textSecondary }}>
                {isPickup ? "مراسلة المتجر" : "رسالة سريعة للكابتن"}
              </Text>
            </View>

            <TextInput
              value={chatInputValue}
              onChangeText={setChatInputValue}
              editable={status !== "delivered"}
              placeholder={status === "delivered" ? "تم إغلاق المحادثة بعد التسليم." : "اكتب رسالة سريعة هنا..."}
              placeholderTextColor={colorRoles.surfaceBase}
              multiline
              numberOfLines={3}
              textAlign="right"
              textAlignVertical="top"
              style={styles.chatTextInput}
            />

            <View style={{ flexDirection: "row-reverse", justifyContent: "flex-start", marginTop: 8 }}>
              <Pressable
                disabled={status === "delivered" || (!chatInputValue.trim() && chatAttachments.length === 0)}
                onPress={handleSendMessage}
                style={[
                  styles.chatSendButton,
                  (chatInputValue.trim() || chatAttachments.length > 0) && styles.chatSendButtonActive
                ]}
              >
                <Icon
                  name={isRTL ? "paper-plane" : "paper-plane-outline"}
                  size={16}
                  color={chatInputValue.trim() || chatAttachments.length > 0 ? colorRoles.surfaceBase : colorRoles.surfaceBase}
                />
              </Pressable>
            </View>
          </Surface>
        </Surface>

        {/* 6. Ratings and Review section (Becomes visible once delivered) */}
        {isDelivered && (
          <Surface tone="raised" style={[styles.cardFrame, { borderColor: colorRoles.success, borderWidth: 1.5 }]}>
            <Text role="bodyStrong" style={{ color: colorRoles.success, textAlign: "right" }}>تقييم خدمات الطلب</Text>
            <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: "right", marginTop: 2 }}>يسعدنا تقييم المتجر وتجربة التوصيل:</Text>
            
            <View style={styles.ratingRow}>
              <Text role="bodySm" style={{ color: colorRoles.textPrimary }}>تقييم المنتجات والمتجر:</Text>
              <View style={{ flexDirection: "row-reverse", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => { setStoreRating(star); setRatingsSubmitted(false); }}>
                    <Icon name={star <= storeRating ? "star" : "star-outline"} size={22} color={colorRoles.brandAction} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {!isPickup && (
              <View style={styles.ratingRow}>
                <Text role="bodySm" style={{ color: colorRoles.textPrimary }}>تقييم كابتن التوصيل:</Text>
                <View style={{ flexDirection: "row-reverse", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => { setCaptainRating(star); setRatingsSubmitted(false); }}>
                      <Icon name={star <= captainRating ? "star" : "star-outline"} size={22} color={colorRoles.brandAction} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Button
              label={ratingsSubmitted ? "تم حفظ التقويم ✓" : "تثبيت تقييم الخدمة"}
              tone={ratingsSubmitted ? "secondary" : "primary"}
              disabled={storeRating === 0 || (!isPickup && captainRating === 0)}
              onPress={() => setRatingsSubmitted(true)}
              style={{ marginTop: 8 }}
            />
          </Surface>
        )}

        {/* 7. Help, Dispute and Support Escalation center */}
        <Surface tone="default" style={styles.cardFrame}>
          <TouchableOpacity onPress={() => setIsSupportExpanded(!isSupportExpanded)} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text role="bodySm" weight="bold" style={styles.cardLabel}>الدعم والمساعدة بالإبلاغ عن مشكلة</Text>
            <Icon name={isSupportExpanded ? "chevron-up" : "chevron-down"} size={18} color={colorRoles.textSecondary} />
          </TouchableOpacity>

          {isSupportExpanded && (
            <View style={{ marginTop: 12, gap: 10 }}>
              {supportSubmitted ? (
                <View style={{ alignItems: "center", paddingVertical: 12 }}>
                  <Icon name="checkmark-circle" size={36} color={colorRoles.success} />
                  <Text role="bodyStrong" style={{ marginTop: 4, color: colorRoles.textPrimary }}>تم رفع التذكرة للدعم</Text>
                  <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: "center", marginTop: 2 }}>
                    تلقينا بلاغك وسيقوم فريق الدعم بمراجعة الطلب والتواصل معك في أقرب وقت.
                  </Text>
                </View>
              ) : (
                <>
                  <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: "right" }}>
                    اختر نوع المشكلة التي تواجهها لمراجعتها فوراً مع الدعم الفني:
                  </Text>
                  <View style={styles.supportChips}>
                    {supportIssues.map((issue) => (
                      <TouchableOpacity
                        key={issue.id}
                        onPress={() => setSupportReason(issue.id)}
                        style={[
                          styles.supportChip,
                          supportReason === issue.id && styles.supportChipActive
                        ]}
                      >
                        <Text style={[
                          styles.supportChipText,
                          supportReason === issue.id && { color: colorRoles.surfaceBase }
                        ]}>
                          {issue.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.supportInput}
                    placeholder="ملاحظات تفصيلية للدعم الفني..."
                    value={supportNote}
                    onChangeText={setSupportNote}
                    multiline
                  />
                  <Button
                    label="إرسال البلاغ للدعم"
                    disabled={!supportReason}
                    onPress={() => setSupportSubmitted(true)}
                  />
                </>
              )}
            </View>
          )}
        </Surface>

        {/* 8. Action Button */}
        <View style={{ marginVertical: 16 }}>
          {isDelivered ? (
            <Button
              tone="primary"
              label="تأكيد استلام الطلب وإغلاقه ✓"
              disabled={storeRating === 0 || (!isPickup && captainRating === 0)}
              onPress={() => onSuccess && onSuccess(orderId)}
              style={styles.primaryBtn}
            />
          ) : (
            <Button
              tone="secondary"
              label="جاري تجهيز وتوصيل طلبك... 🚴"
              disabled
              style={styles.primaryBtn}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceBase,
  },
  cancelBtn: {
    marginTop: spacing[2],
  },
  scrollContent: {
    padding: spacing[4],
    gap: spacing[4],
  },
  cardFrame: {
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    gap: spacing[3],
  },
  cardLabel: {
    color: colorRoles.textPrimary,
    textAlign: "right",
    marginBottom: 4,
  },
  primaryBtn: {
    marginTop: spacing[3],
    height: 50,
    borderRadius: 25,
  },
  statusHero: {
    backgroundColor: colorRoles.brandStructure, // extremely sleek deep slate black
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pulseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  bellAlertCard: {
    backgroundColor: colorRoles.brandAction,
    padding: spacing[4],
    borderRadius: radius.md,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    shadowColor: colorRoles.brandAction,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bellPulseOutline: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  horizontalMilestonesContainer: {
    position: "relative",
    height: 48,
    marginTop: 8,
    alignSelf: "stretch",
  },
  milestonesProgressLine: {
    position: "absolute",
    top: 15,
    left: "12.5%",
    right: "12.5%",
    height: 3,
    backgroundColor: colorRoles.surfaceBase,
    zIndex: 1,
  },
  milestonesProgressLineActive: {
    position: "absolute",
    top: 15,
    height: 3,
    backgroundColor: colorRoles.brandAction,
    zIndex: 1,
  },
  milestoneDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 2,
    borderColor: colorRoles.surfaceBase,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  milestoneDotPassed: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.brandAction,
  },
  milestoneDotCurrent: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.surfaceBase,
  },
  milestoneDotInnerActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colorRoles.brandAction,
  },
  milestoneLabel: {
    fontSize: 10.5,
    color: colorRoles.textSecondary,
    textAlign: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colorRoles.borderStrong,
    backgroundColor: colorRoles.surfaceBase,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  stepCircleDone: {
    backgroundColor: colorRoles.success,
    borderColor: colorRoles.success,
  },
  stepCircleActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colorRoles.textSecondary,
  },
  stepLine: {
    position: "absolute",
    top: 28,
    bottom: -16,
    width: 2,
    backgroundColor: colorRoles.borderSubtle,
    zIndex: 1,
  },
  stepCardContent: {
    flex: 1,
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  stepCardContentActive: {
    transform: [{ scale: 1.02 }],
  },
  chatBoxSurface: {
    padding: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    gap: spacing[3],
  },
  chatHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.surfaceBase,
    paddingBottom: 8,
  },
  captainChatHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colorRoles.surfaceBase,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    marginVertical: 6,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colorRoles.brandAction,
    justifyContent: "center",
    alignItems: "center",
  },
  callButton: {
    backgroundColor: "rgba(29, 78, 216, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.2)",
  },
  callButtonText: {
    fontSize: 12.5,
    fontWeight: "bold",
    color: colorRoles.brandAction,
  },
  chatThreadArea: {
    maxHeight: 380,
    minHeight: 220,
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    marginVertical: 6,
  },
  messageBubbleWrapper: {
    maxWidth: "80%",
    marginBottom: 4,
  },
  messageSelf: {
    alignSelf: "flex-start",
  },
  messageOther: {
    alignSelf: "flex-end",
  },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
  },
  messageBubbleSelf: {
    borderBottomLeftRadius: 2,
    backgroundColor: colorRoles.brandAction,
  },
  messageBubbleOther: {
    borderBottomRightRadius: 2,
    backgroundColor: colorRoles.surfaceBase,
  },
  messageSender: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: colorRoles.textSecondary,
  },
  messageTime: {
    fontSize: 9.5,
    color: colorRoles.textMuted,
    marginLeft: 8,
  },
  messageBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colorRoles.textPrimary,
    textAlign: "right",
    marginTop: 2,
  },
  systemBubble: {
    backgroundColor: colorRoles.surfaceBase,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  systemText: {
    fontSize: 10.5,
    color: colorRoles.textSecondary,
    textAlign: "center",
  },
  quickActionRow: {
    flexDirection: "row-reverse",
    gap: 8,
    marginVertical: 4,
  },
  attachmentPreviewBar: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 6,
  },
  attachmentBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(29, 78, 216, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.2)",
  },
  attachmentBadgeText: {
    fontSize: 11,
    color: colorRoles.brandAction,
  },
  chatInputCard: {
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1.5,
    borderColor: colorRoles.borderStrong,
    marginTop: 4,
  },
  chatQuickAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
  },
  chatQuickActionSelected: {
    borderColor: colorRoles.brandAction,
    backgroundColor: "rgba(29, 78, 216, 0.05)",
  },
  chatTextInput: {
    minHeight: 88,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 6,
    color: colorRoles.textPrimary,
    textAlign: "right",
    fontSize: 13.5,
  },
  chatSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
  },
  chatSendButtonActive: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.brandAction,
  },
  ratingRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  supportChips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  supportChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
  },
  supportChipActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  supportChipText: {
    fontSize: 11,
    color: colorRoles.textSecondary,
  },
  supportInput: {
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    height: 60,
    textAlignVertical: "top",
    textAlign: "right",
    marginTop: 8,
  },
  simulatorHeader: {
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colorRoles.surfaceBase,
    gap: spacing[2],
    marginBottom: 8,
  },
  simulatorRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  simBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colorRoles.surfaceBase,
    backgroundColor: colorRoles.surfaceBase,
    marginBottom: 4,
  },
  simBtnActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  simBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colorRoles.textSecondary,
  },
  bellRingBtn: {
    backgroundColor: "rgba(29, 78, 216, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.2)",
  },
  bellRingBtnActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  bellRingBtnText: {
    fontSize: 12.5,
    fontWeight: "bold",
    color: colorRoles.brandAction,
  },
});
