import React, { useEffect, useState } from "react";
import { formatWltMoney } from "@bthwani/dsh/wlt";
import { Button, LoadingState, StateView, Surface, Text, Badge, colorRoles, spacing, alpha, radius } from "@bthwani/ui-kit";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";
import { resolveDshApiBaseUrl } from "../../shared/_kernel/dsh-api-base-url";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "cp-carts");

type CartIdempotencyRecord = {
  readonly idempotencyKey: string;
  readonly version: number;
  readonly deviceId: string | null;
  readonly sessionId: string | null;
  readonly createdAt: string;
};

type CartDiagnosticsView = {
  readonly id: string;
  readonly clientId: string;
  readonly storeId: string;
  readonly state: string;
  readonly version: number;
  readonly updatedAt: string;
};

type DiagnosticsResponse = {
  readonly cart: CartDiagnosticsView;
  readonly history: readonly CartIdempotencyRecord[];
};

export const CartSyncDiagnostics = ({ cartId, onBack }: { readonly cartId: string; readonly onBack: () => void }) => {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await request<DiagnosticsResponse>(`/dsh/internal/operations/carts/${encodeURIComponent(cartId)}/sync-diagnostics`);
        if (active) setData(resp);
      } catch (err: any) {
        if (active) setError(err?.message || "Failed to load sync diagnostics");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [cartId]);

  if (loading) return <LoadingState title="جاري التحقق" description="جاري تحميل سجل المزامنة..." />;
  if (error) return <StateView title="خطأ" description={error} actionLabel="عودة" onActionPress={onBack} />;
  if (!data) return null;

  return (
    <Surface tone="default" style={styles.container}>
      <div style={styles.header}>
        <Button label="عودة" tone="secondary" size="sm" onPress={onBack} />
        <div style={styles.titleContainer}>
          <Text role="titleLg">سجل عمليات السلة (Diagnostics)</Text>
          <Text role="caption" style={styles.mutedText}>
            السلة: {data.cart.id} | الإصدار الحالي: {data.cart.version}
          </Text>
        </div>
      </div>

      <div style={styles.list}>
        {data.history.length === 0 ? (
          <StateView title="لا توجد عمليات مسجلة" description="لم يتم تسجيل أي تعديلات على هذه السلة بعد." />
        ) : (
          data.history.map((record, i) => (
            <div key={`${record.idempotencyKey}-${i}`} style={styles.recordCard}>
              <div style={styles.recordHeader}>
                <Badge label={`الإصدار ${record.version}`} tone={record.version === data.cart.version ? "success" : "neutral"} />
                <Text role="caption" style={styles.timeText}>
                  {new Date(record.createdAt).toLocaleString("ar-SA")}
                </Text>
              </div>
              <div style={styles.recordDetails}>
                <Text role="bodySm" style={styles.detailRow}>
                  <Text weight="bold">مفتاح العملية (Idempotency): </Text>
                  <Text style={styles.mono}>{record.idempotencyKey}</Text>
                </Text>
                <Text role="bodySm" style={styles.detailRow}>
                  <Text weight="bold">الجهاز (Device ID): </Text>
                  <Text style={styles.mono}>{record.deviceId || "غير متوفر"}</Text>
                </Text>
                <Text role="bodySm" style={styles.detailRow}>
                  <Text weight="bold">الجلسة (Session ID): </Text>
                  <Text style={styles.mono}>{record.sessionId || "غير متوفر"}</Text>
                </Text>
              </div>
            </div>
          ))
        )}
      </div>
    </Surface>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: colorRoles.surfaceWarm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
  },
  titleContainer: {
    alignItems: "flex-end",
    gap: spacing[1],
  },
  mutedText: {
    color: colorRoles.textSecondary,
  },
  list: {
    padding: spacing[4],
    gap: spacing[3],
  },
  recordCard: {
    backgroundColor: colorRoles.surfaceBase,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[3],
  },
  recordHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
    paddingBottom: spacing[2],
  },
  timeText: {
    color: colorRoles.textSecondary,
  },
  recordDetails: {
    gap: spacing[2],
  },
  detailRow: {
    textAlign: "right",
    color: colorRoles.textPrimary,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 13,
    color: colorRoles.textSecondary,
  },
} as const;
