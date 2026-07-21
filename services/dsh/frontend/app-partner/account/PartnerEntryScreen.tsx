import React from "react";
import {
  Box,
  Button,
  Card,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  TopBar,
} from "@bthwani/ui-kit";

export type DshPartnerEntryScreenState =
  | "ready"
  | "loading"
  | "empty"
  | "error"
  | "offline"
  | "disabled"
  | "partial";

export type PartnerEntryScreenProps = {
  readonly state: DshPartnerEntryScreenState;
  readonly isStoreAvailable?: boolean;
  readonly onToggleStoreAvailability?: (available: boolean) => void;
  readonly onOpenOrdersBoardPress?: () => void;
  readonly onOpenOrderDetailPress?: () => void;
  readonly onOpenMaintenancePress?: () => void;
  readonly onOpenIssueQueuePress?: () => void;
};

function renderHero(
  state: DshPartnerEntryScreenState,
  onOpenOrdersBoardPress?: () => void,
) {
  if (state === "loading") {
    return <StateView title="جاري تحميل حالة الفرع والطلبات…" loading />;
  }

  if (state === "empty") {
    return (
      <StateView
        title="لا توجد طلبات بانتظار الفرع"
        description="يبقى مدخل لوحة الطلبات متاحًا حتى يتمكن مشغل الفرع من استئناف الفرز فور وصول طلب جديد."
        {...(onOpenOrdersBoardPress
          ? {
              actionLabel: "فتح لوحة الطلبات",
              onActionPress: onOpenOrdersBoardPress,
            }
          : {})}
      />
    );
  }

  if (state === "offline") {
    return (
      <StateView
        title="لا يوجد اتصال بـ DSH"
        description="لا يمكن عرض حالة الفرع أو تنفيذ الطلبات قبل استعادة الاتصال."
        tone="warning"
        {...(onOpenOrdersBoardPress
          ? {
              actionLabel: "إعادة المحاولة",
              onActionPress: onOpenOrdersBoardPress,
            }
          : {})}
      />
    );
  }

  if (state === "error") {
    return (
      <StateView
        title="تعذر تحميل مدخل الشريك"
        description="رفض الخادم الطلب أو أعاد حالة غير قابلة للعرض."
        tone="danger"
        {...(onOpenOrdersBoardPress
          ? {
              actionLabel: "إعادة المحاولة",
              onActionPress: onOpenOrdersBoardPress,
            }
          : {})}
      />
    );
  }

  if (state === "disabled") {
    return (
      <StateView
        title="العمليات غير مفعلة"
        description="حساب الشريك أو المتجر لا يملك حاليًا صلاحية استقبال الطلبات."
        tone="warning"
      />
    );
  }

  if (state === "partial") {
    return (
      <StateView
        title="البيانات غير مكتملة"
        description="تم تحميل جزء من حالة الطلبات فقط؛ أعد المحاولة قبل اتخاذ إجراء تشغيلي."
        tone="warning"
        {...(onOpenOrdersBoardPress
          ? {
              actionLabel: "إعادة المحاولة",
              onActionPress: onOpenOrdersBoardPress,
            }
          : {})}
      />
    );
  }

  return (
    <Card
      title="مدخل تشغيل الفرع"
      subtitle="نقطة بداية واحدة لفرز الطلبات وتجهيزها ومتابعة الصيانة واحتواء الاستثناءات داخل app-partner."
      {...(onOpenOrdersBoardPress
        ? {
            footer: (
              <Button
                label="فتح لوحة الطلبات"
                onPress={onOpenOrdersBoardPress}
              />
            ),
          }
        : {})}
    />
  );
}

