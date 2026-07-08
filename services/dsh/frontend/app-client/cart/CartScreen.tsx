import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, View, Pressable, ScrollView, Platform, Dimensions, Modal, TouchableOpacity } from "react-native";
import {
  Badge,
  Button,
  Card,
  ListItem,
  LoadingState,
  ScrollScreen,
  StateView,
  Text,
  TopBar,
  Divider,
  Icon,
  Surface,
  TextField,
  colorRoles,
  colorPalette,
  alpha,
  statusScale,
  neutralScale,
  radius,
  spacing,
  useDirection,
} from "@bthwani/ui-kit";
import { useCartController, useServiceabilityController } from "../../shared/cart";
import type { DshCart, DshFulfillmentMode } from "../../shared/cart";
import {
  QUICK_ACTION_META,
  RECOMMENDED_ITEMS,
  STORES_LOCATIONS,
  buildCartPriceSummary,
  buildExecutionScheduleOptions,
  coordinatesToCartMapPosition,
  findClosestCartLandmark,
  mapPositionToCartCoordinates,
} from "../../shared/cart/cart-screen-domain";
import type { QuickActionKey } from "../../shared/cart/cart-screen-domain";
import type { DshPaymentMethod } from "../../shared/checkout";
import { useWltDshPaymentController } from "../../shared/finance-wlt-link";
import { PaymentDecisionSection } from "./PaymentDecisionSection";

type Props = {
  readonly storeId: string;
  readonly serviceAreaCode?: string;
  readonly authKind?: "authenticated" | "unauthenticated";
  readonly onProceedToCheckout?: (cart: DshCart, deliveryAddress: string, note: string, paymentMethod: DshPaymentMethod) => void;
  readonly onBrowseCatalog?: () => void;
  readonly onBack?: () => void;
};

function PromoBanner({ onPress }: { onPress: () => void }) {
  return (
    <Surface
      tone="default"
      style={{
        backgroundColor: colorRoles.surfaceBase,
        borderWidth: 1,
        borderColor: colorRoles.surfaceBase,
        borderRadius: radius.md,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, alignItems: "flex-end", paddingLeft: 8 }}>
          <Text role="bodySm" weight="bold" style={{ color: colorRoles.textPrimary, marginBottom: 2 }}>
            اشترك بخدمة بثواني برو
          </Text>
          <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: "right" }}>
            استمتع بتوصيل مجاني غير محدود وعروض حصرية على طلباتك!
          </Text>
        </View>
        <Button
          label="اشترك الآن"
          tone="primary"
          size="sm"
          fullWidth={false}
          onPress={onPress}
          style={{ backgroundColor: colorRoles.brandAction, borderColor: colorRoles.brandAction }}
        />
      </View>
    </Surface>
  );
}



