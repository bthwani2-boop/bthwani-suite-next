"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  ScrollScreen,
  StateView,
  Text,
  lightThemeColors,
  colorPalette,
  alpha,
} from '@bthwani/ui-kit';
import { usePartnersController } from "../../shared/partner";
import { PartnerListScreen } from "./PartnerListScreen";
import { FieldReadinessQueueScreen } from "./field-readiness/FieldReadinessQueueScreen";

type Props = {
  readonly onOpenPartner?: (partnerId: string) => void;
};

export function PartnersReviewQueueScreen({ onOpenPartner }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const controller = usePartnersController({
    initialWorkspace: 'inbox',
    searchParams: searchParams ?? undefined,
    router: router ?? undefined,
    authKind: "authenticated",
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

  const renderInboxContent = () => {
    if (activeSubTab === 'registration') {
      if (adminController.listState.kind === 'loading' || adminController.listState.kind === 'idle') {
        return (
          <Card style={{ padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
            <Text role="body" tone="muted">جارٍ تحميل ملفات الانضمام…</Text>
          </Card>
        );
      }

      if (adminController.listState.kind === 'error') {
        return (
          <StateView
            title="تعذر تحميل ملفات الانضمام"
            description={adminController.listState.message}
          />
        );
      }

      if (adminController.listState.kind === 'empty' || adminController.rows.length === 0) {
        return (
          <Card style={{ padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
            <Text role="body" tone="muted">لا توجد ملفات انضمام حالياً.</Text>
          </Card>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card style={{ padding: '1rem' }}>
            <Text role="titleMd" style={{ marginBottom: '1rem' }}>قائمة الشركاء والمقدمين</Text>
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
        </div>
      );
    }

    return (
      <Card style={{ padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
        <Text role="body" tone="muted">
          تبويب {activeSubTabMeta?.label || activeSubTab} غير متاح حالياً.
        </Text>
      </Card>
    );
  };

  const renderContent = () => {
    if (activeTab === 'inbox') {
      return renderInboxContent();
    }

    if (activeTab === 'all_partners') {
      if (activeSubTab === 'partners_list') {
        return (
          <PartnerListScreen
            {...(onOpenPartner ? { onSelectPartner: onOpenPartner } : {})}
          />
        );
      }
    }


    if (activeTab === 'field_readiness') {
      if (activeSubTab === 'field_readiness_queue' || activeSubTab === 'readiness_escalations') {
        return <FieldReadinessQueueScreen />;
      }
    }

    return (
      <Card style={{ padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
        <Text role="body" tone="muted">
          تبويب {activeSubTabMeta?.label || activeSubTab || activeTabMeta?.label || activeTab} غير متاح حالياً.
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
          <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', flexWrap: 'wrap', background: alpha(colorPalette.black, 0.02), borderRadius: '4px', paddingLeft: '0.5rem' }}>
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

        {/* Content Area */}
        <div style={{ marginTop: '0.5rem' }}>
          {renderContent()}
        </div>
      </div>
    </ScrollScreen>
  );
}
