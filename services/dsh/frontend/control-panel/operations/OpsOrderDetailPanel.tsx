'use client';

import React from 'react';
import { Text } from '@bthwani/ui-kit';
import type { DshOperationsDecisionKind } from '../../shared/orders';
import { DSH_FULFILLMENT_OPERATIONAL_MODE_META } from './operations.types';
import type { DshFulfillmentOperationalMode } from './operations.types';

export type DshOpsApprovalOrder = {
  id: (string);
  fulfillmentMode: (string);
  pickupAddress: (string);
  dropoffAddress: (string);
  customerName: (string);
  customerPhone: (string);
  storeName: (string);
  paymentMethod: (string);
  paymentStatus: (string);
  couponCode?: (string);
  customerNote?: (string);
  customerInstructions?: (string);
  cartItems: { title: (string); priceLabel: (string); qty: (number) }[];
  totalLabel: (string);
  eventLog: { status: (string); actor: (string); timestamp: (string) }[];
};

export type PendingApprovalOrder = DshOpsApprovalOrder;

type OpsDecision = DshOperationsDecisionKind;
type SupportTicketTone = 'neutral' | 'warning' | 'danger' | 'success';

type SupportTicketData = {
  ticketId: string;
  statusTone: SupportTicketTone;
  status: string;
  type: string;
  description: string;
  attachmentRef: string | null;
  chatHistory: Array<{ sender: string; time: string; text: string }>;
};

type OpsOrderDetailPanelProps = {
  readonly order: DshOpsApprovalOrder;
  readonly onDecision: (orderId: string, decision: OpsDecision, note: string) => void;
};

import { opsTheme as theme } from '../../shared/operations';

