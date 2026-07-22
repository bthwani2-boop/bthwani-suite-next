"use client";

import {
  Badge,
  Button,
  Card,
  DataTable,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import {
  useProviderRegistryController,
  type ProviderRegistryItem,
} from "../../shared/platform";
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

export type ProviderRegistryPanelProps = {
  readonly canRead: boolean;
  readonly canUpdate: boolean;
};

export function ProviderRegistryPanel({ canRead, canUpdate }: ProviderRegistryPanelProps) {
  const registry = useProviderRegistryController(canRead);

  if (!canRead) {
    return (
      <ScrollScreen>
        <Header title="سجل مزودي المنصة" subtitle="مزودو الخرائط والمدفوعات والبنية التحتية" />
        <StateView
          tone="danger"
          title="صلاحية قراءة المزودين مطلوبة"
          description="لا يتم استدعاء خدمة providers قبل تحقق provider:read على سطح لوحة التحكم."
        />
      </ScrollScreen>
    );
  }

  if (registry.state.kind === "loading" || registry.state.kind === "idle") {
    return (
      <ScrollScreen>
        <Header title="سجل مزودي المنصة" subtitle="مزودو الخرائط والمدفوعات والبنية التحتية" />
        <StateView title="جاري تحميل المزودين…" />
      </ScrollScreen>
    );
  }

  if (registry.state.kind === "error") {
    return (
      <ScrollScreen>
        <Header title="سجل مزودي المنصة" subtitle="مزودو الخرائط والمدفوعات والبنية التحتية" />
        <StateView
          tone="danger"
          title="تعذر تحميل سجل المزودين"
          description={registry.state.message}
          actionLabel="إعادة المحاولة"
          onActionPress={registry.reload}
        />
      </ScrollScreen>
    );
  }

  const providers = registry.state.items;
  const mapsProvider = providers.find((provider) => provider.kind === "maps") ?? null;

  return (
    <ScrollScreen>
      <Header
        title="سجل مزودي المنصة"
        subtitle="قراءة وتحديث محكومان من خدمة providers؛ قيم الاعتماد لا تُعاد إلى المتصفح ولا تظهر في سجل التدقيق."
      />

      {!canUpdate ? (
        <View style={styles.section}>
          <StateView
            tone="info"
            title="وضع القراءة فقط"
            description="يمكن قراءة السجل والصحة والتفاصيل، لكن التفعيل والتعطيل مخفيان لعدم توفر provider:update."
          />
        </View>
      ) : null}

      {mapsProvider ? (
        <View style={styles.section}>
          <Text role="titleSm">مزود الخرائط</Text>
          <MapsProviderInspector provider={mapsProvider} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text role="titleSm">جميع المزودين</Text>
        {providers.length === 0 ? (
          <StateView
            tone="neutral"
            title="لا يوجد مزودون مسجلون"
            description="لم تُرجع خدمة providers أي سجل تشغيلي، ولا تُعرض سجلات محلية أو تجريبية بديلة."
          />
        ) : (
          <DataTable<ProviderRegistryItem & Record<string, unknown>>
            columns={[
              { key: "providerId", header: "المعرّف", render: (row) => row.providerId },
              { key: "code", header: "المزود", render: (row) => row.code },
              { key: "kind", header: "النوع", render: (row) => row.kind },
              {
                key: "status",
                header: "الحالة",
                render: (row) => (
                  <Badge label={row.status} tone={STATUS_TONE[row.status] ?? "neutral"} />
                ),
              },
              {
                key: "lastHealthStatus",
                header: "الصحة الحية",
                render: (row) => (
                  <Badge
                    label={row.lastHealthStatus}
                    tone={HEALTH_TONE[row.lastHealthStatus] ?? "neutral"}
                  />
                ),
              },
              {
                key: "credentialConfigured",
                header: "بيانات الاعتماد",
                render: (row) => (
                  <Badge
                    label={credentialLabel(row.credentialConfigured)}
                    tone={row.credentialConfigured ? "success" : "warning"}
                  />
                ),
              },
              {
                key: "healthMessage",
                header: "تفاصيل الصحة",
                render: (row) => row.healthMessage ?? "—",
              },
              {
                key: "actions",
                header: "الإجراءات",
                render: (row) => {
                  const mutationLoading =
                    registry.mutationState.kind === "loading" &&
                    registry.mutationState.providerId === row.providerId;
                  return (
                    <View style={styles.actions}>
                      <Button
                        label="التفاصيل"
                        disabled={mutationLoading}
                        onPress={() => void registry.selectProvider(row.providerId)}
                      />
                      {canUpdate ? (
                        <Button
                          label={row.active ? "تعطيل" : "تفعيل"}
                          loading={mutationLoading}
                          disabled={mutationLoading}
                          onPress={() => void registry.setProviderActive(row.providerId, !row.active)}
                        />
                      ) : null}
                    </View>
                  );
                },
              },
            ]}
            rows={providers as readonly (ProviderRegistryItem & Record<string, unknown>)[]}
            getRowKey={(row) => row.providerId}
          />
        )}
      </View>

      {registry.detailState.kind === "loading" ? (
        <View style={styles.section}>
          <StateView title="جاري تحميل تفاصيل المزود…" />
        </View>
      ) : null}

      {registry.detailState.kind === "error" ? (
        <View style={styles.section}>
          <StateView
            tone="danger"
            title="تعذر تحميل تفاصيل المزود"
            description={registry.detailState.message}
          />
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
          <StateView
            tone="danger"
            title="تعذر تحديث المزود"
            description={registry.mutationState.message}
          />
        </View>
      ) : null}

      {registry.mutationState.kind === "success" ? (
        <View style={styles.section}>
          <StateView
            tone="success"
            title="تم تحديث حالة المزود"
            description="تمت الكتابة في خدمة providers ثم أُعيدت قراءة السجل والصحة من المصدر التشغيلي."
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

      <StateView
        tone="info"
        title="الحد المالي لـ WLT"
        description="مزود الدفع يخضع لحدود WLT. DSH لا يمتلك الحقيقة المالية ولا يعدّل بيانات الدفع أو التسويات."
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
  notice: { padding: spacing[3] },
  detail: { padding: spacing[3], gap: spacing[2] },
  actions: { gap: spacing[1] },
});