function renderOrdersSection(
  onOpenOrdersBoardPress?: () => void,
  onOpenOrderDetailPress?: () => void,
) {
  return (
    <Box gap={3}>
      <Card
        title="مراجعة صف الطلبات"
        subtitle="ابدأ من لوحة الطلبات حتى يظل قرار الفرع التالي واضحًا."
        {...(onOpenOrdersBoardPress
          ? {
              footer: (
                <Button
                  label="عرض لوحة الطلبات"
                  tone="secondary"
                  onPress={onOpenOrdersBoardPress}
                />
              ),
            }
          : {})}
      />
      <Card
        title="فتح مسار تجهيز الطلب"
        subtitle="التجهيز والجاهزية والتسليم للكابتن تبقى مجمعة في مسار طلب واحد."
        {...(onOpenOrderDetailPress
          ? {
              footer: (
                <Button
                  label="فتح تفاصيل الطلب"
                  tone="ghost"
                  onPress={onOpenOrderDetailPress}
                />
              ),
            }
          : {})}
      />
    </Box>
  );
}

function renderSupportSection(
  onOpenMaintenancePress?: () => void,
  onOpenIssueQueuePress?: () => void,
) {
  return (
    <Box gap={3}>
      <Card
        title="مساحة صيانة الفرع"
        subtitle="التوفر وصيانة الفرع يظلان متاحين من دون إزاحة خط الطلبات الرئيسي."
        {...(onOpenMaintenancePress
          ? {
              footer: (
                <Button
                  label="فتح الصيانة"
                  tone="secondary"
                  onPress={onOpenMaintenancePress}
                />
              ),
            }
          : {})}
      />
      <Card
        title="صف استثناءات الطلبات"
        subtitle="المشكلات والتصعيدات تبقى ظاهرة كصف مرافق للفرع نفسه."
        {...(onOpenIssueQueuePress
          ? {
              footer: (
                <Button
                  label="فتح صف الاستثناءات"
                  tone="ghost"
                  onPress={onOpenIssueQueuePress}
                />
              ),
            }
          : {})}
      />
    </Box>
  );
}

export function PartnerEntryScreen({
  state,
  isStoreAvailable = false,
  onToggleStoreAvailability,
  onOpenOrdersBoardPress,
  onOpenOrderDetailPress,
  onOpenMaintenancePress,
  onOpenIssueQueuePress,
}: PartnerEntryScreenProps) {
  return (
    <MobileScrollView
      fill
      padding={4}
      gap={4}
      contentContainerStyle={{ paddingBottom: 112 }}
    >
      <TopBar
        variant="secondary"
        title="مدخل الشريك"
        style={{ marginHorizontal: -16, marginTop: -16 }}
      />

      {renderHero(state, onOpenOrdersBoardPress)}

      {state === "ready" ? (
        <>
          <Surface
            tone={isStoreAvailable ? "success" : "raised"}
            padding={3}
            gap={2}
          >
            <Text role="titleSm">
              {isStoreAvailable
                ? "المتجر مفتوح ويستقبل الطلبات"
                : "المتجر مغلق حالياً"}
            </Text>
            {onToggleStoreAvailability ? (
              <Button
                label={
                  isStoreAvailable
                    ? "إغلاق المتجر مؤقتاً"
                    : "فتح المتجر لاستقبال الطلبات"
                }
                tone={isStoreAvailable ? "danger" : "primary"}
                onPress={() =>
                  onToggleStoreAvailability(!isStoreAvailable)
                }
              />
            ) : (
              <Text role="bodySm" tone="muted">
                تعديل حالة المتجر غير مربوط في هذا المسار.
              </Text>
            )}
          </Surface>

          <Surface tone="raised" padding={3} gap={2}>
            <Text role="label" tone="muted">
              نطاق السطح
            </Text>
            <Text role="bodySm" tone="muted">
              هذا المدخل مملوك للفرع الحالي فقط: الطلبات والتجهيز والصيانة
              والاستثناءات.
            </Text>
          </Surface>

          <Surface tone="raised" padding={3} gap={3}>
            <Text role="label" tone="muted">
              الطلبات ومسار التنفيذ
            </Text>
            {renderOrdersSection(
              onOpenOrdersBoardPress,
              onOpenOrderDetailPress,
            )}
          </Surface>

          <Surface tone="raised" padding={3} gap={3}>
            <Text role="label" tone="muted">
              الصيانة والاستثناءات
            </Text>
            {renderSupportSection(
              onOpenMaintenancePress,
              onOpenIssueQueuePress,
            )}
          </Surface>
        </>
      ) : null}
    </MobileScrollView>
  );
}
