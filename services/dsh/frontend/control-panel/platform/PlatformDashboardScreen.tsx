"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Text, spacing } from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import {
  CpButton,
  CpKpiCard,
  CpKpiStrip,
  CpPageHeader,
  CpRetryButton,
  CpStatePanel,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from "@bthwani/control-panel/components";
import { DataTablePageFrame } from "@bthwani/control-panel/shell";
import {
  PLATFORM_MAIN_TABS,
  PLATFORM_OWNERSHIP,
  usePlatformControlRuntimeController,
  type PlatformControlReadModel,
  type PlatformControlResource,
  type PlatformMainTabId,
} from "../../shared/platform";
import { useControlPanelSession } from "../../shared/session/control-panel-session";
import { ProviderRegistryPanel } from "./ProviderRegistryPanel";

type ExecutiveTabId = Exclude<PlatformMainTabId, "notifications">;

type SessionIdentity = {
  readonly permissions?: readonly {
    readonly service?: string;
    readonly surface?: string;
    readonly action?: string;
    readonly scope?: string;
  }[];
};

const EXECUTIVE_TABS = PLATFORM_MAIN_TABS.filter(
  (tab) => tab.id !== "notifications",
);

function hasPlatformPermission(identity: SessionIdentity, action: string): boolean {
  return identity.permissions?.some((permission) =>
    (permission.service === "dsh" || permission.service === "core") &&
    permission.surface === "control-panel" &&
    (permission.scope === "all" || permission.scope === "*") &&
    (permission.action === action || permission.action === "*"),
  ) ?? false;
}

function resourceFailure(
  data: PlatformControlReadModel,
  resource: PlatformControlResource,
): string | null {
  return data.unavailable.find((failure) => failure.resource === resource)?.message ?? null;
}

function isRestricted(
  data: PlatformControlReadModel,
  resource: PlatformControlResource,
): boolean {
  return data.restricted.includes(resource);
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "READ_ONLY_BOUND") return "success";
  if (status === "PARTIALLY_BOUND" || status === "UNKNOWN_HEALTH") return "warning";
  if (status === "FIX_REQUIRED" || status === "ROLLBACK_UNAVAILABLE") return "danger";
  return "neutral";
}

function EmptyRuntimeState({
  title,
  state,
}: {
  readonly title: string;
  readonly state: string;
}) {
  return (
    <CpStatePanel
      role="status"
      title={title}
      description="لا تُعرض بيانات تجريبية أو قيم محلية. هذه هي الحالة الفعلية التي أعادها platform-control."
      code={state}
    />
  );
}

function OverviewTab({ data }: { readonly data: PlatformControlReadModel }) {
  const effective = data.effectiveConfig;
  return (
    <View style={styles.stack}>
      <CpStatePanel
        role="status"
        title={`الحالة السيادية: ${data.snapshot.status}`}
        description={data.snapshot.evidence.join(" / ")}
        code={`revision=${data.snapshot.revision}; generatedAt=${data.snapshot.generatedAt}`}
      />

      {effective ? (
        <Card>
          <View style={styles.cardContent}>
            <Text role="titleSm">الإعداد الفعلي</Text>
            <Text role="caption">المراجعة: {effective.revision}</Text>
            <Text role="caption">
              stale={String(effective.stale)} / fallback={String(effective.fallbackUsed)}
            </Text>
            <Text role="caption">{effective.evaluationTrace.join(" / ")}</Text>
          </View>
        </Card>
      ) : (
        <CpStatePanel
          role="alert"
          title="تعذر قراءة الإعداد الفعلي"
          code={resourceFailure(data, "effective-config") ?? "EFFECTIVE_CONFIG_UNAVAILABLE"}
        />
      )}

      {data.unavailable.length > 0 ? (
        <CpStatePanel
          role="alert"
          title="بعض مصادر المنصة غير متاحة"
          description={data.unavailable
            .map((failure) => `${failure.resource}: ${failure.message}`)
            .join(" / ")}
          code="PLATFORM_PARTIAL_READ"
        />
      ) : null}
    </View>
  );
}

