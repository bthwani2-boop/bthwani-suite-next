"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  ScrollScreen,
  StateView,
  Text,
  lightThemeColors,
} from "@bthwani/ui-kit";
import { usePartnersController } from "../../shared/partner";

type Props = {
  readonly onOpenPartner?: (partnerId: string) => void;
};

export function PartnersReviewQueueScreen({ onOpenPartner }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identity = useIdentitySession();

  const controller = usePartnersController({
    initialWorkspace: 'inbox',
    searchParams: searchParams ?? undefined,
    router: router ?? undefined,
    authKind: identity.state.kind,
  });

  const {
    activeTab,
    activeSubTab,
    tabItems,
    subTabItems,
    activePartnersCount,
    pendingCount,
    adminController,
    handleSelectTab,
    handleSelectSubTab,
  } = controller;

  const activeTabMeta = useMemo(() => {
    return tabItems.find(t => t.id === activeTab);
  }, [tabItems, activeTab]);

  const activeSubTabMeta = useMemo(() => {
    return subTabItems.find(s => s.id === activeSubTab);
  }, [subTabItems, activeSubTab]);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

  const renderInboxContent = () => {
    if (activeSubTab === 'registration') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Onboarding File Details - مخبز عون */}
          <Card style={{ padding: '1.5rem', border: `1px solid ${lightThemeColors.borderColor}` }}>
            {/* Header section of application card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: `1px solid ${lightThemeColors.borderColor}`, paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <Text role="caption" tone="muted">ملف الانضمام</Text>
                <Text role="titleLg" style={{ marginTop: '0.25rem', fontWeight: 'bold' }}>مخبز عون</Text>
                <Text role="body" tone="muted" style={{ fontSize: '12px', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                  store-1781677110084990779
                </Text>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Badge label="بيانات متجر" tone="action" />
                  <Badge label="تطبيق الميداني" tone="info" />
                </div>
              </div>

              <Card style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(185,106,6,0.08)', border: `1.5px solid rgba(185,106,6,0.25)`, alignItems: 'center' }}>
                <Text style={{ fontSize: '10px', color: '#b96a06', marginBottom: '2px' }}>المرحلة الحالية</Text>
                <Text style={{ fontSize: '14px', fontWeight: '700', color: '#b96a06' }}>تم التقديم</Text>
              </Card>
            </div>

            {/* Basic Store Data Grid */}
            <div style={{ marginBottom: '1.5rem' }}>
              <Text role="caption" tone="muted" style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>بيانات المتجر الأساسية</Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                <Card style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <Text role="caption" tone="muted">العنوان</Text>
                  <Text role="body" style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>بيت بوس</Text>
                </Card>
                <Card style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <Text role="caption" tone="muted">التصنيف</Text>
                  <Text role="body" style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>بقالة ومواد غذائية</Text>
                </Card>
                <Card style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <Text role="caption" tone="muted">مرحلة النشر</Text>
                  <Text role="body" style={{ fontWeight: 'bold', color: lightThemeColors.danger, marginTop: '0.25rem' }}>pending_review</Text>
                </Card>
                <Card style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <Text role="caption" tone="muted">وقت الإرسال</Text>
                  <Text role="body" style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>2026/06/17، 9:18 ص</Text>
                </Card>
                <Card style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <Text role="caption" tone="muted">استلام من المتجر</Text>
                  <Text role="body" style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>لا</Text>
                </Card>
                <Card style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
                  <Text role="caption" tone="muted">توصيل المتجر</Text>
                  <Text role="body" style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>لا</Text>
                </Card>
              </div>
            </div>

            {/* Contact & operations */}
            <div>
              <Text role="caption" tone="muted" style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>بيانات التواصل والعمل</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Card style={{ padding: '0.75rem', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text role="body">📞 رقم التواصل</Text>
                  <Text role="body" tone="muted" style={{ fontStyle: 'italic' }}>لم يُرسل بعد من التطبيق الميداني</Text>
                </Card>
                <Card style={{ padding: '0.75rem', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text role="body">🕐 ساعات العمل</Text>
                  <Text role="body" tone="muted" style={{ fontStyle: 'italic' }}>لم يُرسل بعد من التطبيق الميداني</Text>
                </Card>
                <Card style={{ padding: '0.75rem', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text role="body">📋 ملخص الكتالوج</Text>
                  <Text role="body" tone="muted" style={{ fontStyle: 'italic' }}>لم يُرسل بعد من التطبيق الميداني</Text>
                </Card>
              </div>
            </div>
          </Card>

          {/* Table of other partners */}
          {adminController.listState.kind === 'success' && adminController.rows.length > 0 && (
            <Card style={{ padding: '1rem' }}>
              <Text role="titleMd" style={{ marginBottom: '1rem' }}>قائمة الشركاء والمقدمين الآخرين</Text>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${lightThemeColors.borderColor}` }}>
                      <th style={{ padding: '0.75rem' }}>اسم الشريك</th>
                      <th style={{ padding: '0.75rem' }}>رقم الجوال</th>
                      <th style={{ padding: '0.75rem' }}>الحالة</th>
                      <th style={{ padding: '0.75rem' }}>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminController.rows.map((row) => {
                      const originalPartner = adminController.listState.kind === 'success'
                        ? adminController.listState.partners.find(p => p.id === row.id)
                        : null;
                      const phone = originalPartner?.primaryPhone || '—';
                      return (
                        <tr key={row.id} style={{ borderBottom: `1px solid ${lightThemeColors.borderColor}` }}>
                          <td style={{ padding: '0.75rem' }}>
                            <Text style={{ fontWeight: 'bold' }}>{row.displayName}</Text>
                          </td>
                          <td style={{ padding: '0.75rem' }}>{phone}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <Badge
                              label={row.statusLabel}
                              tone={
                                row.statusTone === 'muted' ? 'neutral' :
                                row.statusTone === 'success' ? 'success' :
                                row.statusTone === 'warning' ? 'warning' :
                                row.statusTone === 'danger' ? 'danger' : 'info'
                              }
                            />
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <Button
                              label="فتح"
                              tone="secondary"
                              onPress={() => onOpenPartner && onOpenPartner(row.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      );
    }

    return (
      <Card style={{ padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
        <Text role="body" tone="muted">
          سيتم عرض تبويب فرعي {activeSubTabMeta?.label || activeSubTab} بالكامل قريباً.
        </Text>
      </Card>
    );
  };

  const renderContent = () => {
    if (activeTab === 'inbox') {
      return renderInboxContent();
    }

    return (
      <Card style={{ padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
        <Text role="body" tone="muted">
          سيتم ربط تبويب {activeTabMeta?.label || activeTab} بمسار العمليات في شريحة لاحقة.
        </Text>
      </Card>
    );
  };

  return (
    <ScrollScreen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: `1px solid ${lightThemeColors.borderColor}`, paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Text role="titleMd">شركاء DSH</Text>
              <Badge label="مراجعة الشريك" tone="action" />
            </div>
            <Text role="body" tone="muted" style={{ fontSize: '12px', marginTop: '0.25rem' }}>
              حوكمة الشركاء، التغطية، وأهلية مسار المزايا والعروض
            </Text>
          </div>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Card style={{ padding: '0.5rem 0.75rem', alignItems: 'center' }}>
                <Text role="caption" tone="muted">شركاء نشطون</Text>
                <Text role="titleMd" style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>{activePartnersCount}</Text>
              </Card>
              <Card style={{ padding: '0.5rem 0.75rem', alignItems: 'center' }}>
                <Text role="caption" tone="muted">طلبات معلقة</Text>
                <Text role="titleMd" style={{ fontWeight: 'bold', color: lightThemeColors.warning, marginTop: '0.25rem' }}>{pendingCount}</Text>
              </Card>
              <Card style={{ padding: '0.5rem 0.75rem', alignItems: 'center' }}>
                <Text role="caption" tone="muted">مناطق نشطة</Text>
                <Text role="titleMd" style={{ fontWeight: 'bold', color: lightThemeColors.success, marginTop: '0.25rem' }}>0/0</Text>
              </Card>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', flexWrap: 'wrap' }}>
          {tabItems.map((tab: any) => (
            <Button
              key={tab.id}
              label={tab.label}
              tone={tab.active ? 'primary' : 'secondary'}
              onPress={() => handleSelectTab(tab.id)}
            />
          ))}
        </div>

        {/* Sub tabs (filters) */}
        {subTabItems && subTabItems.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', flexWrap: 'wrap', background: 'rgba(0,0,0,0.02)', borderRadius: '4px', paddingLeft: '0.5rem' }}>
            {subTabItems.map((subTab: any) => (
              <Button
                key={subTab.id}
                label={subTab.label}
                tone={subTab.active ? 'success' : 'secondary'}
                style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}
                onPress={() => handleSelectSubTab(subTab.id)}
              />
            ))}
          </div>
        )}

        {/* Current Date update banner */}
        <Text role="caption" tone="muted" style={{ fontSize: '11px', alignSelf: 'flex-start' }}>
          آخر تحديث حي: 4:23:23 ص
        </Text>

        {/* Content Area */}
        <div style={{ marginTop: '0.5rem' }}>
          {renderContent()}
        </div>
      </div>
    </ScrollScreen>
  );
}
