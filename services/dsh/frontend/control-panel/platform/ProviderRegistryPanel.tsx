"use client";

import { Card, Text, spacing } from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import {
  CpBadge,
  CpButton,
  CpPageHeader,
  CpStatePanel,
  CpStateView,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  useProviderRegistryController,
} from "../../shared/platform";
import { hasServiceControlPanelPermission } from "../../shared/session/control-panel-permissions";
import { useControlPanelSession } from "../../shared/session/control-panel-session";
import { MapsProviderInspector } from "./MapsProviderInspector";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  inactive: "neutral",
  pending_approval: "warning",
  failed: "danger",
  disabled_by_policy: "neutral",
};

const HEALTH_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  healthy: "success",
  degraded: "warning",
  down: "danger",
  unknown: "neutral",
  not_configured: "neutral",
};

function credentialLabel(configured: boolean): string {
  return configured ? "مهيأة في الخادم" : "غير مهيأة";
}

const header = (
  <CpPageHeader title="سجل مزودي المنصة">
    <Text role="caption">قراءة وتحديث محكومان من خدمة providers؛ قيم الاعتماد لا تُعاد إلى المتصفح ولا تظهر في سجل التدقيق.</Text>
  </CpPageHeader>
);

export function ProviderRegistryPanel() {
  const { state: sessionState } = useControlPanelSession();
  const identity = sessionState.kind === "authenticated" ? sessionState.identity : null;
  const canRead = hasServiceControlPanelPermission(identity, "providers", "provider:read");
  const canUpdate = hasServiceControlPanelPermission(identity, "providers", "provider:update");
  const registry = useProviderRegistryController(canRead);

  if (!canRead) {
    return (
      <DataTablePageFrame
        header={header}
        stateView={
          <CpStatePanel
            role="alert"
            title="صلاحية قراءة المزودين مطلوبة"
            description="لا يتم استدعاء خدمة providers قبل تحقق provider:read على سطح لوحة التحكم."
          />
        }
      >
        <View />
      </DataTablePageFrame>
    );
  }

  if (registry.state.kind === "loading" || registry.state.kind === "idle") {
    return (
      <DataTablePageFrame
        header={header}
        stateView={<CpStateView kind="loading" title="جاري تحميل المزودين…" />}
      >
        <View />
      </DataTablePageFrame>
    );
  }

  if (registry.state.kind === "error") {
    return (
      <DataTablePageFrame
        header={header}
        stateView={
          <CpStatePanel role="alert" title="تعذر تحميل سجل المزودين" description={registry.state.message}>
            <CpButton onClick={registry.reload}>إعادة المحاولة</CpButton>
          </CpStatePanel>
        }
      >
        <View />
      </DataTablePageFrame>
    );
  }

  const providers = registry.state.items;
  const mapsProvider = providers.find((provider) => provider.kind === "maps") ?? null;

  return (
    <DataTablePageFrame header={header}>
      <View style={styles.stack}>
        {!canUpdate ? (
          <View style={styles.section}>
            <CpStatePanel
              role="status"
              title="وضع القراءة فقط"
              description="يمكن قراءة السجل والصحة والتفاصيل، لكن التفعيل والتعطيل مخفيان لعدم توفر provider:update."
            />
          </View>
        ) : null}

        {mapsProvider ? (
          <View style={styles.section}>
            <Text role="titleSm">مزود الخرائط</Text>
            <MapsProviderInspector
              provider={mapsProvider}
              providerId={mapsProvider.providerId}
              canUpdate={canUpdate}
              mutationLoading={
                registry.mutationState.kind === "loading" &&
                registry.mutationState.providerId === mapsProvider.providerId
              }
              onSaveAndroidKey={registry.setMapsAndroidKey}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text role="titleSm">جميع المزودين</Text>
          {providers.length === 0 ? (
            <CpStatePanel
              role="status"
              title="لا يوجد مزودون مسجلون"
              description="لم تُرجع خدمة providers أي سجل تشغيلي، ولا تُعرض سجلات محلية أو تجريبية بديلة."
            />
          ) : (
            <CpTable aria-label="جميع المزودين">
              <thead>
                <tr>
                  <CpTableHeaderCell>المعرّف</CpTableHeaderCell>
                  <CpTableHeaderCell>المزود</CpTableHeaderCell>
                  <CpTableHeaderCell>النوع</CpTableHeaderCell>
                  <CpTableHeaderCell>الحالة</CpTableHeaderCell>
                  <CpTableHeaderCell>الصحة الحية</CpTableHeaderCell>
                  <CpTableHeaderCell>بيانات الاعتماد</CpTableHeaderCell>
                  <CpTableHeaderCell>تفاصيل الصحة</CpTableHeaderCell>
                  <CpTableHeaderCell>الإجراءات</CpTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {providers.map((row) => {
                  const mutationLoading =
                    registry.mutationState.kind === "loading" &&
                    registry.mutationState.providerId === row.providerId;
                  return (
                    <tr key={row.providerId}>
                      <CpTableCell>{row.providerId}</CpTableCell>
                      <CpTableCell>{row.code}</CpTableCell>
                      <CpTableCell>{row.kind}</CpTableCell>
                      <CpTableCell>
                        <CpBadge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</CpBadge>
                      </CpTableCell>
                      <CpTableCell>
                        <CpBadge tone={HEALTH_TONE[row.lastHealthStatus] ?? "neutral"}>{row.lastHealthStatus}</CpBadge>
                      </CpTableCell>
                      <CpTableCell>
                        <CpBadge tone={row.credentialConfigured ? "success" : "warning"}>
                          {credentialLabel(row.credentialConfigured)}
                        </CpBadge>
                      </CpTableCell>
                      <CpTableCell>{row.healthMessage ?? "—"}</CpTableCell>
                      <CpTableCell>
                        <View style={styles.actions}>
                          <CpButton
                            disabled={mutationLoading}
                            onClick={() => void registry.selectProvider(row.providerId)}
                          >
                            التفاصيل
                          </CpButton>
                          {canUpdate ? (
                            <CpButton
                              disabled={mutationLoading}
                              onClick={() => void registry.setProviderActive(row.providerId, !row.active)}
                            >
                              {mutationLoading ? "جارٍ…" : row.active ? "تعطيل" : "تفعيل"}
                            </CpButton>
                          ) : null}
                        </View>
                      </CpTableCell>
                    </tr>
                  );
                })}
              </tbody>
            </CpTable>
          )}
        </View>

        {registry.detailState.kind === "loading" ? (
          <View style={styles.section}>
            <CpStateView kind="loading" title="جاري تحميل تفاصيل المزود…" />
          </View>
        ) : null}

        {registry.detailState.kind === "error" ? (
          <View style={styles.section}>
            <CpStatePanel role="alert" title="تعذر تحميل تفاصيل المزود" description={registry.detailState.message} />
          </View>
        ) : null}

        {registry.detailState.kind === "success" ? (
          <View style={styles.section}>
            <Text role="titleSm">تفاصيل المزود المحدد</Text>
            <Card>
              <View style={styles.detail}>
                <Text>المعرّف: {registry.detailState.provider.providerId}</Text>
                <Text>الرمز: {registry.detailState.provider.code}</Text>
                <Text>النوع: {registry.detailState.provider.kind}</Text>
                <Text>الحالة: {registry.detailState.provider.active ? "نشط" : "غير نشط"}</Text>
                <Text>
                  بيانات الاعتماد: {credentialLabel(registry.detailState.provider.credentialConfigured)}
                </Text>
                <Text>
                  مفاتيح الإعدادات العامة: {Object.keys(registry.detailState.provider.parameters ?? {}).sort().join("، ") || "لا يوجد"}
                </Text>
                <Text>آخر تحديث: {registry.detailState.provider.updatedAt}</Text>
              </View>
            </Card>
          </View>
        ) : null}

        {registry.mutationState.kind === "error" ? (
          <View style={styles.section}>
            <CpStatePanel role="alert" title="تعذر تحديث المزود" description={registry.mutationState.message} />
          </View>
        ) : null}

        {registry.mutationState.kind === "success" ? (
          <View style={styles.section}>
            <CpStatePanel
              role="status"
              title="تم تحديث حالة المزود"
              description="تمت الكتابة في خدمة providers ثم أُعيدت قراءة السجل والصحة من المصدر التشغيلي. إذا كان التحديث مفتاح خرائط Android، فيجب مزامنته إلى EAS وتشغيل build جديد للميداني."
            />
          </View>
        ) : null}

        <Card>
          <View style={styles.notice}>
            <Text role="caption">
              التفعيل والتعطيل يمران عبر صلاحية provider:update ويُسجّلان في التدقيق. قيم credentials كتابية فقط داخل العقد ولا تُعرض أو تُحفظ محليًا في الواجهة. إعدادات الدفع تبقى ضمن حدود WLT المالية.
            </Text>
          </View>
        </Card>

        <CpStatePanel
          role="status"
          title="الحد المالي لـ WLT"
          description="مزود الدفع يخضع لحدود WLT. DSH لا يمتلك الحقيقة المالية ولا يعدّل بيانات الدفع أو التسويات."
        />
      </View>
    </DataTablePageFrame>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing[4] },
  section: { gap: spacing[2] },
  notice: { padding: spacing[3] },
  detail: { padding: spacing[3], gap: spacing[2] },
  actions: { flexDirection: "row", gap: spacing[1] },
});
