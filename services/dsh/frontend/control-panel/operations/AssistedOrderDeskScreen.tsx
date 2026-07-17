'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box } from '@bthwani/ui-kit';
import {
  WebControlPanelDecisionRow,
  WebControlPanelKpiStrip,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import { buildOperationsHref } from './operations.registry';
import { DSH_FULFILLMENT_OPERATIONAL_MODE_META } from './operations.types';
import type { DshFulfillmentDeliveryMode } from '../../shared/delivery/delivery.contract';
import styles from '../shared/control-panel-surface.module.css';

export type AssistedOrderDeskScreenProps = {
  hubHref: string;
  subGroup?: string;
};

import {
  type AssistedOrderDesk,
  type AssistedLookupInput,
  type AssistedOrderPlaybook,
  IDENTITY_STATUS_META,
  SERVICEABILITY_STATUS_META,
  translateDesc,
} from './components/AssistedOrderDesk.types';
import { AssistedOrderDeskInspector } from './components/AssistedOrderDeskInspector';

export function AssistedOrderDeskScreen({ hubHref: _hubHref, subGroup: _subGroup }: AssistedOrderDeskScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [desks, setDesks] = React.useState<AssistedOrderDesk[]>([]);
  // null = no selection = full width queue
  const [selectedDeskId, setSelectedDeskId] = React.useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    import('../../shared/operations/dsh-operational-runtime-adapter').then(({ fetchDshRuntimeOrders }) => {
      fetchDshRuntimeOrders({ limit: 50, scope: 'operator' }).then((result) => {
        if (cancelled) return;
        if (result.kind === 'ok') {
          const mappedDesks: AssistedOrderDesk[] = result.orders.map(o => ({
            deskId: `DESK-${o.id}`,
            orderId: o.id,
            customerId: o.clientId,
            customerName: `عميل ${o.clientId.slice(0, 4)}`,
            basketSummary: `${o.totalPrice} ريال`,
            nextAction: o.status === 'pending' ? 'مراجعة الهوية' : 'تأكيد السلة',
            auditFlags: ['VIP', 'تحذير مالي'],
            lookupPanel: {
              inputs: [
                { key: 'phone', value: '05XXXXXXXX' },
                { key: 'orderId', value: o.id },
              ],
            },
            identityVerification: {
              verificationStatus: o.status === 'pending' ? 'required' : 'verified',
              verificationSteps: [
                { stepId: 'step1', label: 'تأكيد رقم الجوال', completed: o.status !== 'pending' },
                { stepId: 'step2', label: 'تأكيد العنوان', completed: o.status !== 'pending' },
              ],
            },
            cartBuilderPreview: {
              items: [
                { sku: `SKU-${o.id.slice(0, 3)}`, name: 'منتج افتراضي', quantity: 1, status: 'active' },
              ],
            },
            deliveryModeSelector: {
              selectedMode: o.fulfillmentMode as DshFulfillmentDeliveryMode,
              options: [
                { modeId: 'bthwani_delivery', label: 'توصيل بثواني' },
                { modeId: 'partner_delivery', label: 'توصيل شريك' },
                { modeId: 'pickup', label: 'استلام بنفسي' },
              ],
            },
            serviceabilitySummary: {
              serviceabilityStatus: 'serviceable',
              zoneLabel: 'Riyadh / Al Malaz',
            },
            wltReadOnlyHandoff: {
              calculationTruthOwner: 'DSH & WLT',
              paymentVisibility: 'Payment snapshot is read-only from WLT.',
              refundVisibility: 'Refund execution remains WLT-owned; DSH displays status only.',
            },
            auditReason: {
              reasonLabel: 'Assisted order rebuild after manual call confirmation.',
              operatorNote: '',
            },
            submitDraftPreview: {
              nextAction: 'إرسال مسودة للعميل',
            },
          }));
          setDesks(mappedDesks);
        }
      });
    });
    return () => { cancelled = true; };
  }, [retryCount]);

  const selectedDesk = React.useMemo(
    () => (selectedDeskId ? desks.find((d) => d.deskId === selectedDeskId) ?? null : null),
    [desks, selectedDeskId],
  );

  const relevantPlaybook = React.useMemo<AssistedOrderPlaybook | undefined>(
    () => undefined,
    [],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUpdateLookup = (key: string, value: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) =>
        d.deskId === selectedDesk.deskId
          ? { ...d, lookupPanel: { ...d.lookupPanel, inputs: d.lookupPanel.inputs.map((inp: AssistedLookupInput) => (inp.key === key ? { ...inp, value } : inp)) } }
          : d,
      ),
    );
  };

  const handleToggleVerificationStep = (stepId: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        const newSteps = d.identityVerification.verificationSteps.map((step) =>
          step.stepId === stepId ? { ...step, completed: !step.completed } : step,
        );
        const allCompleted = newSteps.every((s) => s.completed);
        return {
          ...d,
          identityVerification: {
            ...d.identityVerification,
            verificationStatus: allCompleted ? 'verified' : 'required',
            verificationSteps: newSteps,
          },
        };
      }),
    );
  };

  const handleUpdateCartItemQty = (sku: string, increment: number) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return {
          ...d,
          cartBuilderPreview: {
            ...d.cartBuilderPreview,
            items: d.cartBuilderPreview.items.map((item) =>
              item.sku === sku ? { ...item, quantity: Math.max(1, item.quantity + increment) } : item,
            ),
          },
        };
      }),
    );
  };

  const handleUpdateCartItemStatus = (sku: string, status: 'active' | 'substitute' | 'unavailable') => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return {
          ...d,
          cartBuilderPreview: {
            ...d.cartBuilderPreview,
            items: d.cartBuilderPreview.items.map((item) => (item.sku === sku ? { ...item, status } : item)),
          },
        };
      }),
    );
  };

  const handleAddCartItem = () => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        const newSku = `SKU-${Math.floor(100 + Math.random() * 900)}`;
        return {
          ...d,
          cartBuilderPreview: {
            ...d.cartBuilderPreview,
            items: [
              ...d.cartBuilderPreview.items,
              { sku: newSku, name: 'تفاح طازج مضاف', quantity: 1, published: true, status: 'active', note: 'صنف مضاف يدوياً.' },
            ],
          },
        };
      }),
    );
  };

  const handleRemoveCartItem = (sku: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return {
          ...d,
          cartBuilderPreview: {
            ...d.cartBuilderPreview,
            items: d.cartBuilderPreview.items.filter((item) => item.sku !== sku),
          },
        };
      }),
    );
  };

  const handleSelectDeliveryMode = (modeId: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return { ...d, deliveryModeSelector: { ...d.deliveryModeSelector, selectedMode: modeId as DshFulfillmentDeliveryMode } };
      }),
    );
  };

  const handleToggleServiceability = () => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        const current = d.serviceabilitySummary.serviceabilityStatus;
        return {
          ...d,
          serviceabilitySummary: {
            ...d.serviceabilitySummary,
            serviceabilityStatus: current === 'serviceable' ? 'blocked' : 'serviceable',
          },
        };
      }),
    );
  };

  const handleUpdateWltHandoff = (key: string, value: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return { ...d, wltReadOnlyHandoff: { ...d.wltReadOnlyHandoff, [key]: value } };
      }),
    );
  };

  const handleUpdateAuditReason = (key: string, value: string) => {
    if (!selectedDesk) return;
    setDesks((prev) =>
      prev.map((d) => {
        if (d.deskId !== selectedDesk.deskId) return d;
        return { ...d, auditReason: { ...d.auditReason, [key]: value } };
      }),
    );
  };

  const handleSubmitDraft = () => {
    if (!selectedDesk) return;
    setSubmitStatus(`تم تقديم مسودة الطلب للعميل ${selectedDesk.customerName} بنجاح.`);
    setTimeout(() => setSubmitStatus(null), 3500);
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = React.useMemo(
    () => [
      { id: 'desk', label: 'حالات المساعدة', value: String(desks.length), tone: 'neutral' as const },
      {
        id: 'verified',
        label: 'هوية مؤكدة',
        value: String(desks.filter((d) => d.identityVerification.verificationStatus === 'verified').length),
        tone: 'success' as const,
      },
      {
        id: 'blocked',
        label: 'خدمة محظورة',
        value: String(desks.filter((d) => d.serviceabilitySummary.serviceabilityStatus === 'blocked').length),
        tone: 'warning' as const,
      },
      { id: 'wlt', label: 'WLT نشط', value: 'تفاعلي', tone: 'success' as const },
    ],
    [desks],
  );

  const hasInspector = selectedDesk !== null;

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>مكتب الطلبات المساعدة</h2>
        <p className={styles.surfaceSectionSubtitle}>
          اختر حالة من القائمة لعرض مسار المعالجة والتحكم الكامل.
        </p>
      </div>

      <WebControlPanelKpiStrip items={kpis} />

      {relevantPlaybook && !hasInspector ? (
        <WebControlPanelRecommendation
          title={relevantPlaybook.title}
          reason={relevantPlaybook.checkpoints.join(' · ')}
          confidence={relevantPlaybook.severity === 'danger' ? 'high' : 'medium'}
          auditTag={relevantPlaybook.playbookId}
          primaryAction={{
            id: 'open-rescue',
            label: 'فتح إنقاذ الطلب',
            onAction: () => router.push(buildOperationsHref('order-rescue')),
          }}
          secondaryAction={{
            id: 'open-command',
            label: 'غرفة القيادة',
            onAction: () => router.push(buildOperationsHref('command-center')),
          }}
        />
      ) : null}

      <div className={hasInspector ? styles.surfaceSplitGrid : styles.surfaceSplitGridFull}>
        {/* ── Queue column ── */}
        <div className={styles.surfaceListColumn}>
          <Box gap={2}>
            {desks.map((desk) => {
              const deskIdentity = IDENTITY_STATUS_META[desk.identityVerification.verificationStatus];
              const isSelected = desk.deskId === selectedDeskId;
              const modeLabel = DSH_FULFILLMENT_OPERATIONAL_MODE_META[desk.deliveryModeSelector.selectedMode]?.label ?? desk.deliveryModeSelector.selectedMode;
              const zoneLabels: Record<string, string> = {
                'Riyadh / Al Yasmin': 'الرياض / الياسمين',
                'Riyadh / Al Malaz': 'الرياض / الملز',
                'Riyadh / Al Olaya': 'الرياض / العليا',
              };
              const zone = zoneLabels[desk.serviceabilitySummary.zoneLabel] ?? desk.serviceabilitySummary.zoneLabel;
              return (
                <WebControlPanelDecisionRow
                  key={desk.deskId}
                  entityId={desk.orderId ?? desk.customerId}
                  entityLabel={`${desk.customerName} · ${desk.basketSummary}`}
                  status={deskIdentity.label}
                  statusTone={deskIdentity.tone}
                  risk={deskIdentity.risk}
                  recommendation={desk.submitDraftPreview.nextAction}
                  reason={`${modeLabel} · ${zone}`}
                  sla={desk.auditFlags.join(' · ')}
                  {...(isSelected ? { onInspect: () => setSelectedDeskId(null) } : {})}
                  primaryAction={{
                    id: `${desk.deskId}-open`,
                    label: isSelected ? 'إغلاق' : 'فتح workspace',
                    onAction: () => setSelectedDeskId(isSelected ? null : desk.deskId),
                  }}
                  secondaryAction={{
                    id: `${desk.deskId}-rescue`,
                    label: 'فتح الإنقاذ',
                    onAction: () =>
                      router.push(
                        buildOperationsHref('order-rescue', {
                          orderId: desk.orderId,
                          customerId: desk.customerId,
                          ticketId: desk.ticketId,
                        }),
                      ),
                  }}
                />
              );
            })}
          </Box>
        </div>

        {/* ── Inspector — only when desk is selected ── */}
        {hasInspector && selectedDesk ? (
          <AssistedOrderDeskInspector
            desk={selectedDesk}
            onClose={() => setSelectedDeskId(null)}
            onUpdateLookup={handleUpdateLookup}
            onToggleVerificationStep={handleToggleVerificationStep}
            onUpdateCartItemQty={handleUpdateCartItemQty}
            onUpdateCartItemStatus={handleUpdateCartItemStatus}
            onAddCartItem={handleAddCartItem}
            onRemoveCartItem={handleRemoveCartItem}
            onSelectDeliveryMode={handleSelectDeliveryMode}
            onToggleServiceability={handleToggleServiceability}
            onUpdateWltHandoff={handleUpdateWltHandoff}
            onUpdateAuditReason={handleUpdateAuditReason}
            onSubmitDraft={handleSubmitDraft}
            submitStatus={submitStatus}
          />
        ) : null}
      </div>
    </Box>
  );
}

export default AssistedOrderDeskScreen;
