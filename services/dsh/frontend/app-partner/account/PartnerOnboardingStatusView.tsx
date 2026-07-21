import React from "react";
import { View } from "react-native";
import {
  Badge,
  Button,
  Icon,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  radius,
  spacing,
} from "@bthwani/ui-kit";

import {
  getDshPartnerActivationStateMetadata,
  getDshPartnerActivationStatusLabel,
} from "../../shared/partner/partner-activation.model";
import type {
  DshPartnerDetailState,
  DshPartnerReadinessState,
} from "../../shared/partner/partner.states";
import type { DshPartnerReadinessViewModel } from "../../shared/partner/partner.view-model";

export interface PartnerOnboardingStatusViewProps {
  selfStatusState: DshPartnerDetailState & { kind: "success" };
  selfReadinessState: DshPartnerReadinessState;
  selfReadinessViewModel: DshPartnerReadinessViewModel | null;
  reloadSelfStatus: () => void;
}

export function PartnerOnboardingStatusView({
  selfStatusState,
  selfReadinessState,
  selfReadinessViewModel,
  reloadSelfStatus,
}: PartnerOnboardingStatusViewProps) {
  const statusMeta = getDshPartnerActivationStateMetadata(
    selfStatusState.partner.activationStatus,
  );
  const readinessItems = selfReadinessViewModel?.items ?? [];

  return (
    <MobileScrollView
      contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
      showsVerticalScrollIndicator={false}
    >
      <Surface
        style={{
          padding: spacing[4],
          gap: spacing[3],
          borderRadius: radius.md,
        }}
      >
        <View style={{ alignItems: "flex-end", gap: spacing[1] }}>
          <Text
            role="titleMd"
            style={{ textAlign: "right", fontWeight: "bold" }}
          >
            حالة الانضمام
          </Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
            لا يمكن تفعيل الحساب ذاتيًا. تتم المراجعة والتفعيل من لوحة التحكم.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row-reverse",
            flexWrap: "wrap",
            gap: spacing[2],
          }}
        >
          <Badge
            label={getDshPartnerActivationStatusLabel(
              selfStatusState.partner.activationStatus,
            )}
            tone="info"
          />
          <Badge
            label={
              selfReadinessState.kind === "success" &&
              selfReadinessState.readiness.canActivatePartner
                ? "جاهز للمراجعة"
                : "بانتظار استكمال الاعتماد"
            }
            tone={
              selfReadinessState.kind === "success" &&
              selfReadinessState.readiness.canActivatePartner
                ? "success"
                : "warning"
            }
          />
        </View>

        <View style={{ gap: spacing[2], alignItems: "flex-end" }}>
          <Text role="bodyStrong" style={{ textAlign: "right" }}>
            الخطوة التالية
          </Text>
          <Text role="bodySm" tone="secondary" style={{ textAlign: "right" }}>
            {statusMeta.nextAction}
          </Text>
          {statusMeta.blockedReason ? (
            <Text role="caption" tone="danger" style={{ textAlign: "right" }}>
              {statusMeta.blockedReason}
            </Text>
          ) : null}
        </View>
      </Surface>

      <Surface
        style={{
          padding: spacing[4],
          gap: spacing[2],
          borderRadius: radius.md,
        }}
      >
        <Text
          role="bodyStrong"
          style={{ textAlign: "right", fontWeight: "bold" }}
        >
          النواقص والجاهزية
        </Text>
        {selfReadinessState.kind === "error" ? (
          <StateView
            tone="warning"
            title="الحالة التشغيلية متاحة جزئيًا"
            description={selfReadinessState.message}
            actionLabel="تحديث الحالة"
            onActionPress={reloadSelfStatus}
          />
        ) : selfReadinessState.kind === "loading" ||
          selfReadinessState.kind === "idle" ? (
          <StateView
            loading
            tone="info"
            title="جاري تحميل الجاهزية"
            description="تُقرأ بوابات التأهيل من DSH قبل عرض أي حكم تشغيلي."
          />
        ) : readinessItems.length === 0 ? (
          <StateView
            tone="neutral"
            title="لا توجد تفاصيل جاهزية"
            description="لم يعد DSH عناصر جاهزية قابلة للعرض في هذه القراءة."
            actionLabel="تحديث الحالة"
            onActionPress={reloadSelfStatus}
          />
        ) : (
          readinessItems.map((item) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row-reverse",
                alignItems: "flex-start",
                gap: spacing[2],
              }}
            >
              <Icon
                name={item.satisfied ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                tone={item.satisfied ? "success" : "muted"}
              />
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text role="bodySm" style={{ textAlign: "right" }}>
                  {item.label}
                </Text>
                {!item.satisfied && item.blockedReason ? (
                  <Text
                    role="caption"
                    tone="muted"
                    style={{ textAlign: "right" }}
                  >
                    {item.blockedReason}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </Surface>

      <Button
        label="تحديث الحالة"
        tone="secondary"
        onPress={reloadSelfStatus}
      />
    </MobileScrollView>
  );
}