function VariablesTab({ data }: { readonly data: PlatformControlReadModel }) {
  const variablesFailure = resourceFailure(data, "variables");
  const flagsFailure = resourceFailure(data, "feature-flags");

  return (
    <View style={styles.stack}>
      <Text role="titleSm">المتغيرات السيادية</Text>
      {variablesFailure ? (
        <CpStatePanel role="alert" title="تعذر تحميل المتغيرات" code={variablesFailure} />
      ) : data.variables.length === 0 ? (
        <EmptyRuntimeState
          title="لا يوجد مخزن متغيرات متصل"
          state={data.snapshot.variablesState}
        />
      ) : (
        <CpTable aria-label="المتغيرات السيادية">
          <thead>
            <tr>
              <CpTableHeaderCell>المفتاح</CpTableHeaderCell>
              <CpTableHeaderCell>المالك</CpTableHeaderCell>
              <CpTableHeaderCell>النطاق</CpTableHeaderCell>
              <CpTableHeaderCell>المراجعة</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {data.variables.map((variable) => (
              <tr key={`${variable.key}:${variable.scopeType}:${variable.scopeId ?? "global"}`}>
                <CpTableCell>{variable.key}</CpTableCell>
                <CpTableCell>{variable.ownerService}</CpTableCell>
                <CpTableCell>{variable.scopeType}{variable.scopeId ? ` / ${variable.scopeId}` : ""}</CpTableCell>
                <CpTableCell>{variable.revision}</CpTableCell>
                <CpTableCell>{variable.status}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}

      <Text role="titleSm">أعلام الميزات</Text>
      {flagsFailure ? (
        <CpStatePanel role="alert" title="تعذر تحميل أعلام الميزات" code={flagsFailure} />
      ) : data.featureFlags.length === 0 ? (
        <EmptyRuntimeState
          title="لا توجد أعلام ميزات تشغيلية"
          state={data.snapshot.flagsState}
        />
      ) : (
        <CpTable aria-label="أعلام الميزات">
          <thead>
            <tr>
              <CpTableHeaderCell>المفتاح</CpTableHeaderCell>
              <CpTableHeaderCell>التفعيل</CpTableHeaderCell>
              <CpTableHeaderCell>المراجعة</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {data.featureFlags.map((flag) => (
              <tr key={flag.key}>
                <CpTableCell>{flag.key}</CpTableCell>
                <CpTableCell>{flag.enabled == null ? "غير محدد" : flag.enabled ? "مفعّل" : "متوقف"}</CpTableCell>
                <CpTableCell>{flag.revision}</CpTableCell>
                <CpTableCell>{flag.status}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}

      <CpStatePanel
        role="status"
        title="التغييرات محجوبة حتى يكتمل Change Workflow"
        description="لا اقتراح، ولا اعتماد، ولا تطبيق محلي، ولا تعديل مباشر للمتغيرات أو الأعلام من الواجهة."
        code="PLATFORM_CHANGE_WORKFLOW_CONTRACT_REQUIRED"
      />
    </View>
  );
}

function ServicesTab({ data }: { readonly data: PlatformControlReadModel }) {
  const failure = resourceFailure(data, "services");
  if (failure) {
    return <CpStatePanel role="alert" title="تعذر تحميل حالة الخدمات" code={failure} />;
  }
  if (data.services.length === 0) {
    return <EmptyRuntimeState title="لا توجد خدمات مرصودة" state={data.snapshot.servicesState} />;
  }

  return (
    <CpTable aria-label="حالة خدمات المنصة">
      <thead>
        <tr>
          <CpTableHeaderCell>الخدمة</CpTableHeaderCell>
          <CpTableHeaderCell>الحالة</CpTableHeaderCell>
          <CpTableHeaderCell>مصدر الدليل</CpTableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {data.services.map((service) => (
          <tr key={service.service}>
            <CpTableCell>{service.service}</CpTableCell>
            <CpTableCell>
              <Badge label={service.state} tone={statusTone(service.state)} />
            </CpTableCell>
            <CpTableCell>{service.evidenceSource}</CpTableCell>
          </tr>
        ))}
      </tbody>
    </CpTable>
  );
}

function HealthTab({ data }: { readonly data: PlatformControlReadModel }) {
  if (isRestricted(data, "health")) {
    return (
      <CpStatePanel
        role="alert"
        title="صلاحية صحة المنصة مطلوبة"
        code="PLATFORM_HEALTH_PERMISSION_REQUIRED"
      />
    );
  }
  const failure = resourceFailure(data, "health");
  if (failure) {
    return <CpStatePanel role="alert" title="تعذر تحميل صحة المنصة" code={failure} />;
  }
  if (!data.health) {
    return <EmptyRuntimeState title="لا توجد قراءة صحة" state={data.snapshot.healthState} />;
  }

  return (
    <View style={styles.stack}>
      <CpStatePanel
        role="status"
        title={`حالة الصحة: ${data.health.state}`}
        code={`checkedAt=${data.health.checkedAt}`}
      />
      <ServicesTab data={{ ...data, services: data.health.services }} />
    </View>
  );
}

function RollbackTab({ data }: { readonly data: PlatformControlReadModel }) {
  const changeFailure = resourceFailure(data, "change-sets");
  const auditFailure = resourceFailure(data, "audit-events");

  return (
    <View style={styles.stack}>
      <CpStatePanel
        role="status"
        title={`حالة التراجع: ${data.snapshot.rollbackState}`}
        description="لا يُعرض زر تراجع ما دام سجل التغييرات والتطبيق والتدقيق غير متصلين بمخزن سيادي."
        code={`audit=${data.snapshot.auditState}`}
      />

      <Text role="titleSm">طلبات التغيير</Text>
      {changeFailure ? (
        <CpStatePanel role="alert" title="تعذر تحميل طلبات التغيير" code={changeFailure} />
      ) : data.changeSets.length === 0 ? (
        <EmptyRuntimeState title="لا توجد طلبات تغيير تشغيلية" state={data.snapshot.rollbackState} />
      ) : (
        <CpTable aria-label="طلبات تغيير المنصة">
          <thead>
            <tr>
              <CpTableHeaderCell>المعرّف</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>تاريخ الإنشاء</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {data.changeSets.map((changeSet) => (
              <tr key={changeSet.id}>
                <CpTableCell>{changeSet.id}</CpTableCell>
                <CpTableCell>{changeSet.status}</CpTableCell>
                <CpTableCell>{changeSet.createdAt}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}

      <Text role="titleSm">سجل التدقيق</Text>
      {isRestricted(data, "audit-events") ? (
        <CpStatePanel
          role="alert"
          title="صلاحية سجل التدقيق مطلوبة"
          code="PLATFORM_AUDIT_PERMISSION_REQUIRED"
        />
      ) : auditFailure ? (
        <CpStatePanel role="alert" title="تعذر تحميل سجل التدقيق" code={auditFailure} />
      ) : data.auditEvents.length === 0 ? (
        <EmptyRuntimeState title="لا توجد أحداث تدقيق تشغيلية" state={data.snapshot.auditState} />
      ) : (
        <CpTable aria-label="سجل تدقيق المنصة">
          <thead>
            <tr>
              <CpTableHeaderCell>الإجراء</CpTableHeaderCell>
              <CpTableHeaderCell>المنفذ</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
              <CpTableHeaderCell>الوقت</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {data.auditEvents.map((event) => (
              <tr key={event.id}>
                <CpTableCell>{event.action}</CpTableCell>
                <CpTableCell>{event.actorId}</CpTableCell>
                <CpTableCell>{event.status}</CpTableCell>
                <CpTableCell>{event.createdAt}</CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      )}
    </View>
  );
}

function CanaryTab({ data }: { readonly data: PlatformControlReadModel }) {
  return (
    <CpStatePanel
      role="status"
      title="الإطلاق التدريجي غير مفعّل"
      description="لا توجد واجهة تنفيذ أو محاكاة. التفعيل يتطلب استهدافًا، مقاييس صحة، إيقافًا، إلغاءً، وتراجعًا موثقًا في platform-control."
      code={data.snapshot.rolloutsState}
    />
  );
}

export function PlatformDashboardScreen() {
  const [mainTab, setMainTab] = useState<ExecutiveTabId>("overview");
  const { state } = useControlPanelSession();

  const identity = state.kind === "authenticated" ? state.identity : null;
  const canReadPlatform = identity ? hasPlatformPermission(identity, "platform:read") : false;
  const canReadHealth = identity ? hasPlatformPermission(identity, "platform:health:read") : false;
  const canReadAudit = identity ? hasPlatformPermission(identity, "platform:audit:read") : false;

  const runtime = usePlatformControlRuntimeController({
    enabled: canReadPlatform,
    health: canReadHealth,
    audit: canReadAudit,
  });

  const metrics = useMemo(() => {
    if (runtime.state.kind !== "success") {
      return { variables: "—", flags: "—", services: "—", unavailable: "—" };
    }
    return {
      variables: runtime.state.data.variables.length,
      flags: runtime.state.data.featureFlags.filter((flag) => flag.enabled === true).length,
      services: runtime.state.data.services.length,
      unavailable: runtime.state.data.unavailable.length,
    };
  }, [runtime.state]);

  if (!canReadPlatform) {
    return (
      <DataTablePageFrame
        dir="rtl"
        header={<CpPageHeader title="منصة DSH السيادية" />}
      >
        <View style={styles.content}>
          <CpStatePanel
            role="alert"
            title="صلاحية المنصة مطلوبة"
            description="هذا القسم مخصص للإدارة العليا ولا يعرض أي بيانات قبل تحقق platform:read على سطح لوحة التحكم."
            code="PLATFORM_PERMISSION_REQUIRED"
          />
        </View>
      </DataTablePageFrame>
    );
  }

  return (
    <DataTablePageFrame
      dir="rtl"
      header={
        <CpPageHeader title="منصة DSH السيادية">
          <Text role="caption">
            مركز قرار تنفيذي لحالة الخدمات والمتغيرات والأعلام والمزودين والصحة والتغيير الآمن؛ لا يحتوي أعمالًا تشغيلية يومية.
          </Text>
          <CpKpiStrip>
            <CpKpiCard label="المتغيرات الفعلية" value={metrics.variables} />
            <CpKpiCard label="الأعلام المفعّلة" value={metrics.flags} />
            <CpKpiCard label="الخدمات المرصودة" value={metrics.services} />
            <CpKpiCard label="مصادر غير متاحة" value={metrics.unavailable} />
          </CpKpiStrip>
        </CpPageHeader>
      }
    >
      <View style={styles.tabs}>
        {EXECUTIVE_TABS.map((tab) => (
          <CpButton
            key={tab.id}
            onClick={() => setMainTab(tab.id as ExecutiveTabId)}
            aria-pressed={mainTab === tab.id}
          >
            {mainTab === tab.id ? `● ${tab.label}` : tab.label}
          </CpButton>
        ))}
      </View>

      <View style={styles.content}>
        {runtime.state.kind === "loading" ? (
          <CpStatePanel role="status" title="جاري تحميل الحقيقة السيادية…" />
        ) : runtime.state.kind === "error" ? (
          <CpStatePanel
            role="alert"
            title="تعذر تحميل platform-control"
            description={runtime.state.message}
            code="PLATFORM_CONTROL_UNAVAILABLE"
          >
            <CpRetryButton onClick={runtime.reload}>إعادة المحاولة</CpRetryButton>
          </CpStatePanel>
        ) : runtime.state.kind === "success" ? (
          <>
            {mainTab === "overview" ? <OverviewTab data={runtime.state.data} /> : null}
            {mainTab === "variables" ? <VariablesTab data={runtime.state.data} /> : null}
            {mainTab === "services" ? <ServicesTab data={runtime.state.data} /> : null}
            {mainTab === "providers" ? <ProviderRegistryPanel /> : null}
            {mainTab === "canary" ? <CanaryTab data={runtime.state.data} /> : null}
            {mainTab === "health" ? <HealthTab data={runtime.state.data} /> : null}
            {mainTab === "rollback" ? <RollbackTab data={runtime.state.data} /> : null}
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text role="caption">المالك: {PLATFORM_OWNERSHIP.owner}</Text>
        <Text role="caption">العقد: core/platform-control</Text>
        <Text role="caption">الوضع الحالي: قراءة سيادية فقط؛ mutations غير مفعّلة</Text>
      </View>
    </DataTablePageFrame>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    padding: spacing[4],
  },
  content: {
    padding: spacing[4],
  },
  stack: {
    gap: spacing[4],
  },
  cardContent: {
    gap: spacing[2],
    padding: spacing[4],
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[4],
    padding: spacing[4],
  },
});
