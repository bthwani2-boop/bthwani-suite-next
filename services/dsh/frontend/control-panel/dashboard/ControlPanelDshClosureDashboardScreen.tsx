import React from 'react';
import { Box, Text, colorRoles, alpha } from '@bthwani/ui-kit';
import {
  WebControlDisclosureItem,
  WebControlPanelKpiStrip,
  WebControlPanelActionCluster,
  WebCompactSurfaceHeader,
  WebControlPanelRecommendation,
} from '@bthwani/ui-kit/web';
import { ControlPanelDshWorkspaceFrame } from '../shared';
import { DSH_CROSS_SURFACE_CLOSURE_MAP, DSH_CROSS_SURFACE_JOURNEYS, getDshClosureItemsBySurface, type DshUnifiedRecommendation } from '../../shared/runtime';

import styles from '../shared/control-panel-surface.module.css';

function ControlPanelDshClosureHubScreen() {
  const [activeTab, setActiveTab] = React.useState<string>('readiness');
  const [activeSubTab, setActiveSubTab] = React.useState<string>('all');

  const closureItems = DSH_CROSS_SURFACE_CLOSURE_MAP;
  const previewReadyCount = closureItems.filter((i) => i.status === 'preview-ready').length;
  const needsEvidenceCount = closureItems.filter(
    (i) => i.visualEvidenceRequired && i.status !== 'verified-ui-flow' && i.status !== 'blocked-by-contract' && i.status !== 'blocked-by-wlt'
  ).length;
  const blockedCount = closureItems.filter((i) => i.status === 'blocked-by-contract' || i.status === 'blocked-by-wlt').length;
  const verifiedCount = closureItems.filter((i) => i.status === 'verified-ui-flow').length;

  const PRIMARY_TABS = [
    { id: 'readiness', label: 'حالة الجاهزية' },
    { id: 'evidence', label: 'تدفق الأدلة' },
    { id: 'ui-flows', label: 'مسارات الواجهة' },
    { id: 'protection', label: 'الحماية والامتثال' },
  ];

  const SECONDARY_TABS: Record<string, { id: string; label: string }[]> = {
    readiness: [
      { id: 'all', label: 'الكل' },
      { id: 'client', label: 'العميل' },
      { id: 'partner', label: 'الشريك' },
      { id: 'captain', label: 'الكابتن' },
      { id: 'field', label: 'الميدان' },
    ],
    evidence: [
      { id: 'recent', label: 'الأحدث' },
      { id: 'pending', label: 'بانتظار المراجعة' },
    ],
  };

  React.useEffect(() => {
    if ((SECONDARY_TABS[activeTab]?.length ?? 0) > 0) {
      setActiveSubTab(SECONDARY_TABS[activeTab]?.[0]?.id ?? '');
    } else {
      setActiveSubTab('');
    }
  }, [activeTab]);

  const renderContent = () => {
    if (activeTab === 'readiness') {
      return <ControlPanelDshClosureDashboardScreen />;
    }
    if (activeTab === 'evidence') {
      return <ControlPanelDshClosureEvidenceStream />;
    }
    return (
      <Box gap={2}>
        <WebControlPanelRecommendation
          title="لوحة الجاهزية"
          reason={`التبويب الحالي: ${activeTab} · التصفية: ${activeSubTab} · افتح الأدلة أو الحماية لإكمال الإغلاق.`}
          confidence="medium"
          auditTag="إغلاق DSH"
          primaryAction={{ id: 'open-evidence', label: 'فتح الأدلة', onAction: () => setActiveTab('evidence') }}
          secondaryAction={{ id: 'open-protection', label: 'حالة الحماية', onAction: () => setActiveTab('protection') }}
        />
        <Text role="bodySm" tone="muted">يعرض هذا التبويب حالة الإغلاق الحالية بدون أي لوحة قراءة فقط.</Text>
      </Box>
    );
  };

  return (
    <div className={styles.surfaceCockpit}>
      {/* 1. Header Area - Closure Command Deck */}
      <header className={styles.surfaceTopBar}>
        <div className={styles.surfaceTitleBlock}>
          <div className={styles.surfaceHeaderIconBox} aria-hidden="true">
            <div className={styles.surfaceHeaderGlyph}>
              <span className={styles.surfaceHeaderGlyphLabel}>إ</span>
            </div>
          </div>
          <Box gap={0}>
            <div className={styles.surfaceHeaderTextRow}>
              <h1 className={styles.surfaceHeaderTitle}>إغلاق DSH</h1>
              <Box paddingX={1} paddingY={0} background="brandSurface" radiusToken="xs">
                <span className={styles.surfaceHeaderBadgeText}>مرحلة الجاهزية</span>
              </Box>
            </div>
            <p className={styles.surfaceHeaderSubtitle}>حوكمة الإغلاق النهائي ومصفوفة الجاهزية العابرة للأسطح</p>
          </Box>
        </div>

        <div className={styles.surfaceHeaderActions}>
          <div className={styles.surfacePulseCompact}>
            {[
              { label: 'واجهة جاهزة', value: String(previewReadyCount), tone: 'warning' as const },
              { label: 'محقق', value: String(verifiedCount), tone: verifiedCount > 0 ? 'success' as const : 'muted' as const },
              { label: 'يحتاج دليل', value: String(needsEvidenceCount), tone: needsEvidenceCount > 0 ? 'warning' as const : 'success' as const },
              { label: 'محجوب', value: String(blockedCount), tone: blockedCount > 0 ? 'critical' as const : 'success' as const },
            ].map((m) => (
              <div key={m.label} className={styles.commandKpi}>
                <span className={styles.commandKpiLabel}>{m.label}</span>
                <span className={`${styles.commandKpiValue} ${styles.commandKpiValueSuccess}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 2. Primary Tabs */}
      <nav className={styles.navigationDock}>
        {PRIMARY_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.surfaceTab} ${tab.id === activeTab ? styles.surfaceTabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 3. Secondary Tabs */}
      {SECONDARY_TABS[activeTab] && SECONDARY_TABS[activeTab].length > 0 && (
        <div className={`${styles.filterDock} ${styles.filterDockTint}`}>
          {SECONDARY_TABS[activeTab].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id)}
              className={styles.surfaceTab}
              style={{
                backgroundColor: sub.id === activeSubTab ? alpha(colorRoles.brandAction, 0.1) : 'transparent',
                color: sub.id === activeSubTab ? colorRoles.brandAction : colorRoles.brandStructure,
                borderColor: sub.id === activeSubTab ? colorRoles.brandAction : 'transparent',
              }}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* 4. Main Panel */}
      <main className={styles.surfaceMainPanel}>
        <div className={styles.surfaceInnerScroll}>
          <Box padding={4}>
            {renderContent()}
          </Box>
        </div>
      </main>
    </div>
  );
}

function getSurfaceLabel(id: string) {
  switch (id) {
    case 'app-client': return 'تطبيق العميل';
    case 'app-partner': return 'تطبيق الشريك';
    case 'app-captain': return 'تطبيق الكابتن';
    case 'app-field': return 'تطبيق الميدان';
    case 'control-panel': return 'لوحة التحكم';
    default: return id;
  }
}

export function ControlPanelDshClosureDashboardScreen() {
  const surfaceCounts = {
    client: getDshClosureItemsBySurface('app-client').length,
    partner: getDshClosureItemsBySurface('app-partner').length,
    captain: getDshClosureItemsBySurface('app-captain').length,
    field: getDshClosureItemsBySurface('app-field').length,
    'control-panel': getDshClosureItemsBySurface('control-panel').length,
  } as const;


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <WebControlPanelKpiStrip items={[
        { id: 'surface-client', label: 'العميل', value: String(surfaceCounts.client), tone: 'success' },
        { id: 'surface-partner', label: 'الشريك', value: String(surfaceCounts.partner), tone: 'success' },
        { id: 'surface-captain', label: 'الكابتن', value: String(surfaceCounts.captain), tone: 'success' },
        { id: 'surface-field', label: 'الميدان', value: String(surfaceCounts.field), tone: 'success' },
        { id: 'surface-control', label: 'لوحة التحكم', value: String(surfaceCounts['control-panel']), tone: 'success' },
      ]} />
      <div style={{ padding: '0 14px 8px' }}>
        <div className={styles.surfaceInfoCard}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            <span className={styles.surfaceInfoCardTitle}>مصفوفة جاهزية DSH</span>
            <span className={styles.surfaceInfoCardDescription}>لقطة واحدة توضح ما هو مغلق، وما يحتاج أدلة، وما يحتاج مسارات واجهة قبل الخروج النهائي.</span>
          </div>
          <WebControlPanelActionCluster
            primary={{ id: 'evidence', label: 'فتح الأدلة' }}
            secondary={{ id: 'protection', label: 'حالة الحماية' }}
          />
        </div>
      </div>

      <div style={{ padding: '0 14px' }}>
        <Text role="titleSm" style={{ marginBottom: 8 }}>إشارات عابرة للأسطح</Text>
        <div style={{  gap: '8px' }}>
          {DSH_CROSS_SURFACE_JOURNEYS.map((journey: DshUnifiedRecommendation) => (
            <WebControlPanelRecommendation
              key={journey.id}
              title={journey.entityLabel ?? journey.id}
              reason={journey.reason}
              confidence={journey.confidence}
              {...(journey.lifecycleStep !== undefined ? { auditTag: journey.lifecycleStep } : {})}
              primaryAction={{ id: journey.id, label: journey.primaryActionLabel }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ControlPanelDshClosureEvidenceStream() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <WebCompactSurfaceHeader
        title="تدفق أدلة الإغلاق"
        description="كل عنصر يمثل وحدة إغلاق يمكن توجيهها لمساحة العمل المناسبة."
      />
      <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {DSH_CROSS_SURFACE_CLOSURE_MAP.map((item) => (
          <WebControlDisclosureItem
            key={`${item.surfaceId}-${item.area}`}
            id={`${item.surfaceId}-${item.area}`}
            label={`${getSurfaceLabel(item.surfaceId)} / ${item.title}`}
            description={`${item.description} المتبقي: ${item.remainingBlocker}`}
            badge={
              item.status === 'verified-ui-flow' ? 'محقق'
              : item.status === 'blocked-by-wlt' ? 'محجوب / WLT'
              : item.status === 'blocked-by-contract' ? 'محجوب / عقد'
              : item.status === 'needs-visual-evidence' ? 'يحتاج إثبات بصري'
              : item.evidenceStatus === 'needs-visual-evidence' ? 'جاهز للمراجعة البصرية'
              : 'واجهة جاهزة'
            }
            href={item.routeHint}
          />
        ))}
      </div>
      <div className={styles.surfaceFootnote} style={{ padding: '0 14px 8px' }}>
        هذه اللوحة للعرض فقط ولا تقوم بتغيير حالة النظام الفعلية.
      </div>
    </div>
  );
}

export default ControlPanelDshClosureHubScreen;
