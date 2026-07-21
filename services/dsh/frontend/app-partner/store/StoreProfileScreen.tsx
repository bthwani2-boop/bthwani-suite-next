import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Box,
  Button,
  Chip,
  Divider,
  Icon,
  KeyValueList,
  MobileStickyPrimaryAction,
  StateView,
  Text,
  TextField,
  alpha,
  colorRoles,
  resolveRowDirection,
  useDirection,
} from '@bthwani/ui-kit';
import {
  type DshPartnerActivationStatus,
  getDshPartnerActivationStatusLabel,
} from '../../shared/partner/partner-activation.model';
import { resolveDshStoreClientVisibility } from '../../shared/partner/dsh-client-visibility.model';
import {
  fetchPartnerStoreSettings,
  updatePartnerStoreSettings,
} from '../../shared/partner/partner.api';

export type StoreProfileScreenProps = {
  storeName: string;
  branchLabel: string;
  cityLabel: string;
  managerLabel: string;
  todayHoursLabel: string;
  activeZoneLabel: string;
  storeOpen: boolean;
  listingEnabled: boolean;
  canonicalStoreId?: string;
  sourceRecordId?: string;
  deliveryReadinessLabel?: string;
  coverageSummary?: string;
  publishStage?: string;
  activationStatus?: DshPartnerActivationStatus;
  serviceModes?: readonly { id: string; enabled: boolean; title?: string }[];
  onOpenStoreScope?: () => void;
};

type StoreSettings = {
  readonly storeId: string;
  readonly status: string;
  readonly deliveryModes: readonly string[];
  readonly storeOpen: boolean;
  readonly listingEnabled: boolean;
  readonly version: number;
};

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'success'; readonly settings: StoreSettings };

type SaveState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved'; readonly label: string }
  | { readonly kind: 'error'; readonly message: string };

type SectionBlockProps = {
  title: string;
  subtitle: string;
  actionLabel: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function parseSettings(raw: unknown): StoreSettings {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('أعاد DSH إعدادات متجر غير صالحة.');
  }
  const value = raw as Record<string, unknown>;
  if (
    typeof value.storeId !== 'string' ||
    typeof value.status !== 'string' ||
    !Array.isArray(value.deliveryModes) ||
    !value.deliveryModes.every((mode) => typeof mode === 'string') ||
    typeof value.storeOpen !== 'boolean' ||
    typeof value.listingEnabled !== 'boolean' ||
    typeof value.version !== 'number'
  ) {
    throw new Error('إعدادات المتجر لا تطابق عقد DSH.');
  }
  return {
    storeId: value.storeId,
    status: value.status,
    deliveryModes: value.deliveryModes,
    storeOpen: value.storeOpen,
    listingEnabled: value.listingEnabled,
    version: value.version,
  };
}

function toBackendMode(modeId: string): string {
  if (modeId === 'partner_delivery') return 'delivery';
  if (modeId === 'bthwani_delivery') return 'express';
  return modeId;
}

function modeIsEnabled(backendModes: readonly string[], modeId: string): boolean {
  return backendModes.includes(toBackendMode(modeId));
}

function SectionBlock({ title, subtitle, actionLabel, expanded, onToggle, children }: SectionBlockProps) {
  const { direction } = useDirection();
  return (
    <Box gap={3} style={styles.section}>
      <Box style={[styles.sectionHeader, { flexDirection: resolveRowDirection(direction) }]}>
        <Box style={styles.flex} gap={1}>
          <Text role="bodyStrong" align="start">{title}</Text>
          <Text role="bodySm" tone="muted" align="start">{subtitle}</Text>
        </Box>
        <Button label={actionLabel} tone="secondary" size="sm" fullWidth={false} onPress={onToggle} />
      </Box>
      {expanded ? <Box gap={3}>{children}</Box> : null}
    </Box>
  );
}

