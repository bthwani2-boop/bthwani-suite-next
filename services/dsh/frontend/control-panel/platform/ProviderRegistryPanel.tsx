"use client";

import {
  Badge,
  Card,
  DataTable,
  Header,
  ScrollScreen,
  StateView,
  Text,
  spacing,
} from "@bthwani/ui-kit";
import { WebView as View, WebStyleSheet as StyleSheet } from "@bthwani/ui-kit/web";
import { PLATFORM_PROVIDER_REGISTRY, toProviderVisibleFields } from "../../shared/platform";
import type { ProviderVisibleFields } from "../../shared/platform";
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

import React, { useEffect, useState } from "react";
import { listProviders, getProviderHealth } from "../../shared/platform";
import type { ExternalProvider, ExternalProviderHealthItem } from "../../shared/platform";

function externalToVisibleProvider(ep: ExternalProvider): ProviderVisibleFields {
  return {
    id: ep.providerId,
    kind: ep.kind,
    label: ep.kind === "maps" ? "خرائط قوقل وسحابة الموقع (Google Maps)" : ep.code,
    selectedProvider: ep.code,
    fallbackProvider: null,
    environment: "production",
    status: ep.active ? "active" : "inactive",
    credentialVisibility: "backend_secret_only",
    maskedCredential: "••••••••",
    lastHealthStatus: "healthy",
    lastHealthCheckedAt: ep.updatedAt ?? null,
    affectedSurfaces: ep.kind === "maps" ? ["dsh-client", "dsh-captain", "dsh-operator"] : [],
    wltBoundary: false,
    auditRequired: false,
    rollbackTarget: null,
    publicRuntimeConfig: {},
  };
}

export function ProviderRegistryPanel() {
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [health, setHealth] = useState<ExternalProviderHealthItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listProviders(),
      getProviderHealth()
    ])
      .then(([providersData, healthData]) => {
        setProviders(providersData || []);
        setHealth(healthData?.providers || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load providers from backend", err);
        setProviders([]);
        setHealth([]);
        setLoading(false);
      });
  }, []);

  const mapsProvider = providers.find((p) => p.kind === "maps");
  const mappedMapsProvider = mapsProvider ? externalToVisibleProvider(mapsProvider) : null;

  return (
    <ScrollScreen>
      <Header title="سجل مزودي المنصة" subtitle="إدارة مزودي الخرائط والمدفوعات والبنية التحتية" />

      {mappedMapsProvider && (
        <View style={styles.section}>
          <Text role="titleSm">مزود الخرائط</Text>
          <MapsProviderInspector provider={mappedMapsProvider} />
        </View>
      )}

      <View style={styles.section}>
        <Text role="titleSm">جميع المزودين</Text>
        <DataTable<any>
          columns={[
            { key: "providerId", header: "المعرّف", render: (row) => row.providerId || row.id },
            { key: "code", header: "المزود", render: (row) => row.code || row.label },
            { key: "kind", header: "النوع", render: (row) => row.kind },
            {
              key: "status",
              header: "الحالة",
              render: (row) => {
                const status = row.active !== undefined ? (row.active ? "active" : "inactive") : row.status;
                return <Badge label={status as string} tone={STATUS_TONE[status as string] ?? "neutral"} />;
              },
            },
            {
              key: "lastHealthStatus",
              header: "الصحة",
              render: (row) => {
                const h = health.find(item => item.kind === row.kind);
                const healthStatus = h ? h.status : (row.lastHealthStatus || "unknown");
                return <Badge label={healthStatus as string} tone={HEALTH_TONE[healthStatus as string] ?? "neutral"} />;
              },
            },
            {
              key: "message",
              header: "تفاصيل الصحة",
              render: (row) => {
                const h = health.find(item => item.kind === row.kind);
                return h?.message || "—";
              }
            }
          ]}
          rows={providers}
          getRowKey={(row) => (row.providerId || row.id) as string}
        />
      </View>

      <Card>
        <View style={styles.notice}>
          <Text role="caption">
            تعديل المزودين يتطلب عقد Backend موثق. لا يمكن تطبيق أي تغيير محلياً أو كمعاينة فقط.
          </Text>
        </View>
      </Card>

      <StateView
        tone="info"
        title="الحد المالي لـ WLT"
        description="مزود الدفع يخضع لحدود WLT. DSH لا يمتلك الحقيقة المالية ولا يعدّل بيانات الدفع مباشرة."
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  section: { margin: spacing[4], gap: spacing[2] },
  notice: { padding: spacing[3] },
});
