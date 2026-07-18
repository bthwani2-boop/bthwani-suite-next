import React from "react";
import { View } from "react-native";
import {
  Card,
  StateView,
  Text,
  TopBar,
  colorRoles,
  spacing,
} from "@bthwani/ui-kit";
import type {
  DshPartnerSupportCommandFilterId,
  DshPartnerSupportIssueCategoryId,
  DshPartnerSupportRouteId,
} from "../../shared/partner/partner.types";

export type PartnerSupportScreenProps = {
  readonly onBack?: () => void;
  readonly onOpenScreen?: (screenId: DshPartnerSupportRouteId) => void;
  readonly initialFilterId?: DshPartnerSupportCommandFilterId;
  readonly initialCaseId?: string | null;
  readonly initialIssueCategoryId?: DshPartnerSupportIssueCategoryId | null;
  readonly initialSupportRouteId?: DshPartnerSupportRouteId | null;
};

/**
 * Partner support is intentionally fail-closed.
 *
 * DSH currently exposes authenticated support-ticket mutations for client and
 * operator actors only. No partner-owned support queue, conversation, proof,
 * rejection, escalation, or SLA mutation contract exists. The former screen
 * contained fixed order references, timelines, owners, SLA values, and local
 * lifecycle mutations that looked operational but never reached DSH.
 */
export function PartnerSupportScreen({
  onBack,
  onOpenScreen: _onOpenScreen,
  initialFilterId: _initialFilterId,
  initialCaseId: _initialCaseId,
  initialIssueCategoryId: _initialIssueCategoryId,
  initialSupportRouteId: _initialSupportRouteId,
}: PartnerSupportScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <TopBar title="دعم الشريك" {...(onBack ? { onBack } : {})} />
      <View style={{ flex: 1, padding: spacing[4], gap: spacing[3] }}>
        <StateView
          tone="warning"
          title="دعم الشريك غير مفعّل تشغيليًا"
          description="لا يوجد عقد DSH حالي يملك طابور دعم الشريك أو المحادثات أو الأدلة أو قرارات المعالجة. تم حذف الحالات الثابتة والإجراءات المحلية حتى لا تظهر كحقيقة تشغيلية."
        />
        <Card style={{ padding: spacing[4], gap: spacing[2] }}>
          <Text role="bodyStrong" style={{ textAlign: "right" }}>
            متطلبات التفعيل
          </Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>
            Product Truth لدعم الشريك، صلاحيات الخادم، عقد OpenAPI، جداول التذاكر والمحادثات، ربط الطلب والمتجر، رفع الأدلة، SLA، سجل تدقيق، واختبارات القراءة العكسية في لوحة التحكم.
          </Text>
        </Card>
      </View>
    </View>
  );
}

export default PartnerSupportScreen;
