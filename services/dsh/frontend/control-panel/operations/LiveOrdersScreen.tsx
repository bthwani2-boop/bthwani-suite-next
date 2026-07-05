import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelKpiStrip,
  WebControlPanelDecisionRow,
  WebControlPanelRecommendation,
  WebControlPanelQueue,
} from '@bthwani/ui-kit/web';
import { Box, Text } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import type { DshFulfillmentOperationalMode } from './operations.types';
import { DSH_FULFILLMENT_OPERATIONAL_MODE_META } from './operations.types';
import { fetchDshRuntimeOrders, type DshRuntimeOrderRow } from '../../shared/operations/dsh-operational-runtime-adapter';
import { resolveRuntimeOrderStatusTone } from '../../shared/runtime';
import { opsTheme as theme } from '../../shared/operations';

export type LiveOrdersScreenProps = {
  state?: 'ready' | 'loading' | 'error' | 'empty';
  hubHref: string;
  subGroup?: string;
  onRetry?: () => void;
};

const FULFILLMENT_MODE_IDS: readonly DshFulfillmentOperationalMode[] = ['bthwani_delivery', 'partner_delivery', 'pickup'];

// Live orders is runtime-only: every row comes from the DSH backend orders
// API. There is intentionally no preview/local fallback path — when the
// runtime is unreachable the screen says so plainly instead of rendering
// fabricated queues or local-only success feedback.
export function LiveOrdersScreen({ state = 'ready', subGroup, onRetry }: LiveOrdersScreenProps) {
  const router = useRouter();
  const activeMode = FULFILLMENT_MODE_IDS.find((m) => m === subGroup) ?? null;
  const [retryCount, setRuntimeRetryCount] = React.useState(0);
  const retry = React.useCallback(() => setRuntimeRetryCount((n) => n + 1), []);
  const [runtimeState, setRuntimeState] = React.useState<{
    orders: readonly DshRuntimeOrderRow[];
    total: number;
    loaded: boolean;
    offline: boolean;
    error: string | null;
  }>({ orders: [], total: 0, loaded: false, offline: false, error: null });

  React.useEffect(() => {
    let cancelled = false;
    fetchDshRuntimeOrders({ limit: 100 }).then((result) => {
      if (cancelled) return;
      if (result.kind === 'ok') {
        setRuntimeState({ orders: result.orders, total: result.total, loaded: true, offline: false, error: null });
      } else if (result.kind === 'offline') {
        setRuntimeState((s) => ({ ...s, offline: true, loaded: false }));
      } else {
        setRuntimeState((s) => ({ ...s, error: result.message, loaded: false }));
      }
    });
    return () => { cancelled = true; };
  }, [retryCount]);

  if (state === 'loading') {
    return (
      <div className={styles.surfaceInnerScroll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <p style={{ color: theme.textMuted, fontSize: '13px' }}>جارٍ تحميل العمليات الحية...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.surfaceInnerScroll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', border: `1px solid ${theme.danger}`, padding: '24px', borderRadius: '10px', background: theme.dangerSurface }}>
          <p style={{ color: theme.dangerText, fontSize: '13px', marginBottom: '12px' }}>تعذر الاتصال بخادم العمليات المباشرة.</p>
          <button type="button" onClick={onRetry} style={{ padding: '6px 18px', background: theme.danger, color: theme.textInverse, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const runtimeActive = runtimeState.loaded;
  const pendingAcceptanceCount = runtimeState.orders.filter((order) => order.status === 'pending').length;

  const summaryKpi = [
    { id: 'live', label: 'الطلبات النشطة', value: runtimeActive ? String(runtimeState.total) : '—', tone: 'neutral' as const },
    { id: 'pending-acceptance', label: 'بانتظار قبول المتجر', value: runtimeActive ? String(pendingAcceptanceCount) : '—', tone: 'warning' as const },
    { id: 'source', label: 'مصدر البيانات', value: runtimeActive ? 'DSH Runtime' : 'غير متصل', tone: runtimeActive ? ('success' as const) : ('danger' as const) },
  ];

  return (
    <Box gap={3}>
      <WebControlPanelKpiStrip items={summaryKpi} />

      <div className={styles.surfaceSplitGrid}>
        <Box gap={3}>
          <WebControlPanelQueue
            title="الطلبات المباشرة (Runtime)"
            meta={runtimeActive ? `${runtimeState.total} طلبات نشطة` : 'runtime غير متاح'}
          >
            {runtimeActive ? (
              runtimeState.orders.map((order) => (
                <WebControlPanelDecisionRow
                  key={order.id}
                  entityId={order.id}
                  entityLabel={`متجر: ${order.storeId} — عميل: ${order.clientId}${order.captainId ? ` — كابتن: ${order.captainId}` : ''}`}
                  status={order.status}
                  statusTone={resolveRuntimeOrderStatusTone(order.status)}
                  sla={`تاريخ الإنشاء: ${new Date(order.createdAt).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                  onInspect={() => router.push(`/operations?group=exceptions&orderId=${order.id}`)}
                  {...(order.status === 'pending' ? {
                    primaryAction: {
                      id: `${order.id}-dispatch`,
                      label: 'إسناد كابتن',
                      onAction: () => router.push(`/operations?group=dispatch-capacity&orderId=${order.id}`),
                    },
                  } : {})}
                />
              ))
            ) : (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <Text role="bodySm" tone="muted">
                  {runtimeState.error
                    ? `تعذر تحميل الطلبات من runtime: ${runtimeState.error}`
                    : 'خادم DSH غير متاح — لا تُعرض أي بيانات بديلة أو تجريبية في هذه القائمة.'}
                </Text>
                <div style={{ marginTop: '10px' }}>
                  <button type="button" onClick={retry} style={{ padding: '6px 18px', background: theme.danger, color: theme.textInverse, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>إعادة المحاولة</button>
                </div>
              </div>
            )}
          </WebControlPanelQueue>

          {activeMode && (
            <WebControlPanelQueue
              title={DSH_FULFILLMENT_OPERATIONAL_MODE_META[activeMode]?.label || activeMode}
              meta={DSH_FULFILLMENT_OPERATIONAL_MODE_META[activeMode]?.operationalOwner ?? 'غير محدد'}
            >
              <div style={{ padding: '12px' }}>
                <Text role="bodySm" tone="muted">
                  قوائم قناة التنفيذ غير مربوطة بمصدر runtime بعد (UI_ONLY_BLOCKED). تُدار الطلبات من قائمة الطلبات المباشرة أعلاه حتى يُنشر مصدر بيانات معتمد لهذه القناة — لا تُعرض صفوف أو إجراءات وهمية هنا.
                </Text>
              </div>
            </WebControlPanelQueue>
          )}
        </Box>

        <Box gap={4}>
          <WebControlPanelRecommendation
            title="تفاصيل الإجراء والتحكم"
            reason="افتح أي طلب مباشر من القائمة للانتقال إلى مساحة الاستثناءات، أو استخدم إجراء إسناد الكابتن للطلبات المعلقة — كل الإجراءات هنا تمر عبر مسارات backend حقيقية فقط."
            confidence="high"
            auditTag="LIVE_ORDERS_MONITOR"
          />
        </Box>
      </div>
    </Box>
  );
}

export default LiveOrdersScreen;