export function StoreProfileScreen({
  storeName,
  branchLabel,
  cityLabel,
  managerLabel,
  todayHoursLabel,
  activeZoneLabel,
  storeOpen,
  listingEnabled,
  canonicalStoreId,
  sourceRecordId,
  deliveryReadinessLabel,
  coverageSummary,
  publishStage,
  activationStatus,
  serviceModes = [],
  onOpenStoreScope,
}: StoreProfileScreenProps) {
  const { direction } = useDirection();
  const [operationsOpen, setOperationsOpen] = React.useState(true);
  const [visibilityOpen, setVisibilityOpen] = React.useState(false);
  const [loadState, setLoadState] = React.useState<LoadState>({ kind: 'loading' });
  const [saveState, setSaveState] = React.useState<SaveState>({ kind: 'idle' });
  const [desiredOpen, setDesiredOpen] = React.useState(storeOpen);
  const [selectedModes, setSelectedModes] = React.useState<readonly string[]>(
    serviceModes.filter((mode) => mode.enabled).map((mode) => mode.id),
  );
  const [saveReason, setSaveReason] = React.useState('تحديث إعدادات تشغيل المتجر من تطبيق الشريك');

  const loadSettings = React.useCallback(async () => {
    if (!canonicalStoreId) {
      setLoadState({ kind: 'error', message: 'لا يوجد متجر موحّد مرتبط بهذه الجلسة.' });
      return;
    }
    setLoadState({ kind: 'loading' });
    try {
      const settings = parseSettings(await fetchPartnerStoreSettings(canonicalStoreId));
      if (settings.storeId !== canonicalStoreId) {
        throw new Error('أعاد DSH سياق متجر مختلفًا عن النطاق المحدد.');
      }
      setDesiredOpen(settings.storeOpen);
      setSelectedModes(
        serviceModes
          .filter((mode) => modeIsEnabled(settings.deliveryModes, mode.id))
          .map((mode) => mode.id),
      );
      setLoadState({ kind: 'success', settings });
    } catch (error) {
      setLoadState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر تحميل إعدادات المتجر.',
      });
    }
  }, [canonicalStoreId, serviceModes]);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const toggleMode = React.useCallback((modeId: string) => {
    setSaveState({ kind: 'idle' });
    setSelectedModes((current) =>
      current.includes(modeId)
        ? current.filter((value) => value !== modeId)
        : [...current, modeId],
    );
  }, []);

  const onSave = React.useCallback(async () => {
    if (!canonicalStoreId || loadState.kind !== 'success') return;
    const normalizedReason = saveReason.trim();
    const backendModes = [...new Set(selectedModes.map(toBackendMode))].sort();
    if (normalizedReason.length < 3 || backendModes.length === 0) {
      setSaveState({ kind: 'error', message: 'حدد وسيلة خدمة واحدة واكتب سببًا واضحًا للحفظ.' });
      return;
    }

    setSaveState({ kind: 'saving' });
    try {
      await updatePartnerStoreSettings(
        canonicalStoreId,
        {
          expectedVersion: loadState.settings.version,
          status: desiredOpen ? 'active' : 'temporarily_closed',
          deliveryModes: backendModes,
          reason: normalizedReason,
        },
        { expectedVersion: loadState.settings.version },
      );
      const readback = parseSettings(await fetchPartnerStoreSettings(canonicalStoreId));
      if (readback.version <= loadState.settings.version) {
        throw new Error('لم يؤكد DSH إصدارًا أحدث بعد الحفظ.');
      }
      setLoadState({ kind: 'success', settings: readback });
      setDesiredOpen(readback.storeOpen);
      setSelectedModes(
        serviceModes
          .filter((mode) => modeIsEnabled(readback.deliveryModes, mode.id))
          .map((mode) => mode.id),
      );
      setSaveState({
        kind: 'saved',
        label: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (error) {
      setSaveState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'تعذر حفظ إعدادات تشغيل المتجر.',
      });
    }
  }, [canonicalStoreId, desiredOpen, loadState, saveReason, selectedModes, serviceModes]);

  if (loadState.kind === 'loading') {
    return <StateView loading title="جاري تحميل حقيقة المتجر…" />;
  }
  if (loadState.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل إعدادات المتجر"
        description={loadState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void loadSettings()}
      />
    );
  }

  const settings = loadState.settings;
  const storeStateLabel = settings.storeOpen ? 'مفتوح الآن' : 'مغلق مؤقتًا';
  const visibilityLabel = settings.listingEnabled ? 'مفعّل' : 'موقوف';
  const serviceabilityAvailable = activeZoneLabel.trim().length > 0 && (coverageSummary?.trim().length ?? 0) > 0;
  const storeVisibility = resolveDshStoreClientVisibility({
    publishStage,
    activationStatus,
    catalogPublished: settings.listingEnabled,
    deliveryModesReady: settings.deliveryModes.length > 0,
    serviceabilityAvailable,
    storeOpen: settings.storeOpen,
  });

  return (
    <Box gap={4} style={styles.container}>
      <Box gap={2}>
        <Text role="bodyStrong" align="start">الحالة المختصرة</Text>
        <Box layoutDirection="row" style={styles.wrapRow}>
          <Chip label={`حالة المتجر: ${storeStateLabel}`} selected />
          <Chip label={`الظهور: ${visibilityLabel}`} selected />
          <Chip label={`الإصدار: ${settings.version}`} />
          <Chip label={`الفرع: ${branchLabel}`} />
        </Box>
      </Box>

      <Divider />

      <Box gap={3}>
        <Text role="bodyStrong" align="start">معلومات المتجر من DSH</Text>
        <KeyValueList
          dense
          items={[
            { label: 'اسم المتجر', value: storeName },
            { label: 'الفرع', value: branchLabel },
            { label: 'المدينة', value: cityLabel },
            { label: 'الدور التشغيلي', value: managerLabel },
            { label: 'ساعات اليوم', value: todayHoursLabel },
            { label: 'منطقة التغطية', value: activeZoneLabel },
            ...(coverageSummary ? [{ label: 'ملخص التغطية', value: coverageSummary }] : []),
            ...(deliveryReadinessLabel ? [{ label: 'جاهزية التوصيل', value: deliveryReadinessLabel }] : []),
            ...(sourceRecordId ? [{ label: 'مرجع المصدر', value: sourceRecordId }] : []),
            ...(publishStage ? [{ label: 'مرحلة النشر', value: publishStage }] : []),
          ]}
        />
      </Box>

      <Divider />

      <SectionBlock
        title="تشغيل المتجر ووسائل الخدمة"
        subtitle="تغييرات تشغيلية فعلية مع قفل إصدار وقراءة راجعة من DSH."
        actionLabel={operationsOpen ? 'إخفاء' : 'تعديل'}
        expanded={operationsOpen}
        onToggle={() => setOperationsOpen((current) => !current)}
      >
        <Box layoutDirection="row" style={styles.wrapRow}>
          <Button
            label={desiredOpen ? 'المتجر مفتوح' : 'المتجر مغلق مؤقتًا'}
            tone={desiredOpen ? 'primary' : 'secondary'}
            size="sm"
            fullWidth={false}
            onPress={() => {
              setDesiredOpen((current) => !current);
              setSaveState({ kind: 'idle' });
            }}
          />
          {serviceModes.map((mode) => (
            <Button
              key={mode.id}
              label={mode.title ?? mode.id}
              tone={selectedModes.includes(mode.id) ? 'primary' : 'secondary'}
              size="sm"
              fullWidth={false}
              onPress={() => toggleMode(mode.id)}
            />
          ))}
        </Box>
        <TextField
          label="سبب التغيير"
          value={saveReason}
          onChangeText={(value) => {
            setSaveReason(value);
            setSaveState({ kind: 'idle' });
          }}
          placeholder="اكتب سببًا تشغيليًا واضحًا"
          multiline
        />
        {saveState.kind === 'error' ? (
          <Text role="bodySm" tone="danger" align="start">{saveState.message}</Text>
        ) : null}
        {saveState.kind === 'saved' ? (
          <Text role="bodySm" tone="success" align="start">تم تأكيد القراءة الراجعة عند {saveState.label}.</Text>
        ) : null}
      </SectionBlock>

      <Divider />

      <SectionBlock
        title="الظهور والنطاق"
        subtitle="قرار الظهور مشتق من حالة التفعيل والكتالوج والتغطية والتشغيل."
        actionLabel="مراجعة النطاق"
        expanded={visibilityOpen}
        onToggle={() => {
          setVisibilityOpen((current) => !current);
          onOpenStoreScope?.();
        }}
      >
        <KeyValueList
          dense
          items={[
            { label: 'الظهور في القائمة', value: visibilityLabel, tone: settings.listingEnabled ? 'success' : 'warning' },
            { label: 'النطاق الحالي', value: activeZoneLabel },
            { label: 'المعروض للعملاء', value: storeVisibility.visible ? 'ظاهر للعميل' : 'محجوب عن العميل', tone: storeVisibility.visible ? 'success' : 'warning' },
            { label: 'حالة التفعيل', value: getDshPartnerActivationStatusLabel(storeVisibility.activationStatus), tone: storeVisibility.visible ? 'success' : 'warning' },
            { label: 'قرار البوابة', value: storeVisibility.blockedReason ?? 'اكتملت شروط الظهور.', tone: storeVisibility.visible ? 'success' : 'warning' },
          ]}
        />
        <Box gap={2}>
          {storeVisibility.checklist.map((check) => (
            <Box key={check.id} style={styles.checkRow}>
              <Box style={[styles.checkHeader, { flexDirection: resolveRowDirection(direction) }]}>
                <Icon
                  name={check.satisfied ? 'checkmark-circle-outline' : 'close-circle-outline'}
                  size={16}
                  tone={check.satisfied ? 'success' : 'danger'}
                />
                <Text role="bodySm" tone={check.satisfied ? 'default' : 'danger'} align="start" style={styles.flex}>
                  {check.label}
                </Text>
                <Chip label={check.satisfied ? 'مكتمل' : 'غير مكتمل'} />
              </Box>
              {!check.satisfied && check.blockedReason ? (
                <Text role="caption" tone="muted" align="start">{check.blockedReason}</Text>
              ) : null}
            </Box>
          ))}
        </Box>
      </SectionBlock>

      <MobileStickyPrimaryAction
        label={saveState.kind === 'saving' ? 'جاري الحفظ…' : 'حفظ إعدادات التشغيل'}
        helperText="يحفظ في DSH ثم يتحقق من إصدار القراءة الراجعة."
        onPress={() => void onSave()}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    paddingBottom: 160,
  },
  section: {
    paddingVertical: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 12,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  wrapRow: {
    flexWrap: 'wrap',
    gap: 8,
  },
  checkRow: {
    borderBottomWidth: 1,
    borderBottomColor: alpha(colorRoles.brandStructure, 0.08),
    paddingVertical: 8,
    gap: 4,
  },
  checkHeader: {
    alignItems: 'center',
    gap: 8,
  },
});
