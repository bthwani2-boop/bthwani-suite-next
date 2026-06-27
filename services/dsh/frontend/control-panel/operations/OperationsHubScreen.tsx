'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Button, Text, Badge, spacing } from '@bthwani/ui-kit';
import { useOperationsController } from '../../shared/operations/use-operations-controller';
import { CommandCenterScreen } from './CommandCenterScreen';
import { OrderQueueScreen } from './OrderQueueScreen';
import { CheckoutActivityScreen } from './CheckoutActivityScreen';
import { CartActivityScreen } from './CartActivityScreen';
import { DispatchAssignmentScreen } from './DispatchAssignmentScreen';
import type { CanonicalOperationsGroupId } from '../../shared/operations/operations.types';

export type OperationsHubScreenProps = {
  group?: CanonicalOperationsGroupId;
  orderId?: string;
  panel?: any;
  state?: any;
};

export function OperationsHubScreen({
  group = 'command-center',
  orderId,
  panel,
  state = 'ready',
}: OperationsHubScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const controller = useOperationsController({
    group,
    orderId,
    panel,
    state,
    searchParams,
    router,
  });

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem',
    direction: 'rtl',
    width: '100%',
  };

  const breadcrumbsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'rgba(0, 0, 0, 0.45)',
    marginBottom: '4px',
    userSelect: 'none',
  };

  const navDockStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    paddingBottom: '0.5rem',
    flexWrap: 'wrap',
  };

  const filterDockStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginTop: '0.5rem',
  };

  const renderActiveScreen = () => {
    switch (controller.activeGroup) {
      case 'command-center':
        return <CommandCenterScreen hubHref={controller.hubHref} subGroup={controller.activeSubGroup} />;
      case 'live-orders':
        if (controller.activeSubGroup === 'assisted') {
          return <CheckoutActivityScreen />;
        }
        if (controller.activeSubGroup === 'rescue') {
          return <CartActivityScreen />;
        }
        return <OrderQueueScreen />;
      case 'dispatch-capacity':
        if (controller.activeSubGroup === 'pending') {
          return <DispatchAssignmentScreen />;
        }
        return (
          <Card style={{ padding: '2rem', alignItems: 'center' }}>
            <Text role="body">سيتم ربط تبويب {controller.activeSubGroupMeta?.label || controller.activeSubGroup} في شريحة لاحقة.</Text>
          </Card>
        );
      default:
        return (
          <Card style={{ padding: '2rem', alignItems: 'center' }}>
            <Text role="body">سيتم ربط شاشة {controller.activeGroupMeta?.label} في شريحة لاحقة.</Text>
          </Card>
        );
    }
  };

  return (
    <div style={containerStyle}>
      {/* Breadcrumbs */}
      <div style={breadcrumbsStyle}>
        <span style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>الرئيسية</span>
        <span>◀</span>
        <span style={{ cursor: 'pointer' }} onClick={() => router.push('/dsh/operations')}>العمليات</span>
        <span>◀</span>
        <span style={{ fontWeight: !controller.activeSubGroupMeta ? 'bold' : 'normal' }}>
          {controller.activeGroupMeta.label}
        </span>
        {controller.activeSubGroupMeta && (
          <>
            <span>◀</span>
            <span style={{ fontWeight: 'bold' }}>{controller.activeSubGroupMeta.label}</span>
          </>
        )}
      </div>

      {/* Header Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Text role="titleMd">العمليات</Text>
            <Badge label="غرفة قيادة" tone="action" />
          </div>
          <Text role="body" tone="muted" style={{ fontSize: '12px', marginTop: '0.25rem' }}>
            المراقبة المباشرة لدورة حياة الطلبات، وحالة أسطول الكباتن، والتحكم الفوري بالإسناد والاستثناءات.
          </Text>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={navDockStyle}>
        {controller.tabItems.map((tab) => (
          <Button
            key={tab.id}
            label={tab.label}
            tone={tab.active ? 'primary' : 'secondary'}
            onPress={() => controller.handleSelectTab(tab.id)}
          />
        ))}
      </div>

      {/* Sub tabs (filters) */}
      {controller.subTabItems && controller.subTabItems.length > 0 && (
        <div style={filterDockStyle}>
          {controller.subTabItems.map((subTab) => (
            <Button
              key={subTab.id}
              label={subTab.label}
              tone={subTab.active ? 'success' : 'secondary'}
              style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}
              onPress={() => controller.handleSelectSubTab(subTab.id)}
            />
          ))}
        </div>
      )}

      {/* Intervention Context Card */}
      {controller.focusContextItems.length > 0 && (
        <Card style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <Text role="body"><strong>سياق التدخل الحالي:</strong></Text>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {controller.focusContextItems.map((item) => {
                const labels: Record<string, string> = {
                  orderId: 'معرّف الطلب',
                  customerId: 'معرّف العميل',
                  ticketId: 'معرّف التذكرة',
                  callId: 'معرّف المكالمة',
                };
                return (
                  <Text key={item.label} role="caption">
                    <strong>{labels[item.label] ?? item.label}: </strong>
                    <span style={{ color: 'blue' }}>{item.value}</span>
                  </Text>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Active Screen View */}
      <div style={{ marginTop: '1rem', flex: 1 }}>
        {renderActiveScreen()}
      </div>
    </div>
  );
}

export default OperationsHubScreen;