export const OpsOrderDetailPanel = React.memo(function OpsOrderDetailPanel({
  order,
  onDecision,
}: OpsOrderDetailPanelProps) {
  const [note, setNote] = React.useState('');
  const [pending, setPending] = React.useState<OpsDecision | null>(null);
  const [showPreviewDoc, setShowPreviewDoc] = React.useState(false);
  const [actionStatus, setActionStatus] = React.useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const modeMeta = DSH_FULFILLMENT_OPERATIONAL_MODE_META[order.fulfillmentMode as DshFulfillmentOperationalMode];
  const isPickupMode = order.fulfillmentMode === 'pickup';
  const deliveryActorLabel = isPickupMode ? 'المتجر' : order.fulfillmentMode === 'partner_delivery' ? 'موصل المتجر' : 'الكابتن';
  const locationRows = isPickupMode
    ? [{ label: 'موقع الاستلام', value: order.pickupAddress }]
    : [
        { label: 'عنوان الاستلام', value: order.pickupAddress },
        { label: 'عنوان التسليم', value: order.dropoffAddress },
      ];
  const supportConversationTitle = isPickupMode
    ? '💬 سجل تواصل العميل والمتجر'
    : `💬 سجل دردشة العميل و${deliveryActorLabel}`;

  const handleDecision = (decision: OpsDecision) => {
    if ((decision === 'reject' || decision === 'request_edit') && !note.trim()) {
      setErrorMsg('يجب كتابة ملاحظة توضح سبب الرفض أو التعديل المطلوب.');
      return;
    }
    setErrorMsg(null);
    setPending(decision);
    setActionStatus('pending');

    setTimeout(() => {
      setActionStatus('success');
      setTimeout(() => {
        onDecision(order.id, decision, note);
        setPending(null);
        setActionStatus('idle');
      }, 1000);
    }, 1200);
  };

  const decisionButtonStyle = (decision: OpsDecision) => ({
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    cursor: actionStatus === 'pending' || actionStatus === 'success' ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    fontSize: '13px',
    opacity: (pending && pending !== decision) || actionStatus === 'pending' || actionStatus === 'success' ? 0.5 : 1,
    background: decision === 'approve' ? theme.success : decision === 'reject' ? theme.danger : theme.warning,
    color: theme.textInverse,
  });

  const ticketData: SupportTicketData = {
    ticketId: '—',
    statusTone: 'neutral',
    status: '—',
    type: '—',
    description: '—',
    attachmentRef: null,
    chatHistory: [],
  };

  return (
    <div style={{ border: `1px solid ${theme.line}`, borderRadius: '14px', padding: '20px', background: theme.surfaceRaised, display: 'flex', flexDirection: 'column', gap: '16px', direction: 'rtl', textAlign: 'right' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: theme.brand }}>#{order.id}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', background: theme.surfaceInset, color: theme.textMuted, padding: '3px 10px', borderRadius: '99px', fontWeight: 700 }}>
            {modeMeta.label}
          </span>
          <span style={{ fontSize: '11px', background: theme.warningSurface, color: theme.warning, padding: '3px 10px', borderRadius: '99px', fontWeight: 700 }}>قيد مراجعة العمليات</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { label: 'العميل', value: order.customerName },
          { label: 'الجوال', value: order.customerPhone },
          ...locationRows,
          { label: 'المتجر/الشريك', value: order.storeName },
          { label: 'المالك التشغيلي', value: modeMeta.operationalOwner },
          { label: 'طريقة الدفع', value: order.paymentMethod },
          { label: 'حالة الدفع', value: order.paymentStatus },
          ...(order.couponCode ? [{ label: 'القسيمة', value: order.couponCode }] : []),
          ...(order.customerNote ? [{ label: 'ملاحظة العميل', value: order.customerNote }] : []),
          ...(order.customerInstructions ? [{ label: isPickupMode ? 'تعليمات الاستلام' : 'تعليمات التسليم', value: order.customerInstructions }] : []),
        ].map(({ label, value }) => (
          <div key={label} style={{ background: theme.surfaceInset, borderRadius: '8px', padding: '8px 12px' }}>
            <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: theme.text }}>{value}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: theme.text, marginBottom: '8px' }}>محتويات السلة</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {order.cartItems.map((item) => (
            <div key={item.title} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 10px', background: theme.surfaceInset, borderRadius: '6px' }}>
              <span style={{ color: theme.brand, fontWeight: 700 }}>{item.priceLabel}</span>
              <span>{item.title} × {item.qty}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 10px', borderTop: `1px solid ${theme.line}` }}>
            <span style={{ fontWeight: 700, color: theme.text }}>{order.totalLabel}</span>
            <span style={{ color: theme.textMuted }}>الإجمالي الكلي</span>
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: theme.text, marginBottom: '8px' }}>سجل الأحداث</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {order.eventLog.map((ev: { status: string; actor: string; timestamp: string }) => (
            <div key={ev.timestamp} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 10px', background: theme.surfaceInset, borderRadius: '6px' }}>
              <span style={{ color: theme.textMuted }}>{ev.timestamp.replace('T', ' ').slice(0, 16)}</span>
              <span><strong>{ev.status}</strong> — {ev.actor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* بلاغات الدعم */}
      <div style={{ borderTop: `1px solid ${theme.line}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: theme.text }}>🚨 بلاغات الدعم والشكاوى (DSH)</div>
        <div style={{ background: theme.surfaceInset, borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: theme.text }}>بلاغ رقم: {ticketData.ticketId}</span>
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 700,
              background: ticketData.statusTone === 'warning'
                ? theme.warningSurface
                : ticketData.statusTone === 'danger'
                  ? theme.dangerSurface
                  : ticketData.statusTone === 'success'
                    ? theme.successSurface
                    : theme.surfaceInset,
              color: ticketData.statusTone === 'warning'
                ? theme.warning
                : ticketData.statusTone === 'danger'
                  ? theme.danger
                  : ticketData.statusTone === 'success'
                    ? theme.success
                    : theme.textMuted,
            }}>{ticketData.status}</span>
          </div>
          <div style={{ fontSize: '12px', color: theme.text, fontWeight: 600 }}>نوع البلاغ: <span style={{ color: theme.brand }}>{ticketData.type}</span></div>
          <div style={{ fontSize: '12px', color: theme.textMuted }}>{ticketData.description}</div>
          {ticketData.attachmentRef && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', color: theme.textMuted, marginBottom: '4px' }}>🖼️ المرفقات وصورة الإثبات:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: theme.surfaceRaised, border: `1px dashed ${theme.line}`, padding: '8px', borderRadius: '8px' }}>
                <span style={{ fontSize: '20px' }}>📸</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: theme.brand }}>{ticketData.attachmentRef}</div>
                  <div style={{ fontSize: '10px', color: theme.success }}>محملة ومؤمنة بنجاح عبر نظام DSH</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewDoc((prev) => !prev)}
                  style={{ padding: '4px 10px', background: theme.surfaceInset, border: `1px solid ${theme.line}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: theme.text }}
                >
                  {showPreviewDoc ? 'إخفاء المعاينة' : 'معاينة'}
                </button>
              </div>
              {showPreviewDoc && (
                <div style={{ marginTop: '8px', padding: '10px', background: theme.surfaceInset, border: `1px solid ${theme.line}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: theme.text }}>مستند الإثبات: {ticketData.attachmentRef}</div>
                  <div style={{ width: '100%', height: '140px', background: 'var(--bthwani-control-panel-background)', border: '1px solid var(--bthwani-control-panel-border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', padding: '12px', justifyContent: 'space-between', boxSizing: 'border-box', fontSize: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--bthwani-control-panel-border)', paddingBottom: '4px' }}>
                      <Text  style={{ fontSize: 10, fontFamily: 'monospace' }}>فاتورة المتجر مبسطة</Text>
                      <Text  style={{ fontSize: 10, fontFamily: 'monospace' }}>#INV-9823</Text>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text  style={{ fontSize: 10, fontFamily: 'monospace' }}>دجاج فحم تركي</Text>
                        <Text  style={{ fontSize: 10, fontFamily: 'monospace' }}>1x 3,000 ر.ي</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text  style={{ fontSize: 10, fontFamily: 'monospace' }}>كريسبي رول</Text>
                        <Text  style={{ fontSize: 10, fontFamily: 'monospace' }}>2x 1,500 ر.ي</Text>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--bthwani-control-panel-border)', paddingTop: '4px' }}>
                      <Text   style={{ fontSize: 10, fontFamily: 'monospace' }}>الإجمالي</Text>
                      <Text   style={{ fontSize: 10, fontFamily: 'monospace' }}>6,000 ر.ي</Text>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* سجل الدردشة */}
      <div style={{ borderTop: `1px solid ${theme.line}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: theme.text }}>{supportConversationTitle}</div>
        {ticketData.chatHistory.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', background: theme.surfaceInset, borderRadius: '10px', padding: '12px' }}>
            {ticketData.chatHistory.map((chat, idx) => {
              const isSystem = chat.sender === 'النظام';
              const isCustomer = chat.sender === 'العميل';
              return (
                <div key={idx} style={{
                  display: 'flex', flexDirection: 'column',
                  alignSelf: isSystem ? 'center' : isCustomer ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                  background: isSystem ? theme.surfaceRaised : isCustomer ? theme.infoSurface : theme.surfaceRaised,
                  border: isSystem ? `1px solid ${theme.line}` : 'none',
                  borderRadius: '10px', padding: '8px 12px', gap: '2px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '10px', fontWeight: 700, color: isSystem ? theme.danger : isCustomer ? theme.info : theme.brand }}>
                    <span>{chat.sender}</span>
                    <span style={{ color: theme.textMuted, fontWeight: 'normal' }}>{chat.time}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: theme.text, marginTop: '2px', textAlign: 'right' }}>{chat.text}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: theme.surfaceInset, borderRadius: '10px', padding: '12px', textAlign: 'center', fontSize: '12px', color: theme.textMuted }}>
            لا توجد محادثات جارية للطلب.
          </div>
        )}
      </div>

      {/* ملاحظة القرار */}
      <div>
        <label style={{ fontSize: '12px', fontWeight: 700, color: theme.text, display: 'block', marginBottom: '6px' }}>ملاحظة القرار (اختياري)</label>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (e.target.value.trim()) {
              setErrorMsg(null);
            }
          }}
          placeholder="سبب الرفض أو التعديل المطلوب..."
          rows={2}
          disabled={actionStatus === 'pending' || actionStatus === 'success'}
          style={{ width: '100%', borderRadius: '8px', border: `1px solid ${theme.line}`, padding: '8px', fontSize: '13px', direction: 'rtl', resize: 'vertical', background: theme.surface, color: theme.text, boxSizing: 'border-box' }}
        />
        {errorMsg && (
          <div style={{ color: theme.danger, fontSize: '11px', marginTop: '6px', fontWeight: 700 }}>
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {actionStatus === 'success' && (
        <div style={{ background: theme.successSurface, border: `1px solid ${theme.success}`, color: theme.success, borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
          ✓ تم تسجيل القرار وإجراء التحديث بنجاح!
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
        <button
          type="button"
          style={decisionButtonStyle('approve')}
          onClick={() => handleDecision('approve')}
          disabled={actionStatus === 'pending' || actionStatus === 'success'}
        >
          {pending === 'approve' && actionStatus === 'pending' ? 'قيد الموافقة...' : 'موافقة'}
        </button>
        <button
          type="button"
          style={decisionButtonStyle('request_edit')}
          onClick={() => handleDecision('request_edit')}
          disabled={actionStatus === 'pending' || actionStatus === 'success'}
        >
          {pending === 'request_edit' && actionStatus === 'pending' ? 'قيد طلب التعديل...' : 'طلب تعديل'}
        </button>
        <button
          type="button"
          style={decisionButtonStyle('reject')}
          onClick={() => handleDecision('reject')}
          disabled={actionStatus === 'pending' || actionStatus === 'success'}
        >
          {pending === 'reject' && actionStatus === 'pending' ? 'قيد الرفض...' : 'رفض'}
        </button>
      </div>
    </div>
  );
});