export function CartScreen({
  storeId,
  serviceAreaCode = "",
  authKind = "unauthenticated",
  onProceedToCheckout,
  onBrowseCatalog,
  onBack,
}: Props) {
  const controller = useCartController(storeId, authKind);
  const serviceabilityController = useServiceabilityController();
  const { direction, isRTL } = useDirection();

  // Local state replicas from donor
  const [selectedFulfillmentMode, setSelectedFulfillmentMode] = useState<DshFulfillmentMode>("bthwani_delivery");
  const [deliveryModePickerOpen, setDeliveryModePickerOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [clientAddress, setClientAddress] = useState("صنعاء، حي الأصبحي، شارع المقالح");
  const [note, setNote] = useState("لا يوجد ملاحظة");
  const [extraRequest, setExtraRequest] = useState("");
  const [quickActionKey, setQuickActionKey] = useState<QuickActionKey | null>(null);
  const [quickActionDraft, setQuickActionDraft] = useState("");

  // Scheduling states
  const [scheduling, setScheduling] = useState<"now" | "later">("now");
  const executionScheduleOptions = useMemo(() => buildExecutionScheduleOptions(), []);
  const [scheduledDate, setScheduledDate] = useState(() => executionScheduleOptions.dateOptions[0]?.value ?? "");
  const [scheduledTime, setScheduledTime] = useState(() => executionScheduleOptions.timeOptions[0]?.value ?? "");

  const [checkoutReviewVisible, setCheckoutReviewVisible] = useState(false);

  // Client GPS coordinates for serviceability checks (interactive map state)
  const [clientCoordinates, setClientCoordinates] = useState({
    latitude: 15.3520,
    longitude: 44.1780,
  });
  const [userPinPos, setUserPinPos] = useState({ x: 160, y: 140 });

  const handleCheckServiceability = () => {
    void serviceabilityController.check(
      storeId,
      serviceAreaCode,
      clientCoordinates.latitude,
      clientCoordinates.longitude
    );
  };

  // Sync state with cart when cart is loaded
  useEffect(() => {
    if (controller.state.kind === "success") {
      setSelectedFulfillmentMode(controller.state.cart.fulfillmentMode);
    }
  }, [controller.state]);

  // Autocheck serviceability
  useEffect(() => {
    if (storeId && serviceAreaCode) {
      void serviceabilityController.check(
        storeId,
        serviceAreaCode,
        clientCoordinates.latitude,
        clientCoordinates.longitude
      );
    }
  }, [storeId, serviceAreaCode, clientCoordinates.latitude, clientCoordinates.longitude]);

  if (controller.state.kind === "loading") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <LoadingState title="جاري جلب تفاصيل السلة..." />
      </View>
    );
  }

  if (controller.state.kind === "offline") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <StateView
          title="لا يوجد اتصال بالشبكة"
          description="يرجى التحقق من اتصالك بالإنترنت وأعد المحاولة."
          actionLabel="إعادة المحاولة"
          onActionPress={controller.retry}
        />
      </View>
    );
  }

  if (controller.state.kind === "permission_denied") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <StateView
          title="يلزم تسجيل الدخول"
          description="سجّل دخولك لحفظ منتجاتك والوصول إلى سلتك."
        />
      </View>
    );
  }

  if (controller.state.kind === "error") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <StateView
          title="تعذر تحميل السلة"
          description={controller.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={controller.retry}
        />
      </View>
    );
  }

  if (controller.state.kind === "empty") {
    return (
      <View style={styles.container}>
        <TopBar title="تأكيد الطلب" {...(onBack ? { onBack } : {})} />
        <StateView
          title="سلة التسوق فارغة"
          description="تصفح منتجات المتجر المتميزة وأضفها إلى السلة للبدء."
          {...(onBrowseCatalog ? { actionLabel: "تصفح المنتجات الآن", onActionPress: onBrowseCatalog } : {})}
        />
      </View>
    );
  }

  const { cart } = controller.state;

  const { subtotal, deliveryFee, discount, grandTotal } = buildCartPriceSummary(
    cart.items,
    selectedFulfillmentMode,
    couponCode
  );

  const wltPayment = useWltDshPaymentController(grandTotal);

  const isBlocked = serviceabilityController.serviceability.kind === "blocked";
  const isChecking = serviceabilityController.serviceability.kind === "checking";
  const isServiceable = serviceabilityController.serviceability.kind === "serviceable";

  const toggleDeliveryModePicker = () => setDeliveryModePickerOpen(!deliveryModePickerOpen);

  const openQuickAction = (key: QuickActionKey) => {
    setQuickActionKey(key);
    if (key === "coupon") setQuickActionDraft(couponCode);
    else if (key === "address") setQuickActionDraft(clientAddress);
    else if (key === "note") setQuickActionDraft(note);
    else if (key === "extra") setQuickActionDraft(extraRequest);
  };

  const applyQuickAction = () => {
    if (!quickActionKey) return;
    if (quickActionKey === "coupon") setCouponCode(quickActionDraft);
    else if (quickActionKey === "note") setNote(quickActionDraft);
    else if (quickActionKey === "extra") setExtraRequest(quickActionDraft);
    setQuickActionKey(null);
    setQuickActionDraft("");
  };

  const handleMapPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const nextPosition = {
      x: Math.max(10, Math.min(310, locationX)),
      y: Math.max(10, Math.min(210, locationY)),
    };

    setUserPinPos(nextPosition);
    setQuickActionDraft(findClosestCartLandmark(nextPosition).name);
  };

  const handleLocateMe = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextPosition = coordinatesToCartMapPosition(pos.coords);
          setUserPinPos(nextPosition);
          setQuickActionDraft(findClosestCartLandmark(nextPosition).name);
        },
        () => {
          const fallbackPosition = { x: 160, y: 140 };
          setUserPinPos(fallbackPosition);
          setQuickActionDraft(findClosestCartLandmark(fallbackPosition).name);
        }
      );
    } else {
      const fallbackPosition = { x: 160, y: 140 };
      setUserPinPos(fallbackPosition);
      setQuickActionDraft(findClosestCartLandmark(fallbackPosition).name);
    }
  };

  const applyAddressMapAction = () => {
    const nextCoordinates = mapPositionToCartCoordinates(userPinPos);
    setClientCoordinates(nextCoordinates);
    setClientAddress(quickActionDraft);
    setQuickActionKey(null);

    void serviceabilityController.check(
      storeId,
      serviceAreaCode,
      nextCoordinates.latitude,
      nextCoordinates.longitude
    );
  };

  const handleProceed = () => {
    if (onProceedToCheckout) {
      onProceedToCheckout(
        cart,
        selectedFulfillmentMode === "pickup" ? "" : clientAddress,
        `ملاحظة: ${note} | على طريقي: ${extraRequest || "لا يوجد"} | الجدولة: ${scheduling === "later" ? `${scheduledDate} ${scheduledTime}` : "الآن"}`,
        wltPayment.paymentMethod
      );
    }
  };



  return (
    <View style={styles.container}>
      <TopBar title="تأكيد الطلب" subtitle={`${cart.items.length} منتج`} {...(onBack ? { onBack } : {})} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* بنر العروض والاشتراكات */}
        <PromoBanner onPress={() => alert("تم الاشتراك في بثواني برو!")} />

        {/* سياسة تأكيد الطلب */}
        <Surface tone="inset" style={styles.confirmationBanner}>
          <View style={styles.confirmationHeader}>
            <View style={styles.confirmationHeaderText}>
              <Text role="bodySm" weight="bold" style={styles.confirmationTitle}>سياسة تأكيد الطلب</Text>
              <Text role="caption" style={styles.confirmationDesc}>
                هذه الشاشة تعرض الملخص أولاً، وتفتح المراجعة التفصيلية عند الطلب فقط. الأثر المالي والتسويات يتبع WLT وFinance.
              </Text>
            </View>
            <Text role="caption" weight="black" style={styles.confirmationBadge}>سيادي</Text>
          </View>
        </Surface>

        {/* خيار التوصيل */}
        <Surface tone="default" style={styles.cardFrame}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderMeta}>
              <Icon name="car-outline" size={18} color={colorRoles.textPrimary} style={styles.cardIcon} />
              <View style={styles.cardHeaderTitles}>
                <Text role="bodySm" weight="bold" style={styles.cardLabel}>خيار التوصيل</Text>
                <Text role="caption" style={styles.cardValue}>
                  {selectedFulfillmentMode === "pickup"
                    ? "تم اختيار الاستلام من المتجر"
                    : selectedFulfillmentMode === "partner_delivery"
                    ? "تم اختيار توصيل المتجر"
                    : "تم اختيار توصيل بثواني"}
                </Text>
              </View>
            </View>
            <Button
              label={deliveryModePickerOpen ? "إغلاق" : "تغيير"}
              tone="secondary"
              size="sm"
              fullWidth={false}
              onPress={toggleDeliveryModePicker}
            />
          </View>

          {deliveryModePickerOpen && (
            <View style={styles.pickerOptionsList}>
              {[
                { value: "bthwani_delivery", label: "توصيل بثواني", desc: "التوصيل يتم عبر كابتن بثواني إلى موقع العميل.", icon: "bicycle-outline" },
                { value: "partner_delivery", label: "توصيل المتجر", desc: "التوصيل يتم عبر موصل المتجر إلى موقع العميل.", icon: "storefront-outline" },
                { value: "pickup", label: "استلم بنفسك", desc: "تستلم الطلب من المتجر بنفسك بدون رسوم توصيل.", icon: "walk-outline" },
              ].map((option) => {
                const isSelected = option.value === selectedFulfillmentMode;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setSelectedFulfillmentMode(option.value as DshFulfillmentMode);
                      setDeliveryModePickerOpen(false);
                    }}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                  >
                    <View style={styles.pickerItemContent}>
                      <Icon name={option.icon} size={18} color={isSelected ? colorRoles.brandAction : colorRoles.textPrimary} />
                      <View style={styles.pickerItemMeta}>
                        <Text role="bodySm" weight="bold" style={styles.pickerItemLabel}>{option.label}</Text>
                        <Text role="caption" style={styles.pickerItemDesc}>{option.desc}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Surface>

        {/* الإجراءات السريعة (قسيمة، عنوان، ملاحظات، إضافات) */}
        <Surface tone="default" style={styles.cardFrame}>
          {/* حقل القسيمة */}
          <View style={styles.optionRowContainer}>
            <View style={styles.optionTextContainer}>
              <Text role="bodySm" weight="bold" style={styles.optionTitle}>هل لديك قسيمة تخفيض؟</Text>
              <Text role="caption" style={styles.optionSubtitle}>
                {couponCode ? `القسيمة النشطة: ${couponCode}` : "أدخل رمز التخفيض إن وجد"}
              </Text>
            </View>
            <Button
              label={couponCode ? "تعديل" : "إضافة"}
              tone="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => openQuickAction("coupon")}
            />
          </View>
          {quickActionKey === "coupon" && (
            <View style={styles.actionEditorBox}>
              <Text role="bodySm" weight="bold" style={styles.editorTitle}>رمز قسيمة التخفيض</Text>
              <TextField value={quickActionDraft} onChangeText={setQuickActionDraft} placeholder="أدخل كود الخصم (مثال: FREE50)" />
              <View style={styles.editorActions}>
                <Button label="تطبيق القسيمة" onPress={applyQuickAction} style={styles.editorSaveBtn} />
                <Button label="إلغاء" tone="secondary" onPress={() => setQuickActionKey(null)} />
              </View>
            </View>
          )}

          <Divider style={styles.divider} />

          {/* حقل العنوان والخريطة */}
          {selectedFulfillmentMode !== "pickup" && (
            <>
              <View style={styles.optionRowContainer}>
                <View style={styles.optionTextContainer}>
                  <Text role="bodySm" weight="bold" style={styles.optionTitle}>موقع التوصيل</Text>
                  <Text role="caption" style={styles.optionSubtitle}>{clientAddress}</Text>
                  <Text role="caption" style={{ color: colorRoles.brandAction }}>
                    الإحداثيات: {clientCoordinates.latitude.toFixed(4)}، {clientCoordinates.longitude.toFixed(4)}
                  </Text>
                </View>
                <Button
                  label="تحديد من الخريطة"
                  tone="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => openQuickAction("address")}
                />
              </View>
              {quickActionKey === "address" && (
                <View style={styles.actionEditorBox}>
                  <Text role="bodySm" weight="bold" style={styles.editorTitle}>تحديد موقعك على الخريطة</Text>
                  
                  <Button
                    label="تحديد موقعي الحالي بالـ GPS 🎯"
                    tone="secondary"
                    size="sm"
                    onPress={handleLocateMe}
                    style={{ alignSelf: "center", marginVertical: 4, width: 320 }}
                  />

                  {/* الخريطة التفاعلية */}
                  <View style={styles.mapContainer}>
                    <Pressable onPress={handleMapPress} style={styles.mapPressable}>
                      {/* Grid / concentric circles background */}
                      <View style={[styles.mapCircle, { width: 100, height: 100, borderRadius: 50, top: 70, left: 110 }]} />
                      <View style={[styles.mapCircle, { width: 200, height: 200, borderRadius: 100, top: 20, left: 60 }]} />
                      
                      {/* Major roads representation */}
                      <View style={[styles.mapRoad, { height: 2, width: "100%", top: 120, left: 0 }]} />
                      <View style={[styles.mapRoad, { width: 2, height: "100%", left: 160, top: 0 }]} />

                      {/* Store Pins */}
                      {STORES_LOCATIONS.map(st => (
                        <View key={st.id} style={[styles.storePin, { top: st.y - 12, left: st.x - 12 }]}>
                          <Icon name="storefront" size={14} color={colorRoles.brandStructure} />
                          <Text style={styles.storePinLabel}>{st.name}</Text>
                        </View>
                      ))}

                      {/* User Pin */}
                      <View style={[styles.userPin, { top: userPinPos.y - 20, left: userPinPos.x - 10 }]}>
                        <View style={styles.userPinPulse} />
                        <Icon name="pin" size={20} color={colorRoles.brandAction} />
                      </View>
                    </Pressable>
                  </View>

                  <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: "right" }}>
                    انقر على الخريطة لتحديد موقعك. سيتم احتساب المسافة الحقيقية للمتجر فورياً.
                  </Text>

                  <TextField
                    value={quickActionDraft}
                    onChangeText={setQuickActionDraft}
                    placeholder="وصف العنوان (مثال: حي الأصبحي، شارع المقالح)"
                    multiline
                  />

                  <View style={styles.editorActions}>
                    <Button label="تأكيد الموقع والعنوان" onPress={applyAddressMapAction} style={styles.editorSaveBtn} />
                    <Button label="إلغاء" tone="secondary" onPress={() => setQuickActionKey(null)} />
                  </View>
                </View>
              )}
              <Divider style={styles.divider} />
            </>
          )}

          {/* حقل الملاحظات */}
          <View style={styles.optionRowContainer}>
            <View style={styles.optionTextContainer}>
              <Text role="bodySm" weight="bold" style={styles.optionTitle}>ملاحظات الطلب</Text>
              <Text role="caption" style={styles.optionSubtitle}>{note}</Text>
            </View>
            <Button
              label={note === "لا يوجد ملاحظة" ? "إضافة" : "تعديل"}
              tone="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => openQuickAction("note")}
            />
          </View>
          {quickActionKey === "note" && (
            <View style={styles.actionEditorBox}>
              <Text role="bodySm" weight="bold" style={styles.editorTitle}>أضف ملاحظات الطلب</Text>
              <TextField value={quickActionDraft} onChangeText={setQuickActionDraft} placeholder="مثال: يرجى الاتصال عند الوصول..." multiline />
              <View style={styles.editorActions}>
                <Button label="حفظ الملاحظة" onPress={applyQuickAction} style={styles.editorSaveBtn} />
                <Button label="إلغاء" tone="secondary" onPress={() => setQuickActionKey(null)} />
              </View>
            </View>
          )}

          {/* على طريقي */}
          {selectedFulfillmentMode === "bthwani_delivery" && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.optionRowContainer}>
                <View style={styles.optionTextContainer}>
                  <Text role="bodySm" weight="bold" style={styles.optionTitle}>على طريقي</Text>
                  <Text role="caption" style={styles.optionSubtitle}>{extraRequest || "أطلب شيئاً بسيطاً من الكابتن"}</Text>
                </View>
                <Button
                  label={extraRequest ? "تعديل" : "إضافة"}
                  tone="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => openQuickAction("extra")}
                />
              </View>
              {quickActionKey === "extra" && (
                <View style={styles.actionEditorBox}>
                  <Text role="bodySm" weight="bold" style={styles.editorTitle}>طلب على طريقي</Text>
                  <TextField value={quickActionDraft} onChangeText={setQuickActionDraft} placeholder="مثال: علبة ماء، مناديل..." />
                  <View style={styles.editorActions}>
                    <Button label="تأكيد" onPress={applyQuickAction} style={styles.editorSaveBtn} />
                    <Button label="إلغاء" tone="secondary" onPress={() => setQuickActionKey(null)} />
                  </View>
                </View>
              )}
            </>
          )}
        </Surface>

        {/* وقت التنفيذ */}
        <Surface tone="default" style={styles.cardFrame}>
          <Text role="bodySm" weight="bold" style={styles.cardLabel}>وقت التنفيذ</Text>
          <View style={{ gap: spacing[4], marginTop: 4 }}>
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <Pressable
                onPress={() => setScheduling("now")}
                style={[
                  styles.selectorTab,
                  scheduling === "now" && styles.selectorTabActive,
                ]}
              >
                <Text style={[styles.selectorTabText, scheduling === "now" && styles.selectorTabTextActive]}>الآن</Text>
              </Pressable>
              <Pressable
                onPress={() => setScheduling("later")}
                style={[
                  styles.selectorTab,
                  scheduling === "later" && styles.selectorTabActive,
                ]}
              >
                <Text style={[styles.selectorTabText, scheduling === "later" && styles.selectorTabTextActive]}>في وقت لاحق</Text>
              </Pressable>
            </View>

            {scheduling === "now" ? (
              <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: "right" }}>
                سيتم تنفيذ الطلب مباشرة بعد تأكيد السلة.
              </Text>
            ) : (
              <View style={{ gap: 8, marginTop: 4 }}>
                <Text role="caption" weight="bold" style={{ color: colorRoles.textPrimary, textAlign: "right" }}>اختر التاريخ:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
                  {executionScheduleOptions.dateOptions.map((opt) => {
                    const isSelected = opt.value === scheduledDate;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setScheduledDate(opt.value)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text role="caption" weight="bold" style={{ color: colorRoles.textPrimary, textAlign: "right", marginTop: 4 }}>اختر الوقت:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
                  {executionScheduleOptions.timeOptions.map((opt) => {
                    const isSelected = opt.value === scheduledTime;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setScheduledTime(opt.value)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </Surface>

        {/* قرار الدفع */}
        <PaymentDecisionSection
          paymentMethod={wltPayment.paymentMethod}
          options={wltPayment.paymentDecisionOptions}
          onSelectMethod={wltPayment.setPaymentMethod}
        />

        {/* قد تعجبك هذه المنتجات أيضاً */}
        <View style={{ gap: spacing[3], marginVertical: 4 }}>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
            <Text role="bodySm" weight="bold" style={{ color: colorRoles.textPrimary }}>قد تعجبك هذه المنتجات أيضاً</Text>
            <Text role="caption" style={{ color: colorRoles.textSecondary }}>إضافة سريعة للسلة</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8, paddingVertical: 4 }}>
            {RECOMMENDED_ITEMS.map((item) => {
              const cartItem = cart.items.find((it) => it.productName === item.name);
              const qty = cartItem?.quantity ?? 0;
              return (
                <Surface key={item.id} tone="default" style={styles.recCard}>
                  {qty > 0 && (
                    <View style={styles.recBadge}>
                      <Badge label={`مضاف (${qty})`} tone="action" />
                    </View>
                  )}
                  <Text style={{ fontSize: 24, textAlign: "center", marginVertical: 4 }}>{item.icon}</Text>
                  <Text role="bodySm" weight="bold" style={{ color: colorRoles.textPrimary, textAlign: "center" }} numberOfLines={1}>{item.name}</Text>
                  <Text role="caption" style={{ color: colorRoles.brandAction, textAlign: "center", marginBottom: 6 }}>{item.price} د.ي</Text>
                  <Button
                    label={qty > 0 ? "إضافة المزيد" : "أضف للسلة"}
                    tone="secondary"
                    size="sm"
                    onPress={() => void controller.updateItemQuantity(item.id, item.name, qty + 1, `${item.price} د.ي`)}
                  />
                </Surface>
              );
            })}
          </ScrollView>
        </View>

        {/* مراجعة السلة (العناصر والكميات) */}
        <Surface tone="default" style={styles.cardFrame}>
          <View style={styles.cartReviewHeader}>
            <View style={styles.cartReviewHeaderText}>
              <Icon name="cart-outline" size={18} color={colorRoles.textPrimary} />
              <Text role="bodySm" weight="bold" style={styles.cardLabel}>مراجعة السلة</Text>
              <Badge label={`${cart.items.length} عناصر`} tone="success" />
            </View>
            <Pressable onPress={() => void controller.clear(cart)}>
              <Text role="bodySm" style={styles.clearBtnText}>حذف الكل</Text>
            </Pressable>
          </View>

          <View style={styles.itemsListContainer}>
            {cart.items.map((item, index) => {
              const priceVal = parseFloat(item.priceReference ? item.priceReference.replace(/[^\d.]/g, "") : "0") || 0;
              return (
                <View key={item.id} style={styles.cartItemRow}>
                  <View style={styles.itemMainDetails}>
                    <Text role="bodyStrong" style={styles.itemTitleText}>{`${index + 1}- ${item.productName}`}</Text>
                    <Text role="caption" style={styles.itemUnitPrice}>سعر الوحدة: {priceVal} د.ي</Text>
                  </View>

                  <View style={styles.qtyControlsContainer}>
                    <Button
                      label="-"
                      tone="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() => void controller.updateItemQuantity(item.masterProductId, item.productName, item.quantity - 1, item.priceReference)}
                      style={styles.qtyBtn}
                    />
                    <Text role="bodyStrong" style={styles.qtyNumberText}>{item.quantity}</Text>
                    <Button
                      label="+"
                      tone="primary"
                      size="sm"
                      fullWidth={false}
                      onPress={() => void controller.updateItemQuantity(item.masterProductId, item.productName, item.quantity + 1, item.priceReference)}
                      style={styles.qtyBtn}
                    />
                  </View>

                  <Text role="bodyStrong" style={styles.itemSubtotalText}>{priceVal * item.quantity} د.ي</Text>
                </View>
              );
            })}
          </View>

          <Divider style={styles.divider} />

          {/* خلاصة الحساب المالي للفاتورة */}
          <View style={styles.invoiceBreakdown}>
            <View style={styles.invoiceRow}>
              <Text role="bodySm" style={styles.invoiceLabel}>إجمالي المنتجات</Text>
              <Text role="bodyStrong" style={styles.invoiceValue}>{subtotal} د.ي</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text role="bodySm" style={styles.invoiceLabel}>سعر التوصيل</Text>
              <Text role="bodyStrong" style={styles.invoiceValue}>{deliveryFee} د.ي</Text>
            </View>
            {discount > 0 && (
              <View style={styles.invoiceRow}>
                <Text role="bodySm" style={styles.invoiceLabelSuccess}>الخصم (قسيمة: {couponCode})</Text>
                <Text role="bodyStrong" style={styles.invoiceValueSuccess}>-{discount} د.ي</Text>
              </View>
            )}
            <Divider style={styles.divider} />
            <View style={styles.invoiceRowTotal}>
              <Text role="bodyStrong" weight="black" style={styles.totalLabel}>الإجمالي النهائي</Text>
              <Text role="titleMd" weight="black" style={styles.totalValue}>{grandTotal} د.ي</Text>
            </View>
          </View>
        </Surface>

        {/* نطاق الخدمة والتوصيل الفعلي */}
        {isBlocked && (
          <View style={styles.blockedNoticeCard}>
            <Icon name="alert-circle-outline" size={20} color={colorRoles.danger} />
            <View style={styles.blockedNoticeText}>
              <Text role="bodySm" weight="bold" style={{ color: colorRoles.danger }}>خارج نطاق التوصيل</Text>
              <Text role="caption" style={{ color: colorRoles.textMuted }}>
                {serviceabilityController.serviceability.kind === "blocked" ? serviceabilityController.serviceability.reason : ""}
              </Text>
            </View>
            <Button label="تغيير المنطقة" tone="secondary" size="sm" onPress={serviceabilityController.reset} />
          </View>
        )}

        {/* أزرار الإجراءات */}
        {!isServiceable && !isBlocked && (
          <Button
            tone="primary"
            label={isChecking ? "جاري التحقق من التوصيل…" : "تأكيد التغطية والمتابعة 📍"}
            onPress={handleCheckServiceability}
            disabled={isChecking}
            style={styles.mainActionBtn}
          />
        )}

        {isServiceable && (
          <Button
            tone="primary"
            label="المتابعة لتأكيد الطلب 🚀"
            onPress={() => setCheckoutReviewVisible(true)}
            style={styles.mainActionBtn}
          />
        )}

        {/* شاشة ملخص الطلب المنسدلة (Bottom Sheet) */}
        <Modal
          visible={checkoutReviewVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCheckoutReviewVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setCheckoutReviewVisible(false)} />
            <View style={styles.modalContent}>
              {/* Drag Handle Indicator */}
              <View style={styles.dragHandle} />

              <View style={styles.modalHeader}>
                <Text role="titleMd" weight="bold" style={styles.modalTitle}>خلاصة ومراجعة الطلب</Text>
                <Pressable onPress={() => setCheckoutReviewVisible(false)} style={styles.closeButton}>
                  <Icon name="close" size={20} tone="muted" />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                
                {/* Fulfillment details */}
                <View style={styles.modalCard}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                    <View style={styles.modalIconBg}>
                      <Icon name="bicycle" size={20} color={colorRoles.brandAction} />
                    </View>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text role="caption" style={{ color: colorRoles.textSecondary }}>طريقة الاستلام والتوصيل</Text>
                      <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, marginTop: 2 }}>
                        {selectedFulfillmentMode === "pickup" ? "استلام من المتجر بنفسك" : "توصيل سريع عبر كابتن بثواني"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Delivery Address */}
                {selectedFulfillmentMode !== "pickup" && (
                  <View style={styles.modalCard}>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                      <View style={[styles.modalIconBg, { backgroundColor: alpha(statusScale.success, 0.1) }]}>
                        <Icon name="location" size={20} color={colorRoles.brandStructure} />
                      </View>
                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        <Text role="caption" style={{ color: colorRoles.textSecondary }}>عنوان التسليم المحدد</Text>
                        <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, marginTop: 2 }}>{clientAddress}</Text>
                        <Text role="caption" style={{ color: colorRoles.brandAction, marginTop: 4 }}>
                          الإحداثيات: {clientCoordinates.latitude.toFixed(5)}، {clientCoordinates.longitude.toFixed(5)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Note & Schedule */}
                <View style={styles.modalCard}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                    <View style={[styles.modalIconBg, { backgroundColor: alpha(statusScale.warning, 0.1) }]}>
                      <Icon name="time-outline" size={20} color={colorRoles.brandAction} />
                    </View>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text role="caption" style={{ color: colorRoles.textSecondary }}>توجيهات ووقت التنفيذ</Text>
                      <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, marginTop: 2 }}>
                        وقت التوصيل: {scheduling === "later" ? `${scheduledDate} ${scheduledTime}` : "توصيل فوري (الآن)"}
                      </Text>
                      {note && (
                        <Text role="caption" style={{ color: colorRoles.textSecondary, marginTop: 4 }}>
                          ملاحظات إضافية: {note}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Billing invoice summary */}
                <View style={[styles.modalCard, { backgroundColor: colorRoles.surfaceBase, borderColor: colorRoles.surfaceBase }]}>
                  <Text role="caption" style={{ color: colorRoles.textSecondary, textAlign: 'right', marginBottom: 8, fontWeight: "bold" }}>تفاصيل الفاتورة المالية</Text>
                  
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", marginVertical: 4 }}>
                    <Text role="bodySm" style={{ color: colorRoles.textSecondary }}>رسوم التوصيل والخدمة:</Text>
                    <Text role="bodyStrong" style={{ color: colorRoles.textPrimary }}>{deliveryFee} د.ي</Text>
                  </View>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginVertical: 4 }}>
                    <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, fontWeight: "bold" }}>الإجمالي النهائي المستحق:</Text>
                    <Text role="titleMd" weight="black" style={{ color: colorRoles.brandAction, fontSize: 20 }}>{grandTotal} د.ي</Text>
                  </View>
                </View>

                {/* Confirm Action Button */}
                <Button
                  tone="primary"
                  label="تأكيد الطلب والذهاب للدفع 💳"
                  onPress={() => {
                    setCheckoutReviewVisible(false);
                    handleProceed();
                  }}
                  style={{ marginTop: 12, height: 50, borderRadius: 25 }}
                />

                <Button
                  tone="secondary"
                  label="إلغاء وتعديل السلة"
                  onPress={() => setCheckoutReviewVisible(false)}
                  style={{ height: 50, borderRadius: 25 }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
        
        <View style={styles.footerSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 12,
  },
  confirmationBanner: {
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    borderRadius: radius.md,
    padding: 12,
  },
  confirmationHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confirmationHeaderText: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: 8,
  },
  confirmationTitle: {
    color: colorRoles.textPrimary,
    marginBottom: 4,
  },
  confirmationDesc: {
    color: colorRoles.textSecondary,
    textAlign: "right",
    lineHeight: 16,
  },
  confirmationBadge: {
    color: colorRoles.brandAction,
    fontWeight: "800",
  },
  cardFrame: {
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderMeta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardIcon: {
    marginTop: 2,
  },
  cardHeaderTitles: {
    flex: 1,
    alignItems: "flex-end",
  },
  cardLabel: {
    color: colorRoles.textPrimary,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  cardValue: {
    color: colorRoles.textSecondary,
    fontWeight: "bold",
  },
  pickerOptionsList: {
    gap: 8,
    marginTop: 8,
  },
  pickerItem: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: 10,
  },
  pickerItemActive: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.surfaceBase,
  },
  pickerItemContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  pickerItemMeta: {
    flex: 1,
    alignItems: "flex-end",
  },
  pickerItemLabel: {
    color: colorRoles.textPrimary,
  },
  pickerItemDesc: {
    color: colorRoles.textSecondary,
    textAlign: "right",
  },
  optionRowContainer: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  optionTextContainer: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: 8,
  },
  optionTitle: {
    color: colorRoles.textPrimary,
  },
  optionSubtitle: {
    color: colorRoles.textSecondary,
    marginTop: 2,
  },
  actionEditorBox: {
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.sm,
    padding: 12,
    gap: 8,
    marginTop: 6,
  },
  editorTitle: {
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  editorActions: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 4,
  },
  editorSaveBtn: {
    flex: 1,
  },
  divider: {
    backgroundColor: colorRoles.borderSubtle,
    marginVertical: 4,
  },
  cartReviewHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartReviewHeaderText: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  clearBtnText: {
    color: colorRoles.danger,
  },
  itemsListContainer: {
    gap: 10,
    marginTop: 6,
  },
  cartItemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.sm,
    padding: 10,
    gap: 8,
  },
  itemMainDetails: {
    flex: 1,
    alignItems: "flex-end",
  },
  itemTitleText: {
    color: colorRoles.textPrimary,
    textAlign: "right",
  },
  itemUnitPrice: {
    color: colorRoles.textSecondary,
    marginTop: 2,
  },
  qtyControlsContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colorRoles.surfaceBase,
    borderRadius: radius.sm,
    padding: 2,
    gap: 4,
  },
  qtyBtn: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 0,
    borderRadius: radius.xs,
  },
  qtyNumberText: {
    minWidth: 20,
    textAlign: "center",
    color: colorRoles.textPrimary,
  },
  itemSubtotalText: {
    color: colorRoles.textPrimary,
    minWidth: 60,
    textAlign: "left",
  },
  invoiceBreakdown: {
    gap: 8,
  },
  invoiceRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceLabel: {
    color: colorRoles.textSecondary,
  },
  invoiceValue: {
    color: colorRoles.textPrimary,
  },
  invoiceLabelSuccess: {
    color: colorRoles.success,
  },
  invoiceValueSuccess: {
    color: colorRoles.success,
  },
  invoiceRowTotal: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: colorRoles.textPrimary,
  },
  totalValue: {
    color: colorRoles.brandAction,
  },
  blockedNoticeCard: {
    backgroundColor: colorRoles.surfaceBase,
    borderColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  blockedNoticeText: {
    flex: 1,
    alignItems: "flex-end",
  },
  mainActionBtn: {
    borderRadius: radius.md,
    height: 48,
  },
  footerSpacing: {
    height: 30,
  },
  // Restored components styling
  selectorTab: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colorRoles.surfaceBase,
  },
  selectorTabActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  selectorTabText: {
    fontSize: 13,
    fontWeight: "bold",
    color: colorRoles.textSecondary,
  },
  selectorTabTextActive: {
    color: colorRoles.surfaceBase,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    backgroundColor: colorRoles.surfaceBase,
  },
  chipActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  chipText: {
    fontSize: 12,
    color: colorRoles.textSecondary,
  },
  chipTextActive: {
    color: colorRoles.surfaceBase,
    fontWeight: "bold",
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colorRoles.surfaceBase,
    gap: 4,
  },
  paymentCardActive: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.surfaceBase,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: "transparent",
  },
  radioDotActive: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.brandAction,
  },
  paymentBreakdown: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colorRoles.borderSubtle,
  },
  recCard: {
    width: 120,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: colorRoles.surfaceBase,
    position: "relative",
  },
  recBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 1,
  },
  // Interactive Map Styles
  mapContainer: {
    width: 320,
    height: 220,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    overflow: "hidden",
    alignSelf: "center",
    position: "relative",
    marginVertical: 8,
  },
  mapPressable: {
    width: "100%",
    height: "100%",
  },
  mapCircle: {
    position: "absolute",
    borderWidth: 1,
    borderColor: colorRoles.surfaceBase,
    borderStyle: "dashed",
  },
  mapRoad: {
    position: "absolute",
    backgroundColor: colorRoles.surfaceBase,
  },
  storePin: {
    position: "absolute",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    zIndex: 2,
  },
  storePinLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colorRoles.brandStructure,
    backgroundColor: alpha(colorPalette.white, 0.8),
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  userPin: {
    position: "absolute",
    zIndex: 10,
  },
  userPinPulse: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: alpha(colorRoles.brandAction, 0.3),
    top: -5,
    left: -5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: alpha(neutralScale[900], 0.65), // Dark semi-transparent backdrop
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colorRoles.surfaceBase,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "85%",
    shadowColor: colorRoles.brandStructure,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colorRoles.surfaceBase,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: colorRoles.surfaceBase,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colorRoles.brandStructure,
    textAlign: "right",
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colorRoles.surfaceBase,
  },
  modalCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1.5,
    borderColor: colorRoles.surfaceBase,
    marginVertical: 4,
  },
  modalIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: alpha(colorRoles.info, 0.1),
    justifyContent: "center",
    alignItems: "center",
  },
});

