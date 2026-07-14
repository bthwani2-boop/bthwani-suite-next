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

export function ProviderRegistryPanel() {
  const [providers, setProviders] = useState<any[]>([]);
  const [health, setHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    const headers = token ? { "Authorization": `Bearer ${token}` } : undefined;

    Promise.all([
      fetch("http://localhost:8087/providers", { headers }).then(r => r.ok ? r.json() : []),
      fetch("http://localhost:8087/providers/health", { headers }).then(r => r.ok ? r.json() : { providers: [] })
    ])
      .then(([providersData, healthData]) => {
        if (Array.isArray(providersData) && providersData.length > 0) {
          setProviders(providersData);
        } else {
          setProviders(PLATFORM_PROVIDER_REGISTRY.map(toProviderVisibleFields));
        }
        if (healthData && Array.isArray(healthData.providers)) {
          setHealth(healthData.providers);
        }
        setLoading(false);
      })
      .catch(() => {
        setProviders(PLATFORM_PROVIDER_REGISTRY.map(toProviderVisibleFields));
        setLoading(false);
      });
  }, []);

  const mapsProvider = providers.find((p) => p.kind === "maps");

  return (
    <ScrollScreen>
      <Header title="سجل مزودي المنصة" subtitle="إدارة مزودي الخرائط والمدفوعات والبنية التحتية" />

      {mapsProvider && (
        <View style={styles.section}>
          <Text role="titleSm">مزود الخرائط</Text>
          <MapsProviderInspector provider={mapsProvider} />
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
