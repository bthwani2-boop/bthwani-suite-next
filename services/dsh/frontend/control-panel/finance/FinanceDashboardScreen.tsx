"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  Header,
  ScrollScreen,
  StateView,
  Text,
  lightThemeColors,
  colorPalette,
  alpha,
} from "@bthwani/ui-kit";
import { useFinanceController } from "../../shared/finance-wlt-link/finance";


export function FinanceDashboardScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identity = useIdentitySession();

  const controller = useFinanceController({
    group: 'financial-command-center',
    searchParams: searchParams ?? undefined,
    router: router ?? undefined,
  });

  const {
    activeGroup,
    activeGroupMeta,
    activeSubGroup,
    activeSubGroupMeta,
    activeState,
    tabItems,
    subTabItems,
    reload,
    financeHubView,
    runtimeFinance,
    onTabSelect,
    onSubTabSelect,
  } = controller;

  const runtimeSourceLabel = useMemo(() => {
    if (activeState === 'loading') return 'WLT runtime: loading';
    if (!runtimeFinance) return 'WLT runtime: disconnected';
    if (runtimeFinance.state === 'runtime') return `WLT runtime: ${runtimeFinance.data.runtimeApiUrl}`;
    return `WLT runtime blocked: ${runtimeFinance.runtimeApiUrl}`;
  }, [activeState, runtimeFinance]);

  if (identity.state.kind !== "authenticated") {
    return <StateView title="تسجيل الدخول مطلوب" description="هذه الشاشة للمشغّلين فقط." />;
  }

  const renderFinancialCenterPosition = (center: any) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
        {center.sections.map((section: any) => (
          <Card key={section.sectionType} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `2px solid ${lightThemeColors.borderColor}`, paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <Text role="titleMd" style={{ fontWeight: 'bold' }}>{section.sectionLabel}</Text>
              <Text role="titleMd" style={{ fontWeight: 'bold' }}>{section.totalLabel}</Text>
            </div>
            {section.lines && section.lines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {section.lines.map((line: any) => (
                  <div key={line.accountCode} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <Text role="body">{line.accountLabel} ({line.accountCode})</Text>
                    <Text role="body" style={{ fontWeight: 'bold' }}>{line.totalLabel}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text role="body" tone="muted">لا توجد قيود مسجلة بداخل هذا الباب.</Text>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (activeState === 'loading') {
      return (
        <Card style={{ padding: '3rem', alignItems: 'center', justifyContent: 'center' }}>
          <Text role="body">جاري تحميل البيانات المالية...</Text>
        </Card>
      );
    }

    if (activeState === 'error') {
      return (
        <StateView
          title="تعذر تحميل البيانات المالية"
          description="فشل الاتصال بالخادم المالي."
          actionLabel="إعادة المحاولة"
          onActionPress={reload}
        />
      );
    }

    if (activeState === 'offline' || activeState === 'empty') {
      return (
        <Card style={{ padding: '3rem', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem' }}>
          <Text role="titleLg" style={{ fontSize: '3rem' }}>🔌</Text>
          <Text role="titleMd" style={{ color: lightThemeColors.danger }}>WLT runtime غير متاح</Text>
          <Text role="body" tone="muted" style={{ maxWidth: '450px' }}>
            تعذر الاتصال بـ WLT لخدمات الاستعلام المالي الحية. يرجى التحقق من حالة WLT runtime وإعادة المحاولة.
          </Text>
          <Button
            label="إعادة المحاولة"
            tone="primary"
            onPress={reload}
          />
        </Card>
      );
    }

    const activeSub = activeSubGroup || activeGroupMeta.subGroups?.[0]?.id;

    if (activeGroup === 'financial-command-center') {
      if (activeSub === 'position' && financeHubView.center) {
        return renderFinancialCenterPosition(financeHubView.center);
      }
      return (
        <Card style={{ padding: '2rem' }}>
          <Text role="titleMd" style={{ marginBottom: '1rem' }}>الخلاصة والتدقيق المالي العام</Text>
          <Text role="body" tone="muted">
            الأرقام مستمدة مباشرة من خادم WLT عبر وكيل DSH المالي المحكوم.
          </Text>
          <Text role="body" tone="muted" style={{ marginTop: '0.5rem' }}>
            {`الوضع التشغيلي: ${financeHubView.operationalRisk} · حظر الصرف/التسوية: ${financeHubView.holdsStatus} · الإجراء المطلوب: ${financeHubView.requiredAction}`}
          </Text>
        </Card>
      );
    }

    return (
      <Card style={{ padding: '2rem', alignItems: 'center', justifyContent: 'center' }}>
        <Text role="body" tone="muted">
          سيتم ربط تبويب {activeSubGroupMeta?.label || activeSubGroup} بالخادم المالي في شريحة لاحقة.
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
              <Text role="titleMd">غرفة القيادة المالية</Text>
              <Badge
                label={runtimeFinance?.state === 'runtime' ? 'WLT runtime' : 'WLT runtime غير متاح'}
                tone={runtimeFinance?.state === 'runtime' ? 'success' : 'danger'}
              />
            </div>
            <Text role="body" tone="muted" style={{ fontSize: '12px', marginTop: '0.25rem' }}>
              العملة: <strong style={{ color: lightThemeColors.color }}>ر.ي (ريال يمني)</strong> · {runtimeSourceLabel}
            </Text>
          </div>
          <div>
            <Button
              label="تحديث فوري"
              tone="secondary"
              onPress={reload}
            />
          </div>
        </div>

        {/* Signal Strip */}
        <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0', flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: '200px', padding: '1rem', borderTop: `3px solid ${lightThemeColors.info}` }}>
            <Text role="caption" tone="muted">صافي المركز المالي</Text>
            <Text role="titleLg" style={{ marginTop: '0.5rem', color: (financeHubView.center?.netPosition ?? 0) >= 0 ? lightThemeColors.success : lightThemeColors.danger }}>
              {financeHubView.center?.netPositionLabel ?? '—'}
            </Text>
          </Card>

          <Card style={{ flex: 1, minWidth: '200px', padding: '1rem', borderTop: `3px solid ${lightThemeColors.success}` }}>
            <Text role="caption" tone="muted">مبالغ معلقة</Text>
            <Text role="titleLg" style={{ marginTop: '0.5rem' }}>
              {financeHubView.pendingCount.toLocaleString('ar-YE')} ذمة
            </Text>
          </Card>

          <Card style={{ flex: 1, minWidth: '200px', padding: '1rem', borderTop: `3px solid ${(financeHubView.center?.blockingVariances.length ?? 0) > 0 ? lightThemeColors.danger : lightThemeColors.success}` }}>
            <Text role="caption" tone="muted">فوارق مطابقة</Text>
            <Text role="titleLg" style={{ marginTop: '0.5rem', color: (financeHubView.center?.blockingVariances.length ?? 0) > 0 ? lightThemeColors.danger : lightThemeColors.success }}>
              {(financeHubView.center?.blockingVariances.length ?? 0).toLocaleString('ar-YE')} فوارق
            </Text>
          </Card>

          <Card style={{ flex: 1, minWidth: '200px', padding: '1rem', borderTop: `3px solid ${financeHubView.openRisksCount > 0 ? lightThemeColors.danger : lightThemeColors.success}` }}>
            <Text role="caption" tone="muted">مخاطر مفتوحة</Text>
            <Text role="titleLg" style={{ marginTop: '0.5rem', color: financeHubView.openRisksCount > 0 ? lightThemeColors.danger : lightThemeColors.success }}>
              {financeHubView.openRisksCount.toLocaleString('ar-YE')} مخاطر
            </Text>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', flexWrap: 'wrap' }}>
          {tabItems.map((tab: any) => (
            <Button
              key={tab.id}
              label={tab.label}
              tone={tab.active ? 'primary' : 'secondary'}
              onPress={() => onTabSelect(tab.id)}
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
                onPress={() => onSubTabSelect(subTab.id)}
              />
            ))}
          </div>
        )}

        {/* Operational Readiness Strip */}
        {activeState === 'ready' && (
          <Card style={{ padding: '1rem', margin: '0.5rem 0', backgroundColor: alpha(colorPalette.black, 0.01) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor:
                    (financeHubView.center?.blockingVariances.length ?? 0) > 0 ? lightThemeColors.danger :
                    financeHubView.pendingCount > 0 ? lightThemeColors.warning : lightThemeColors.success,
                }}
              />
              <div>
                <Text role="body" style={{ fontWeight: 'bold' }}>
                  حالة الجاهزية التشغيلية: {
                    (financeHubView.center?.blockingVariances.length ?? 0) > 0 ? 'محجوب / يوجد مخاطر (Blocked / Risk)' :
                    financeHubView.pendingCount > 0 ? 'يحتاج إجراء (Needs action)' : 'جاهز للمطابقة (Ready)'
                  }
                </Text>
                <Text role="caption" tone="muted">الجهد المالي للمنصة</Text>
              </div>
            </div>

            {/* 4-column Operational readiness layout */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Text role="caption" tone="muted">⚠️ الخطر المالي:</Text>
                <Text role="body" style={{ fontWeight: 'bold', color: (financeHubView.center?.blockingVariances.length ?? 0) > 0 ? lightThemeColors.danger : 'inherit' }}>
                  {financeHubView.operationalRisk}
                </Text>
              </div>
              <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Text role="caption" tone="muted">👥 الجهة المتأثرة:</Text>
                <Text role="body" style={{ fontWeight: 'bold' }}>
                  {financeHubView.affectedSurfaces}
                </Text>
              </div>
              <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Text role="caption" tone="muted">⚙️ الإجراء المطلوب:</Text>
                <Text role="body" style={{ fontWeight: 'bold', color: lightThemeColors.info }}>
                  {financeHubView.requiredAction}
                </Text>
              </div>
              <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Text role="caption" tone="muted">🔒 حظر الصرف/التسوية:</Text>
                <Text role="body" style={{ fontWeight: 'bold' }}>
                  {financeHubView.holdsStatus}
                </Text>
              </div>
            </div>
          </Card>
        )}

        {/* Content Area */}
        <div style={{ marginTop: '0.5rem' }}>
          {renderContent()}
        </div>
      </div>
    </ScrollScreen>
  );
}
