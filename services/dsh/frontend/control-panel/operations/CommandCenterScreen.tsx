'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Text, Badge } from '@bthwani/ui-kit';
import { buildOperationsHref } from '../../shared/operations/operations-registry';

export type CommandCenterScreenProps = {
  hubHref: string;
  subGroup?: string;
};

const TOP_SUGGESTIONS = [
  {
    id: 'sug-1',
    label: 'تكدس شمال الرياض — فعّل الحافز فورًا',
    reason: '45 طلب بدون كابتن في منطقة الشمال',
    confidence: 'high' as const,
    action: 'فتح المناطق',
    workspace: 'area-capacity' as const,
    risk: 'critical' as const,
  },
  {
    id: 'sug-2',
    label: '32 طلب بدون إسناد — تدخّل الآن',
    reason: 'قائمة الإسناد تتراكم وكباتن متاحون غير مستغلين',
    confidence: 'high' as const,
    action: 'فتح الإسناد',
    workspace: 'dispatch-assignment' as const,
    risk: 'high' as const,
  },
  {
    id: 'sug-3',
    label: '12 استثناء مفتوح — راجع قائمة الإسناد',
    reason: 'استثناءات بدون مالك تزيد من خطر خرق SLA',
    confidence: 'medium' as const,
    action: 'فتح الاستثناءات',
    workspace: 'exceptions-escalations' as const,
    risk: 'medium' as const,
  },
] as const;

const QUICK_ACTIONS = [
  { id: 'QA-1', label: 'إعادة إسناد 12 طلب متأخر', time: 'منذ 5 دقائق', workspace: 'dispatch-assignment' as const },
  { id: 'QA-2', label: 'تواصل مع المتجر رقم 402', time: 'منذ 12 دقيقة', workspace: 'partner-stores' as const },
  { id: 'QA-3', label: 'تصعيد شكوى عميل (تأخير)', time: 'منذ 18 دقيقة', workspace: 'audit-support-sla' as const },
] as const;

export function CommandCenterScreen({ hubHref, subGroup }: CommandCenterScreenProps) {
  const router = useRouter();

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem',
    direction: 'rtl',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1rem',
  };

  const cardStyle: React.CSSProperties = {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };

  const flexRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        {/* 1. Decision routing map */}
        <Card style={cardStyle}>
          <Text role="titleSm">خريطة القرار التشغيلي</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={flexRowStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <Text role="body"><strong>التنفيذ التشغيلي الحي:</strong> العمليات</Text>
                <Text role="caption" tone="muted">إدارة ومراقبة الطلبات الحية، وتعديل إسناد الكباتن والتحكم التشغيلي الفوري.</Text>
              </div>
              <Button
                label="الطلبات الحية"
                tone="primary"
                onPress={() => router.push('/dsh/operations?workspace=live-orders')}
              />
            </div>

            <div style={flexRowStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <Text role="body"><strong>التذاكر والتصعيد:</strong> الدعم الفني</Text>
                <Text role="caption" tone="muted">استعراض تذاكر الدعم الفني، والمحادثات المباشرة مع العملاء والشركاء.</Text>
              </div>
              <Button
                label="فتح الدعم"
                tone="secondary"
                onPress={() => router.push('/dsh/support')}
              />
            </div>

            <div style={flexRowStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <Text role="body"><strong>الأثر المالي:</strong> المحفظة WLT</Text>
                <Text role="caption" tone="muted">قراءة السجلات والعمليات المالية ومطابقة التحصيلات (غير قابل للتعديل من DSH).</Text>
              </div>
              <Button
                label="فتح المالية"
                tone="secondary"
                onPress={() => router.push('/dsh/finance')}
              />
            </div>
          </div>
        </Card>

        {/* 2. Top system recommendations */}
        <Card style={cardStyle}>
          <Text role="titleSm">أعلى توصيات النظام الآن</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {TOP_SUGGESTIONS.map((s) => (
              <div key={s.id} style={{ ...flexRowStyle, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <Text role="body"><strong>{s.label}</strong></Text>
                  <Text role="caption" tone="muted">{s.reason}</Text>
                </div>
                <Badge label={s.risk === 'critical' ? 'حرج' : 'متوسط'} tone={s.risk === 'critical' ? 'danger' : 'warning'} />
              </div>
            ))}
          </div>
        </Card>

        {/* 3. Urgent quick actions */}
        <Card style={cardStyle}>
          <Text role="titleSm">تدخل سريع مطلوب</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {QUICK_ACTIONS.map((action) => (
              <div key={action.id} style={flexRowStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <Text role="body">{action.label}</Text>
                  <Text role="caption" tone="muted">{action.time}</Text>
                </div>
                <Button
                  label="انتقل"
                  tone="secondary"
                  onPress={() => {
                    const href = buildOperationsHref(action.workspace);
                    router.push(href);
                  }}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* 4. WLT Financial Reference (Read-Only) */}
        <Card style={cardStyle}>
          <Text role="titleSm">مرجعية المحفظة WLT (قراءة فقط)</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
            <div style={flexRowStyle}>
              <Text role="body">حالة ربط المحفظة:</Text>
              <Badge label="متصلة" tone="success" />
            </div>
            <div style={flexRowStyle}>
              <Text role="body">التحصيلات اليومية (COD):</Text>
              <Text role="bodyStrong">0.00 ر.س</Text>
            </div>
            <div style={flexRowStyle}>
              <Text role="body">طلبات الاسترداد المعلقة:</Text>
              <Badge label="لا يوجد" tone="neutral" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CommandCenterScreen;
