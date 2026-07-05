'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  WebControlPanelDecisionRow,
  WebControlPanelKpiStrip,
} from '@bthwani/ui-kit/web';
import { Box } from '@bthwani/ui-kit';
import styles from '../shared/control-panel-surface.module.css';
import { buildOperationsHref } from './operations.registry';

export type CaptainOperationsScreenProps = { hubHref: string; subGroup?: string; };

const CAPTAINS = [
  {
    id: 'CAP-102', name: 'سعد م.', status: 'مشغول', current: '#ORD-9844',
    today: 12, performance: '85%', location: 'الرياض - العليا (منذ دقيقتين)',
    pickup: '8.2 د', dropoff: '14 د', accept: '95%', rejects: '5%', complaints: 0,
    suggestion: { label: 'أعطه أولوية للإسناد القادم', reason: 'متصل وأداؤه مقبول وبدون شكاوى', confidence: 'high' as const, action: 'تواصل', secondary: 'تحديث الحالة', auditRequired: false },
    statusTone: 'warning' as const,
  },
  {
    id: 'CAP-105', name: 'خالد ص.', status: 'متصل', current: 'لا يوجد',
    today: 8, performance: '92%', location: 'الرياض - السليمانية (الآن)',
    pickup: '5.1 د', dropoff: '10 د', accept: '98%', rejects: '2%', complaints: 0,
    suggestion: { label: 'أسند إليه الطلب التالي', reason: 'متاح الآن وتقييمه 92% — الأفضل في المنطقة', confidence: 'high' as const, action: 'إسناد طلب', secondary: null, auditRequired: false },
    statusTone: 'success' as const,
  },
  {
    id: 'CAP-110', name: 'أحمد ي.', status: 'خامل', current: 'لا يوجد',
    today: 3, performance: '60%', location: 'الرياض - النرجس (منذ 15 دقيقة)',
    pickup: '12 د', dropoff: '22 د', accept: '70%', rejects: '30%', complaints: 1,
    suggestion: { label: 'راقب — معدل رفض مرتفع', reason: 'رفض 30% وشكوى واحدة — قيّد الإسناد مؤقتاً', confidence: 'medium' as const, action: 'تواصل', secondary: 'تعطيل مؤقت', auditRequired: true },
    statusTone: 'warning' as const,
  },
  {
    id: 'CAP-112', name: 'وليد ع.', status: 'موقوف', current: '-',
    today: 0, performance: '-', location: 'غير معروف',
    pickup: '-', dropoff: '-', accept: '-', rejects: '-', complaints: '-' as const,
    suggestion: { label: 'أخفه من قائمة الإسناد', reason: 'موقوف حالياً — لا يُعرض كخيار توزيع', confidence: 'low' as const, action: 'تصعيد', secondary: 'تحديث الحالة', auditRequired: true },
    statusTone: 'danger' as const,
  },
] as const;

export function CaptainOperationsScreen({ hubHref: _hubHref, subGroup: _subGroup }: CaptainOperationsScreenProps) {
  const router = useRouter();
  const [loadingCap, setLoadingCap] = React.useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = React.useState<Record<string, string | null>>({});

  const triggerAction = React.useCallback((capId: string, actionLabel: string) => {
    setLoadingCap((prev) => ({ ...prev, [capId]: true }));
    setSuccessMsg((prev) => ({ ...prev, [capId]: null }));
    setTimeout(() => {
      setLoadingCap((prev) => ({ ...prev, [capId]: false }));
      setSuccessMsg((prev) => ({ ...prev, [capId]: `تمت عملية (${actionLabel}) بنجاح.` }));
      setTimeout(() => {
        setSuccessMsg((prev) => ({ ...prev, [capId]: null }));
      }, 3 * 1000);
    }, 800);
  }, []);

  return (
    <Box gap={3}>
      <div className={styles.surfaceSectionHeader}>
        <h2 className={styles.surfaceSectionTitle}>تشغيل الكباتن</h2>
      </div>

      <WebControlPanelKpiStrip
        items={[
          { id: 'cap-kpi-online', label: 'متصل الآن', value: '٤٢', tone: 'success' },
          { id: 'cap-kpi-busy', label: 'مشغول', value: '١٢', tone: 'warning' },
          { id: 'cap-kpi-offline', label: 'غير متصل', value: '٨', tone: 'neutral' },
          { id: 'cap-kpi-blocked', label: 'موقوف', value: '٣', tone: 'danger' }
        ]}
      />

      <Box gap={2} style={{}}>
        {CAPTAINS.map((cap) => (
          <WebControlPanelDecisionRow
            key={cap.id}
            entityId={cap.id}
            entityLabel={cap.name}
            status={cap.status}
            statusTone={cap.statusTone}
            risk={cap.suggestion.auditRequired ? 'warning' : 'neutral'}
            recommendation={cap.suggestion.label}
            reason={cap.suggestion.reason}
            sla={successMsg[cap.id]
              ? `✓ ${successMsg[cap.id]}`
              : `الموقع: ${cap.location} | تقييم: ${cap.performance}`}
            primaryAction={{
              id: `${cap.id}-primary`,
              label: loadingCap[cap.id] ? 'جاري الإرسال...' : cap.suggestion.action,
              onAction: () => {
                if (loadingCap[cap.id]) return;
                if (cap.suggestion.action === 'إسناد طلب') {
                  router.push(buildOperationsHref('dispatch-assignment'));
                } else if (cap.suggestion.action === 'تصعيد') {
                  router.push(buildOperationsHref('exceptions-escalations'));
                } else {
                  triggerAction(cap.id, cap.suggestion.action);
                }
              },
            }}
            {...(cap.suggestion.secondary
              ? {
                  secondaryAction: (() => {
                    const secAction = cap.suggestion.secondary;
                    return {
                      id: `${cap.id}-secondary`,
                      label: secAction,
                      onAction: () => {
                        if (loadingCap[cap.id]) return;
                        if (secAction === 'تعطيل مؤقت') {
                          router.push(buildOperationsHref('exceptions-escalations'));
                        } else {
                          triggerAction(cap.id, secAction);
                        }
                      },
                    };
                  })(),
                }
              : {})}
          />
        ))}
      </Box>
    </Box>
  );
}

export default CaptainOperationsScreen;
