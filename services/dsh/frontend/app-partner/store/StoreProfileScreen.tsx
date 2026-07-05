import React from 'react';
import { View } from 'react-native';
import {
  Box,
  Button,
  Chip,
  Divider,
  Icon,
  KeyValueList,
  ListItem,
  MobileStickyPrimaryAction,
  Text,
  TextField,
  resolveRowDirection,
  useDirection,
  useTheme,
  spacing,
} from '@bthwani/ui-kit';
import {
  type DshPartnerActivationStatus,
  getDshPartnerActivationStatusLabel,
} from '../../shared/partner/partner-activation.model';
import { resolveDshStoreClientVisibility } from '../../shared/partner/dsh-client-visibility.model';

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
  /** P0-04: Partner activation status from shared SSoT — read-only display.
   *  app-partner reads this; control-panel/partners is the only activation authority. */
  activationStatus?: DshPartnerActivationStatus;
  serviceModes?: readonly { id: string; enabled: boolean }[];
  onOpenStoreScope?: () => void;
};

type SectionBlockProps = {
  title: string;
  subtitle: string;
  actionLabel: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

const identityDocuments = [
  { id: 'license', title: 'الرخصة التجارية', subtitle: 'الهوية القانونية الأساسية للفرع.', meta: 'مكتملة', badgeLabel: 'معتمد' },
  { id: 'tax', title: 'الرقم الضريبي', subtitle: 'متوافق مع متطلبات النشر.', meta: 'مراجع اليوم', badgeLabel: 'جاهز' },
  { id: 'bank', title: 'الحساب المرتبط', subtitle: 'مصدر التسويات والمدفوعات.', meta: 'مرتبط', badgeLabel: 'نشط' },
] as const;

function SectionBlock({ title, subtitle, actionLabel, expanded, onToggle, children }: SectionBlockProps) {
  const { direction } = useDirection();
  const theme = useTheme() as any;

  return (
    <Box gap={3} style={{ paddingVertical: spacing[1] }}>
      <Box style={{ flexDirection: resolveRowDirection(direction), alignItems: 'center', gap: spacing[3] }}>
        <Box style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text role="bodyStrong" align="start">
            {title}
          </Text>
          <Text role="bodySm" tone="muted" align="start">
            {subtitle}
          </Text>
        </Box>
        <Button label={actionLabel} tone="secondary" size="sm" fullWidth={false} onPress={onToggle} />
      </Box>
      {expanded ? (
        <Box gap={3} style={{ marginTop: spacing[1] }}>
          {children}
        </Box>
      ) : null}
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
  const theme = useTheme() as any;
  const [branchSectionOpen, setBranchSectionOpen] = React.useState(true);
  const [identitySectionOpen, setIdentitySectionOpen] = React.useState(false);
  const [visibilitySectionOpen, setVisibilitySectionOpen] = React.useState(false);
  const [branchName, setBranchName] = React.useState(storeName);
  const [branchAddress, setBranchAddress] = React.useState(`${cityLabel}، الياسمين، شارع الندى`);
  const [branchContact, setBranchContact] = React.useState('011 555 0123');
  const [lastSavedLabel, setLastSavedLabel] = React.useState<string | null>(null);

  const storeStateLabel = storeOpen ? 'مفتوح الآن' : 'مغلق الآن';
  const visibilityLabel = listingEnabled ? 'مفعّل' : 'موقوف';
  const canonicalReferenceLabel = canonicalStoreId ? 'تم الربط بالمتجر الموحّد.' : undefined;
  const storeVisibility = React.useMemo(() => resolveDshStoreClientVisibility({
    publishStage,
    activationStatus,
    catalogPublished: listingEnabled,
    deliveryModesReady: serviceModes.some((mode) => mode.enabled),
    serviceabilityAvailable: true,
    storeOpen,
  }), [activationStatus, listingEnabled, publishStage, serviceModes, storeOpen]);

  const onSave = React.useCallback(() => {
    setLastSavedLabel(new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  return (
    <Box gap={4} style={{ padding: spacing[1], paddingBottom: 160 }}>
      {/* 1) Flat Brief Status */}
      <Box gap={2} paddingY={2}>
        <Text role="bodyStrong" align="start">
          الحالة المختصرة
        </Text>
        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          <Chip label={`حالة المتجر: ${storeStateLabel}`} selected />
          <Chip label={`الظهور: ${visibilityLabel}`} selected />
          <Chip label="الهوية: معتمد" selected />
          <Chip label={`الفرع: ${branchLabel}`} selected />
        </Box>
      </Box>

      <Divider />

      {/* 2) Flat Store Information */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">
          معلومات المتجر
        </Text>
        <KeyValueList
          dense
          items={[
            { label: 'اسم المتجر', value: storeName },
            { label: 'الفرع', value: branchLabel },
            { label: 'المدينة', value: cityLabel },
            { label: 'المدير', value: managerLabel },
            { label: 'ساعات اليوم', value: todayHoursLabel },
            { label: 'منطقة التغطية', value: activeZoneLabel },
            ...(coverageSummary ? [{ label: 'ملخص التغطية', value: coverageSummary }] : []),
            ...(deliveryReadinessLabel ? [{ label: 'جاهزية التوصيل', value: deliveryReadinessLabel }] : []),
            ...(sourceRecordId ? [{ label: 'مرجع المصدر', value: sourceRecordId }] : []),
            ...(publishStage ? [{ label: 'مرحلة النشر', value: publishStage }] : []),
            ...(canonicalReferenceLabel ? [{ label: 'مرجع موحد', value: canonicalReferenceLabel, tone: 'brand' as const }] : []),
            { label: 'حالة المتجر', value: storeStateLabel, tone: storeOpen ? 'success' : 'warning' },
            { label: 'الظهور في القائمة', value: visibilityLabel, tone: listingEnabled ? 'success' : 'warning' },
          ]}
        />
      </Box>

      <Divider />

      {/* 3) Flat Branch Info section */}
      <SectionBlock
        title="بيانات الفرع"
        subtitle="تعديل الاسم والعنوان والاتصال من نفس المساحة، بدون قفزات خارجية."
        actionLabel="تعديل بيانات الفرع"
        expanded={branchSectionOpen}
        onToggle={() => setBranchSectionOpen((current) => !current)}
      >
        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <TextField label="اسم الفرع" value={branchName} onChangeText={setBranchName} placeholder="اسم الفرع الحالي" />
          <TextField label="العنوان" value={branchAddress} onChangeText={setBranchAddress} placeholder="عنوان الفرع" multiline />
          <TextField label="رقم التواصل" value={branchContact} onChangeText={setBranchContact} placeholder="رقم الهاتف" />
          <Text role="caption" tone="muted" align="start">
            التعديلات تبقى محلية حتى الضغط على زر الحفظ الأساسي أسفل الصفحة.
          </Text>
        </Box>
      </SectionBlock>

      <Divider />

      {/* 4) Flat Identity and Trust section */}
      <SectionBlock
        title="الهوية والاعتماد"
        subtitle="حالة الاعتماد والوثائق والسجل في مراجعة واحدة مضغوطة."
        actionLabel="إدارة الهوية"
        expanded={identitySectionOpen}
        onToggle={() => setIdentitySectionOpen((current) => !current)}
      >
        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <KeyValueList
            dense
            items={[
              { label: 'حالة الاعتماد', value: 'معتمد', tone: 'success' },
              { label: 'حالة الوثائق', value: 'مكتملة', tone: 'success' },
              { label: 'آخر مراجعة', value: 'اليوم 09:12', tone: 'brand' },
              { label: 'التجهيز للنشر', value: 'جاهز', tone: 'info' },
            ]}
          />

          <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
            <Chip label="الرخصة مكتملة" />
            <Chip label="التحقق الضريبي جاهز" />
            <Chip label="المراجعة اليومية نشطة" />
          </Box>

          <Box gap={0}>
            {identityDocuments.map((document) => (
              <Box key={document.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.line + '22', paddingVertical: spacing[2] }}>
                <Box layoutDirection="row" style={{ alignItems: 'center', paddingHorizontal: spacing[1] }}>
                  <Box style={{ flex: 1, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
                    <Text role="bodyStrong" align="start">{document.title}</Text>
                    <Text role="bodySm" tone="muted" align="start">{document.subtitle}</Text>
                  </Box>
                  <Box style={{ alignItems: direction === 'rtl' ? 'flex-start' : 'flex-end', gap: 2 }}>
                    <Chip label={document.badgeLabel} />
                    <Text role="caption" tone="muted">{document.meta}</Text>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </SectionBlock>

      <Divider />

      {/* 5) Flat Visibility and Scope checklist section */}
      <SectionBlock
        title="الظهور والنطاق"
        subtitle="الظهور في القائمة ونطاق الخدمة الحالي من نفس الصفحة."
        actionLabel="اختيار النطاق"
        expanded={visibilitySectionOpen}
        onToggle={() => {
          setVisibilitySectionOpen((current) => !current);
          onOpenStoreScope?.();
        }}
      >
        <Box gap={3} style={{ paddingHorizontal: spacing[1] }}>
          <KeyValueList
            dense
            items={[
              { label: 'الظهور في القائمة', value: visibilityLabel, tone: listingEnabled ? 'success' : 'warning' },
              { label: 'النطاق الحالي', value: branchLabel },
              { label: 'المنطقة', value: activeZoneLabel },
              {
                label: 'المعروض للعملاء',
                value: storeVisibility.visible ? 'ظاهر للعميل' : 'محجوب عن العميل',
                tone: storeVisibility.visible ? 'success' : 'warning',
              },
              {
                label: 'حالة التفعيل',
                value: getDshPartnerActivationStatusLabel(storeVisibility.activationStatus),
                tone: storeVisibility.visible ? 'success' : 'warning',
              },
              {
                label: 'قرار البوابة',
                value: storeVisibility.blockedReason ?? 'اكتملت الشروط المنطقية للظهور.',
                tone: storeVisibility.visible ? 'success' : 'warning',
              },
            ]}
          />

          <Box gap={2} style={{ paddingHorizontal: spacing[1], marginTop: spacing[1] }}>
            <Text role="caption" tone="muted" align="start">
              شروط الظهور للعملاء — القرار النهائي للعمليات
            </Text>
            {storeVisibility.checklist.map((check) => (
              <Box key={check.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.line + '11', paddingVertical: 6 }}>
                <Box layoutDirection="row" style={{ alignItems: 'center', gap: spacing[2] }}>
                  <Icon
                    name={check.satisfied ? 'checkmark-circle-outline' : 'close-circle-outline'}
                    size={16}
                    tone={check.satisfied ? 'success' : 'danger'}
                  />
                  <Text
                    role="bodySm"
                    tone={check.satisfied ? 'default' : 'danger'}
                    align="start"
                    style={{ flex: 1 }}
                  >
                    {check.label}
                  </Text>
                  {check.satisfied ? (
                    <Chip label="مكتمل" />
                  ) : (
                    <Chip label="غير مكتمل" />
                  )}
                </Box>
                {!check.satisfied && check.blockedReason ? (
                  <Box style={{ marginStart: direction === 'rtl' ? 0 : 24, marginEnd: direction === 'rtl' ? 24 : 0, marginTop: 2 }}>
                    <Text role="caption" tone="muted" align="start">
                      {check.blockedReason}
                    </Text>
                  </Box>
                ) : null}
              </Box>
            ))}
          </Box>

          <Text role="caption" tone="muted" align="start">
            يظل اختيار النطاق محليًا داخل نفس السطح، ويمكن ضمه إلى تحديث الهوية والفرع في حفظ واحد.
          </Text>
        </Box>
      </SectionBlock>

      <MobileStickyPrimaryAction
        label="حفظ تغييرات ملف المتجر"
        helperText={lastSavedLabel ? `آخر حفظ: ${lastSavedLabel}` : 'التعديلات تحفظ محليًا حتى المزامنة التالية.'}
        onPress={onSave}
      />
    </Box>
  );
}

export default StoreProfileScreen;
