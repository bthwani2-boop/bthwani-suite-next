import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Icon,
  KeyValueList,
  MobileScrollView,
  MobileStickyPrimaryAction,
  StateView,
  Text,
  TopBar,
  spacing,
  useDirection,
} from '@bthwani/ui-kit';
import { getWltDshPartnerCommissionLabel } from '../../shared/finance/partner-finance';
import { resolveDshStoreClientVisibility } from '../../shared/partner/dsh-client-visibility.model';
import { getDshPartnerActivationStatusLabel } from '../../shared/partner/partner-activation.model';
import type { PartnerCoverageZone, PartnerCoverageZoneStatus, PartnerOperationalMode } from '../../shared/partner/partner-hub.types';
import { partnerHubTheme, SummaryCell } from './PartnerHubNav';

function resolveZoneStatusTone(status: PartnerCoverageZoneStatus): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

export function OperationsPanel({
  branchLabel,
  cityLabel,
  storeName,
  todayHoursLabel,
  storeOpen,
  activeZoneLabel,
  serviceModes,
  coverageZonesToUse,
  coverageZonesError,
  teamMembers,
  onBack,
  onOpenStoreCourierSetup,
  onOpenTeamManagement,
  listingEnabled,
  storeVisibility,
  visibilityLabel,
}: {
  branchLabel: string;
  cityLabel: string;
  storeName: string;
  todayHoursLabel: string;
  storeOpen: boolean;
  activeZoneLabel: string;
  serviceModes: readonly PartnerOperationalMode[];
  coverageZonesToUse: readonly PartnerCoverageZone[];
  coverageZonesError?: string | null;
  teamMembers: readonly import('../team/PartnerTeamManagementScreen').PartnerTeamMember[];
  onBack: () => void;
  onOpenStoreCourierSetup?: () => void;
  onOpenTeamManagement?: () => void;
  listingEnabled: boolean;
  storeVisibility: ReturnType<typeof resolveDshStoreClientVisibility>;
  visibilityLabel: string;
}) {
  const { direction } = useDirection();


  const [selectedModeId, setSelectedModeId] = React.useState<PartnerOperationalMode['id'] | ''>('pickup');
  const [coveragePanelOpen, setCoveragePanelOpen] = React.useState(false);
  const [selectedZoneId, setSelectedZoneId] = React.useState<string>(coverageZonesToUse.find((zone) => zone.status === 'active')?.id ?? coverageZonesToUse[0]?.id ?? '');
  const [lastSaveLabel, setLastSaveLabel] = React.useState<string | null>(null);

  const resolvedModes = serviceModes;

  const activeModesCount = resolvedModes.filter((mode) => mode.enabled).length;
      const activeTeamCount = teamMembers.filter((member) => member.status === 'active').length;
      const pausedTeamCount = teamMembers.filter((member) => member.status === 'paused').length;
      const invitedTeamCount = teamMembers.filter((member) => member.status === 'invited').length;
      const blockedTeamCount = teamMembers.filter((member) => member.status === 'blocked').length;
      const reviewTeamCount = teamMembers.filter((member) => member.status === 'review-needed').length;
      const activeZoneCount = coverageZonesToUse.filter((zone) => zone.status === 'active').length;
      const pendingZoneCount = coverageZonesToUse.filter((zone) => zone.status === 'pending').length;
      const blockedZoneCount = coverageZonesToUse.filter((zone) => zone.status === 'blocked').length;
      const teamRoleSummary = `مالك ${teamMembers.filter((member) => member.role === 'owner').length} · مشرف ${teamMembers.filter((member) => member.role === 'supervisor').length} · موظف ${teamMembers.filter((member) => member.role === 'staff').length} · موصل ${teamMembers.filter((member) => member.role === 'courier').length}`;
      const teamStatusSummary = `نشط ${activeTeamCount} · موقوف ${pausedTeamCount} · مدعو ${invitedTeamCount} · محظور ${blockedTeamCount} · قيد المراجعة ${reviewTeamCount}`;
      const zoneStatusSummary = `نشطة ${activeZoneCount} · قيد المراجعة ${pendingZoneCount} · محجوبة ${blockedZoneCount}`;

  return (
    <MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: 160 }}>
      <TopBar
        variant="secondary"
        title="المتجر والفريق"
        subtitle={`${storeName} · ${branchLabel}`}
        style={{ marginHorizontal: -16, marginTop: -16 }}
      />

      <Box gap={3} paddingY={2}>
        <Box layoutDirection="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[3] }}>
          <Box style={{ gap: 2, flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
            <Text role="label" tone="muted" align="start">
              الحالة التشغيلية
            </Text>
            <Text role="titleSm" align="start">
              {storeName}
            </Text>
            <Text role="bodySm" tone="muted" align="start">
              {branchLabel} · {cityLabel}
            </Text>
          </Box>
          <Badge label={storeOpen ? 'مفتوح الآن' : 'مغلق الآن'} tone={storeOpen ? 'success' : 'warning'} />
        </Box>

        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          <SummaryCell label="الحالة" value={storeOpen ? 'مفتوح' : 'مغلق'} tone={storeOpen ? 'success' : 'warning'} />
          <SummaryCell label="الظهور" value={visibilityLabel} tone={listingEnabled ? 'brand' : 'warning'} />
          <SummaryCell label="الأوضاع" value={`${activeModesCount}/3`} tone={activeModesCount > 0 ? 'info' : 'warning'} />
        </Box>

        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          <Chip label={`ساعات العمل: ${todayHoursLabel}`} selected />
          <Chip label={`التغطية: ${zoneStatusSummary}`} selected />
          {onOpenStoreCourierSetup ? (
            <Button label="إعداد موصل المتجر" tone="primary" size="sm" fullWidth={false} onPress={onOpenStoreCourierSetup} />
          ) : null}
        </Box>

        <Text role="caption" tone="muted" align="start">
          التسعير والتسويات مملوكة مركزيًا لـ WLT/Finance؛ راجع تفاصيلها من قسم المحفظة.
        </Text>
      </Box>

      <Divider />

      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">الظهور ونقاط الخدمة</Text>
        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          <Chip label={`الظهور: ${visibilityLabel}`} />
          <Chip label={`النطاق: ${branchLabel}`} />
          <Chip label={`المنطقة: ${activeZoneLabel}`} />
          <Chip label={`للعملاء: ${storeVisibility.visible ? 'ظاهر' : 'محجوب'}`} />
          <Chip label={`الحالة: ${getDshPartnerActivationStatusLabel(storeVisibility.activationStatus)}`} />
        </Box>

        <Box gap={1} style={{ marginTop: spacing[1] }}>
          {storeVisibility.checklist.map((check) => (
            <Box key={check.id} layoutDirection="row" style={{ alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1] }}>
              <Icon
                name={check.satisfied ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={16}
                tone={check.satisfied ? 'success' : 'danger'}
              />
              <Text role="bodySm" tone={check.satisfied ? 'default' : 'danger'} align="start" style={{ flex: 1 }}>
                {check.label}
                {!check.satisfied && check.blockedReason ? ` — ${check.blockedReason}` : ''}
              </Text>
              <Badge label={check.satisfied ? 'مكتمل' : 'غير مكتمل'} tone={check.satisfied ? 'success' : 'danger'} />
            </Box>
          ))}
        </Box>
      </Box>

      <Divider />

      {/* 4) Flat Operational Modes Row List with inline expansion */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">
          أوضاع الخدمة
        </Text>
        <Box gap={0}>
          {resolvedModes.map((mode) => {
            const isSelected = mode.id === selectedModeId;
            return (
              <Box key={mode.id} style={{ borderBottomWidth: 1, borderBottomColor: partnerHubTheme.line + '33' }}>
                <Pressable
                  onPress={() => setSelectedModeId(isSelected ? '' : mode.id)}
                  style={({ pressed }) => ({
                    flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[1],
                    backgroundColor: pressed ? partnerHubTheme.surfaceInset : undefined,
                  })}
                >
                  <Box layoutDirection="row" style={{ alignItems: 'center', gap: 10, flex: 1 }}>
                    <Icon
                      name={mode.id === 'pickup' ? 'hand-left-outline' : mode.id === 'partner_delivery' ? 'car-outline' : 'bicycle-outline'}
                      size={18}
                      tone={isSelected ? 'brand' : 'muted'}
                    />
                    <Box style={{ gap: 2, alignItems: 'flex-start', flex: 1 }}>
                      <Text role="bodyStrong" align="start">{mode.title}</Text>
                      <Text role="bodySm" tone="muted" align="start">{mode.subtitle}</Text>
                    </Box>
                  </Box>
                  <Box style={{ alignItems: 'center', flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', gap: spacing[2], marginEnd: spacing[2] }}>
                    <Box style={{ alignItems: direction === 'rtl' ? 'flex-start' : 'flex-end', gap: 2 }}>
                      <Badge label={mode.enabled ? 'مفعّل' : 'غير مفعّل'} tone={mode.enabled ? 'success' : 'warning'} />
                      <Text role="caption" tone="muted">
                        {getWltDshPartnerCommissionLabel(mode.commission)}
                      </Text>
                    </Box>
                    <Icon name={isSelected ? 'chevron-down' : 'chevron-forward-outline'} mirrored tone="muted" size={16} />
                  </Box>
                </Pressable>

                {isSelected && (
                  <Box paddingX={4} gap={2} style={{ paddingTop: 2, paddingBottom: spacing[3] }}>
                    <Text role="caption" tone="muted" align="start">
                      حالة الوضع: {mode.enabled ? 'نشط ويستقبل الطلبات' : 'موقف مؤقتًا'}.
                    </Text>
                    <Box layoutDirection="row" style={{ gap: spacing[2], alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text role="caption" tone="muted" align="start">
                        تفعيل وإيقاف أوضاع الخدمة يُدار من لوحة التحكم ضمن بوابات النشر.
                      </Text>
                      {mode.id === 'partner_delivery' && onOpenStoreCourierSetup ? (
                        <Button
                          label="إعداد موصل المتجر"
                          tone="primary"
                          size="sm"
                          fullWidth={false}
                          onPress={onOpenStoreCourierSetup}
                        />
                      ) : null}
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Divider />

      {/* 5) Flat Team Section with inline expansion */}
      <Box gap={3} paddingY={2}>
        <Box layoutDirection="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box style={{ gap: 2, alignItems: 'flex-start' }}>
            <Text role="bodyStrong" align="start">الفريق</Text>
            <Text role="caption" tone="muted" align="start">{teamRoleSummary} · {teamStatusSummary}</Text>
          </Box>
          <Button
            label="إدارة الفريق"
            tone="secondary"
            size="sm"
            fullWidth={false}
            onPress={onOpenTeamManagement}
          />
        </Box>

        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          <SummaryCell label="نشط" value={String(activeTeamCount)} tone="success" />
          <SummaryCell label="موقوف" value={String(pausedTeamCount)} tone="warning" />
          <SummaryCell label="قيد المراجعة" value={String(reviewTeamCount)} tone="info" />
        </Box>
      </Box>

      <Divider />

      {/* 6) Flat Coverage Zones Section with inline expansion */}
      <Box gap={3} paddingY={2}>
        <Box layoutDirection="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box style={{ gap: 2, alignItems: 'flex-start' }}>
            <Text role="bodyStrong" align="start">مناطق التغطية</Text>
            <Text role="caption" tone="muted" align="start">{zoneStatusSummary}</Text>
          </Box>
          <Button
            label={coveragePanelOpen ? 'إخفاء المناطق' : 'إدارة المناطق'}
            tone="secondary"
            size="sm"
            fullWidth={false}
            onPress={() => setCoveragePanelOpen((current) => !current)}
          />
        </Box>

        {coverageZonesError ? (
          <StateView tone="danger" title={coverageZonesError} />
        ) : null}

        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          <SummaryCell label="نشطة" value={String(activeZoneCount)} tone="success" />
          <SummaryCell label="قيد المراجعة" value={String(pendingZoneCount)} tone="warning" />
          <SummaryCell label="محجوبة" value={String(blockedZoneCount)} tone="danger" />
        </Box>

        {coveragePanelOpen && (
          <Box gap={3} style={{ paddingHorizontal: spacing[1], marginTop: spacing[1] }}>
            <Box layoutDirection="row" style={{ alignItems: 'center', gap: 6 }}>
              <Icon name="information-circle-outline" size={14} tone="warning" />
              <Text role="caption" tone="warning" align="start" style={{ flex: 1 }}>
                المناطق تُدار مركزيًا من لوحة التحكم وWLT/Finance. الشريك يطلب مراجعة فقط ولا يبدل السياسة محليًا.
              </Text>
            </Box>

            <Text role="bodySm" tone="muted" align="start">
              {`النطاق الحالي: ${activeZoneLabel}`}
            </Text>

            <Box gap={0}>
              {coverageZonesToUse.map((zone) => {
                const isZoneSelected = selectedZoneId === zone.id;
                const statusTone = resolveZoneStatusTone(zone.status);

                return (
                  <Box key={zone.id} style={{ borderBottomWidth: 1, borderBottomColor: partnerHubTheme.line + '22', paddingVertical: spacing[2] }}>
                    <Pressable
                      onPress={() => setSelectedZoneId(isZoneSelected ? '' : zone.id)}
                      style={({ pressed }) => ({
                        flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        backgroundColor: pressed ? partnerHubTheme.surfaceInset : undefined,
                        padding: spacing[1],
                      })}
                    >
                      <Box layoutDirection="row" style={{ alignItems: 'center', gap: spacing[2], flexShrink: 1, minWidth: 0 }}>
                        <Icon name="location-outline" size={16} tone="brand" />
                        <Box style={{ gap: 2, flexShrink: 1, minWidth: 0 }}>
                          <Text role="bodyStrong" align="start">{zone.name}</Text>
                          <Text role="caption" tone="muted" align="start">{zone.branchRelation}</Text>
                        </Box>
                      </Box>
                      <Box style={{ alignItems: direction === 'rtl' ? 'flex-start' : 'flex-end', gap: 2, marginStart: spacing[2] }}>
                        <Badge label={zone.statusLabel} tone={statusTone} />
                        <Text role="caption" tone="muted">{zone.reviewActionLabel}</Text>
                      </Box>
                      <Icon name={isZoneSelected ? 'chevron-down' : 'chevron-forward-outline'} mirrored tone="muted" size={14} style={{ marginStart: spacing[2] }} />
                    </Pressable>

                    {isZoneSelected && (
                      <Box paddingX={4} gap={2} style={{ paddingTop: spacing[3] }}>
                        <KeyValueList
                          dense
                          items={[
                            { label: 'الحالة', value: zone.statusLabel, tone: statusTone },
                            { label: 'الفرع المرتبط', value: zone.branchRelation },
                            { label: 'وضع الخدمة', value: zone.serviceModeRelation },
                            { label: 'مرجع التسعير', value: zone.pricingReference },
                            { label: 'مرجع العمولة', value: zone.commissionReference },
                            { label: 'مرجع التسوية', value: zone.payoutReference },
                          ]}
                        />
                        <Text role="bodySm" tone="muted" align="start">
                          {zone.policySummary}
                        </Text>
                        <Text role="bodySm" tone="muted" align="start">
                          {zone.policyReason}
                        </Text>
                        <Text role="caption" tone="muted" align="start">
                          {zone.operationalImpact}
                        </Text>
                        <Text role="caption" tone="muted" align="start">
                          {zone.auditNote}
                        </Text>
                        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
                          <Button
                            label={zone.reviewActionLabel}
                            tone="primary"
                            size="sm"
                            fullWidth={false}
                            onPress={() => setLastSaveLabel(`طلب مراجعة المنطقة: ${zone.name}`)}
                          />
                          <Button
                            label="فتح الأثر التشغيلي"
                            tone="secondary"
                            size="sm"
                            fullWidth={false}
                            onPress={() => setLastSaveLabel(zone.operationalImpact)}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      <MobileStickyPrimaryAction
        label="حفظ إعدادات العمليات"
        helperText={lastSaveLabel ? `آخر حفظ: ${lastSaveLabel}` : 'التعديلات تحفظ من نفس الصفحة.'}
        onPress={() => setLastSaveLabel(new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }))}
      />
    </MobileScrollView>
  );
}
