import React from 'react';
import { Pressable, Switch as RNSwitch, View, Share, BackHandler } from 'react-native';
import {
  Badge,
  Box,
  Button,
  Chip,
  colorPalette,
  colorRoles,
  Divider,
  Icon,
  KeyValueList,
  MobileScrollView,
  MobileStickyPrimaryAction,
  StateView,
  Surface,
  Text,
  TextField,
  useDirection,
  TopBar,
  ListItem,
  radius,
  spacing,
  typography,
} from '@bthwani/ui-kit';

const theme = {
  brand: colorRoles.brandAction,
  brandSurface: colorRoles.brandActionSoft,
  brandContrast: colorRoles.textInverse,
  surface: colorRoles.surfaceBase,
  surfaceInset: colorRoles.surfaceInset,
  surfaceRaised: colorRoles.surfaceMuted,
  line: colorRoles.borderSubtle,
  lineStrong: colorRoles.borderStrong,
  text: colorRoles.textPrimary,
  textInverse: colorRoles.textInverse,
  success: colorRoles.success,
  warning: colorRoles.warning,
  danger: colorRoles.danger,
  info: colorRoles.info,
} as const;

type BThwaniAppearanceMode = 'lightPremium' | 'darkGlass';

function useAppPartnerAppearance() {
  const [mode, setMode] = React.useState<BThwaniAppearanceMode>('lightPremium');
  return {
    hydrated: true,
    mode,
    setMode,
  };
}

import {
  getWltDshPartnerCommissionLabel,
  getWltDshPartnerOperationalModeCommission,
  wltDshPartnerUiCopy,
} from '../../shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_partner_wlt_dsh_partner_ui_copy.facade';
type DshCanonicalStoreCard = {
  readonly id?: string;
  readonly sourceRecordId?: string;
  readonly publishStage?: string;
  readonly zoneLabel?: string;
  readonly storeName?: string;
  readonly cityLabel?: string;
  readonly branchLabel?: string;
  readonly managerName?: string;
  readonly operatingHoursLabel?: string;
  readonly deliveryReadinessLabel?: string;
  readonly coverageSummary?: string;
};
import { mapPublishStageToPartnerActivationStatus, resolveDshStoreClientVisibility } from '../../shared/partner/dsh-client-visibility.model';
import { WltDshPartnerBridge } from '../../shared/finance-wlt-link/wlt/generated/wlt_frontend_dsh_app_partner.facade';
import type { DshPartnerHubSurfaceProps, PartnerHubSection } from '../dsh-partner.types';
import { getDshControlPanelGovernanceEntry, resolveDshControlPanelSectionLabel } from '../../shared/runtime/dsh-control-panel-governance.map';
import {
  getDshPartnerJourneyStep,
  resolveDshPartnerLifecycleStageLabel,
  type DshPartnerLifecycleStage,
} from '../../shared/partner/partner.journey';
import {
  getDshPartnerActivationStateMetadata,
  getDshPartnerActivationStatusLabel,
  isDshPartnerActivationComplete,
  isDshPartnerClientVisible,
} from '../../shared/partner/partner-activation.model';
import { usePartnerSelfController } from '../../shared/partner/use-partner-self-controller';
import { useIdentitySession } from '@bthwani/core-identity';
import { useDshEntityMedia } from '../../shared/media/useDshEntityMedia';
import { InventoryCatalogScreen } from '../Catalog/InventoryCatalogScreen';
import { PromotionsScreen } from './PromotionsScreen';
import { StoreProfileScreen } from '../store/StoreProfileScreen';

type PartnerOperationalModeId = 'pickup' | 'partner_delivery' | 'bthwani_delivery';

type PartnerOperationalMode = {
  id: PartnerOperationalModeId;
  title: string;
  subtitle: string;
  commission: string | undefined;
  enabled: boolean;
};

type HubNavigationItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  section: Exclude<PartnerHubSection, 'hub'>;
};

type SummaryItem = {
  id: string;
  label: string;
  value: string;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'info' | 'danger';
};

type NotificationPreferenceId =
  | 'orders'
  | 'operations'
  | 'inventory'
  | 'finance'
  | 'marketing'
  | 'system'
  | 'sound'
  | 'dailyDigest'
  | 'priorityOnly';

type NotificationPreferenceState = Record<NotificationPreferenceId, boolean>;

type PartnerTeamRole = 'owner' | 'supervisor' | 'staff' | 'courier';
type PartnerTeamStatus = 'active' | 'paused' | 'invited' | 'blocked' | 'review-needed';

type PartnerTeamMember = {
  id: string;
  name: string;
  role: PartnerTeamRole;
  roleLabel: string;
  status: PartnerTeamStatus;
  statusLabel: string;
  branchAssignment: string;
  permissionsSummary: string;
  deliveryAssignment: string;
  inviteLifecycle: string;
  operationalImpact: string;
  auditNote: string;
  inlineActionLabel: string;
};

type PartnerCoverageZoneStatus = 'active' | 'pending' | 'blocked';

type PartnerCoverageZone = {
  id: string;
  name: string;
  status: PartnerCoverageZoneStatus;
  statusLabel: string;
  branchRelation: string;
  serviceModeRelation: string;
  policySummary: string;
  policyReason: string;
  operationalImpact: string;
  pricingReference: string;
  commissionReference: string;
  payoutReference: string;
  reviewActionLabel: string;
  auditNote: string;
};

const runtimePartnerTeamMembers: readonly PartnerTeamMember[] = [];
const runtimePartnerCoverageZones: readonly PartnerCoverageZone[] = [];

const runtimePartnerAnalytics = {
  storeFavoritesCount: 0,
  productFavoritesCount: 0,
  followersCount: 0,
  totalRatings: 0,
  averageRating: 0,
  topOrderedProduct: { name: 'لا توجد بيانات تشغيلية', ordersCount: 0 },
  topFavoritedProduct: { name: 'لا توجد بيانات تشغيلية', favoritesCount: 0 },
  topViewedProduct: { name: 'لا توجد بيانات تشغيلية', viewsCount: 0 },
  opportunityProduct: {
    name: 'لا توجد بيانات تشغيلية',
    favoritesCount: 0,
    ordersCount: 0,
    insight: 'اربط التحليلات بمسار API أو Control Panel قبل عرض فرص تسويقية تشغيلية.',
  },
  smartRecommendation: 'لا توجد توصية تشغيلية قبل ربط analytics runtime.',
} as const;



function resolveTeamStatusTone(status: PartnerTeamStatus): 'success' | 'warning' | 'info' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  if (status === 'invited') return 'info';
  if (status === 'review-needed') return 'warning';
  return 'danger';
}

function resolveTeamRoleTone(role: PartnerTeamRole): 'action' | 'info' | 'success' | 'neutral' {
  if (role === 'owner') return 'action';
  if (role === 'supervisor') return 'info';
  if (role === 'courier') return 'success';
  return 'neutral';
}

function resolveZoneStatusTone(status: PartnerCoverageZoneStatus): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

function resolveMemberActionLabel(member: PartnerTeamMember): string {
  if (member.status === 'active') return member.role === 'supervisor' ? 'تعطيل' : 'عرض الدور';
  if (member.status === 'paused') return 'إعادة تفعيل';
  if (member.status === 'invited') return 'إعادة إرسال الدعوة';
  if (member.status === 'blocked') return 'طلب مراجعة';
  return 'إرسال للمراجعة';
}

const defaultOperationalModes: readonly PartnerOperationalMode[] = [
  { id: 'pickup', title: 'استلم بنفسك', subtitle: 'استلام من الفرع مباشرة.', commission: getWltDshPartnerOperationalModeCommission('pickup'), enabled: true },
  { id: 'partner_delivery', title: 'توصيل المتجر', subtitle: 'قناة توصيل داخلية بموصل الشريك.', commission: getWltDshPartnerOperationalModeCommission('partner_delivery'), enabled: true },
  { id: 'bthwani_delivery', title: 'توصيل بثواني', subtitle: 'توصيل عبر كابتن بثواني.', commission: getWltDshPartnerOperationalModeCommission('bthwani_delivery'), enabled: false },
] as const;

const partnerHubBottomInset = 144;

const defaultNotificationPreferences: NotificationPreferenceState = {
  orders: true,
  operations: true,
  inventory: true,
  finance: true,
  marketing: false,
  system: true,
  sound: true,
  dailyDigest: false,
  priorityOnly: false,
};

const partnerAppearanceOptions: ReadonlyArray<{
  mode: BThwaniAppearanceMode;
  title: string;
  description: string;
}> = [
  {
    mode: 'lightPremium',
    title: 'فاتح أبيض',
    description: 'واجهة فاتحة واضحة، والزجاج يظهر فقط فيما يحدده المطور أثناء مراجعة الشاشات',
  },
  {
    mode: 'darkGlass',
    title: 'داكن زجاجي',
    description: 'مظهر داكن فاخر مع حواف زجاجية وطبقات واضحة بدون إزعاج بصري',
  },
] as const;

const hubNavigationItems: readonly HubNavigationItem[] = [
  {
    id: 'profile',
    title: 'ملف المتجر',
    description: 'بيانات المتجر، الهوية، الظهور، الفرع، والنطاق في مساحة واحدة.',
    icon: 'storefront-outline',
    section: 'profile',
  },
  {
    id: 'wallet',
    title: wltDshPartnerUiCopy.walletSectionTitle,
    description: wltDshPartnerUiCopy.walletSectionDescription,
    icon: 'wallet-outline',
    section: 'wallet',
  },
  {
    id: 'operations',
    title: 'المتجر والفريق',
    description: 'حالة المتجر، التوصيل، الفريق، ومناطق التغطية.',
    icon: 'people-outline',
    section: 'operations',
  },
  {
    id: 'inventory',
    title: 'المخزون والكتالوج',
    description: 'بحث أولًا، إضافة ذكية، أسعار ومخزون بدون تكرار.',
    icon: 'cube-outline',
    section: 'inventory',
  },
  {
    id: 'analytics',
    title: 'التحليلات والنمو والتسويق',
    description: 'الأداء، الفرص، العروض، الاشتراك، والتوصيات العملية.',
    icon: 'trending-up-outline',
    section: 'analytics',
  },
  {
    id: 'settings',
    title: 'الإعدادات',
    description: 'التنبيهات، اللغة، التفضيلات، وإعدادات المتجر.',
    icon: 'settings-outline',
    section: 'settings',
  },
] as const;

const sectionCopy: Record<Exclude<PartnerHubSection, 'hub'>, { title: string; description: string; icon: React.ComponentProps<typeof Icon>['name'] }> = {
  profile: {
    title: 'ملف المتجر',
    description: 'بيانات المتجر، الهوية، الظهور، الفرع، والنطاق في مساحة واحدة.',
    icon: 'storefront-outline',
  },
  operations: {
    title: 'المتجر والفريق',
    description: 'حالة المتجر، التوصيل، الفريق، ومناطق التغطية.',
    icon: 'people-outline',
  },
  inventory: {
    title: 'المخزون والكتالوج',
    description: 'بحث أولًا، إضافة ذكية، أسعار ومخزون بدون تكرار.',
    icon: 'cube-outline',
  },
  wallet: {
    title: wltDshPartnerUiCopy.walletSectionTitle,
    description: wltDshPartnerUiCopy.walletSectionDescription,
    icon: 'wallet-outline',
  },
  analytics: {
    title: 'التحليلات والنمو والتسويق',
    description: 'الأداء، الفرص، العروض، الاشتراك، والتوصيات العملية.',
    icon: 'trending-up-outline',
  },
  settings: {
    title: 'الإعدادات',
    description: 'التنبيهات، اللغة، التفضيلات، وإعدادات المتجر.',
    icon: 'settings-outline',
  },
};


function SummaryCell({ label, value, tone = 'default' }: Omit<SummaryItem, 'id'>) {

  const accentColor =
    tone === 'success'
      ? theme.success
      : tone === 'warning'
        ? theme.warning
        : tone === 'danger'
          ? theme.danger
          : tone === 'brand'
            ? theme.brand
            : tone === 'info'
              ? theme.info
              : theme.lineStrong;

  // Map local tone (which includes 'brand') to Text's valid tone values
  const textTone: 'default' | 'action' | 'success' | 'warning' | 'danger' | 'info' =
    tone === 'brand' ? 'action' : tone === 'default' ? 'default' : tone;

  return (
    <Box
      padding={3}
      gap={1}
      style={{ flex: 1, minWidth: 96, borderBottomWidth: 2, borderBottomColor: accentColor }}
    >
      <Text role="caption" tone="muted" numberOfLines={1} align="start">
        {label}
      </Text>
      <Text role="bodyStrong" tone={textTone} numberOfLines={1} align="start">
        {value}
      </Text>
    </Box>
  );
}

function SettingsOptionRow({
  title,
  subtitle,
  icon,
  value,
  onValueChange,
  onPress,
  last = false,
  disabled = false,
  compact = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  value?: boolean;
  onValueChange?: (nextValue: boolean) => void;
  onPress?: () => void;
  last?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { direction } = useDirection();

  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';
  const isSwitchRow = typeof value === 'boolean' && typeof onValueChange === 'function';

  return (
    <Pressable
      accessibilityRole={isSwitchRow ? undefined : 'button'}
      accessibilityLabel={title}
      accessibilityState={isSwitchRow ? undefined : { disabled }}
      disabled={disabled}
      onPress={isSwitchRow ? undefined : onPress}
      style={({ pressed }) => [
        {
          width: '100%',
          paddingHorizontal: spacing[4],
          paddingVertical: compact ? 10 : 14,
          backgroundColor: pressed ? theme.surfaceInset : theme.surface,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: theme.line,
          opacity: disabled ? 0.56 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: rowDirection, alignItems: 'center' }}>
        <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: compact ? 10 : 12, flexShrink: 1, minWidth: 0 }}>
          {compact ? (
            <Icon name={icon} size={18} tone={isSwitchRow && value ? 'brand' : 'muted'} style={{ flexShrink: 0 }} />
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.surfaceInset,
                borderWidth: 1,
                borderColor: theme.line,
                flexShrink: 0,
              }}
            >
              <Icon name={icon} size={17} tone={isSwitchRow && value ? 'brand' : 'muted'} />
            </View>
          )}

          <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
            <Text role="bodyStrong" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }} numberOfLines={1}>
              {title}
            </Text>
            <Text role="bodySm" tone="muted" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {isSwitchRow ? (
          <RNSwitch
            disabled={disabled}
            value={value}
            onValueChange={onValueChange}
            thumbColor={value ? theme.brandContrast : theme.surfaceRaised}
            trackColor={{ false: theme.lineStrong, true: theme.brand }}
            ios_backgroundColor={theme.lineStrong}
          />
        ) : (
          <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
        )}
      </View>
    </Pressable>
  );
}

/** Section shell — no TopBar/back button; hardware back handles navigation.
 * Section title is displayed inline as a visual header inside the content. */
function HubSectionShell({
  title,
  icon,
  onBack,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onBack: () => void;
  children?: React.ReactNode;
}) {
  const { direction } = useDirection();

  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  React.useEffect(() => {
    const backAction = () => {
      onBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBack]);

  return (
    <MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: partnerHubBottomInset }}>
      {/* Visual section title — no back button, hardware back handles it */}
      <View
        style={{
          flexDirection: rowDirection,
          alignItems: 'center',
          gap: spacing[3],
          paddingBottom: spacing[1],
          borderBottomWidth: 1,
          borderBottomColor: theme.line,
          marginBottom: spacing[1],
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.brandSurface,
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={18} tone="brand" />
        </View>
        <Text
          role="titleSm"
          style={{ textAlign: direction === 'rtl' ? 'right' : 'left', flex: 1 }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <View style={{ gap: spacing[4] }}>
        {children}
      </View>
    </MobileScrollView>
  );
}

/** Premium nav row: icon + title + subtitle on the content side, chevron on the action side. RTL-correct. */
function HubNavRow({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void;
}) {
  const { direction } = useDirection();

  const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: rowDirection,
        alignItems: 'center',
        paddingHorizontal: spacing[4],
        paddingVertical: 14,
        borderRadius: radius.md,
        backgroundColor: pressed ? theme.surfaceInset : theme.surfaceRaised,
        gap: spacing[3],
        borderWidth: 1,
        borderColor: theme.line,
      })}
    >
      {/* Icon + Text cluster — stays together on the content side */}
      <View
        style={{
          flexDirection: rowDirection,
          alignItems: 'center',
          gap: spacing[3],
          flex: 1,
          minWidth: 0,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.brandSurface,
            borderWidth: 1,
            borderColor: theme.brand + '33',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={20} tone="brand" />
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 0,
            gap: 2,
            alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start',
          }}
        >
          <Text
            role="bodyStrong"
            numberOfLines={1}
            style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}
          >
            {title}
          </Text>
          <Text
            role="bodySm"
            tone="muted"
            numberOfLines={2}
            style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}
          >
            {description}
          </Text>
        </View>
      </View>

      {/* Chevron — always on the action/opposite side */}
      <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
    </Pressable>
  );
}


function resolveServiceModeEnabled(serviceModes: readonly { id: string; enabled: boolean }[] | undefined, modeId: PartnerOperationalMode['id'], fallback: boolean) {
  const matched = serviceModes?.find((mode) => {
    if (modeId === 'pickup') return mode.id === 'pickup';
    // transitional aliases: legacy `delivery` plus textual `store delivery` / `partner delivery`
    // all map to canonical `partner_delivery` which is displayed as "توصيل المتجر".
    if (modeId === 'partner_delivery') {
      return mode.id === 'partner_delivery'
        || mode.id === 'partner delivery'
        || mode.id === 'delivery'
        || mode.id === 'store-delivery'
        || mode.id === 'store delivery';
    }
    // transitional aliases: legacy 'scheduled' / 'seconds' map to bthwani_delivery
    return mode.id === 'bthwani_delivery' || mode.id === 'scheduled' || mode.id === 'seconds';
  });

  return matched?.enabled ?? fallback;
}

function OperationsModeRow({
  mode,
  selected,
  onPress,
}: {
  mode: PartnerOperationalMode;
  selected: boolean;
  onPress: () => void;
}) {
  const { direction } = useDirection();


  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mode.title}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: '100%',
          paddingHorizontal: spacing[4],
          paddingVertical: 14,
          backgroundColor: pressed ? theme.surfaceInset : theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.line,
        },
      ]}
    >
      <View
        style={{
          flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? theme.brandSurface : theme.surfaceInset,
              borderWidth: 1,
              borderColor: selected ? theme.brand : theme.line,
              flexShrink: 0,
            }}
          >
            <Icon name={mode.id === 'pickup' ? 'hand-left-outline' : mode.id === 'partner_delivery' ? 'car-outline' : 'bicycle-outline'} size={16} tone={selected ? 'brand' : 'muted'} />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text role="bodyStrong" align="start" numberOfLines={1}>
              {mode.title}
            </Text>
            <Text role="bodySm" tone="muted" align="start" numberOfLines={1}>
              {mode.subtitle}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: direction === 'rtl' ? 'flex-start' : 'flex-end', gap: spacing[1], marginEnd: 10 }}>
          <Chip label={mode.enabled ? 'مفعّل' : 'غير مفعّل'} />
          <Text role="caption" tone="muted">
            {getWltDshPartnerCommissionLabel(mode.commission)}
          </Text>
        </View>

        <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
      </View>
    </Pressable>
  );
}

function OperationsPanel({
  branchLabel,
  cityLabel,
  storeName,
  todayHoursLabel,
  storeOpen,
  activeZoneLabel,
  serviceModes,
  onBack,
  onOpenStoreCourierSetup,
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
  serviceModes: readonly { id: string; label: string; description: string; enabled: boolean }[];
  onBack: () => void;
  onOpenStoreCourierSetup?: () => void;
  listingEnabled: boolean;
  storeVisibility: ReturnType<typeof resolveDshStoreClientVisibility>;
  visibilityLabel: string;
}) {
  const { direction } = useDirection();

  const teamMembers = runtimePartnerTeamMembers;
  const coverageZones = runtimePartnerCoverageZones;
  const [selectedModeId, setSelectedModeId] = React.useState<PartnerOperationalMode['id'] | ''>('pickup');
  const [teamPanelOpen, setTeamPanelOpen] = React.useState(false);
  const [coveragePanelOpen, setCoveragePanelOpen] = React.useState(false);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string>(teamMembers.find((member) => member.role === 'supervisor')?.id ?? teamMembers[0]?.id ?? '');
  const [selectedZoneId, setSelectedZoneId] = React.useState<string>(coverageZones.find((zone) => zone.status === 'active')?.id ?? coverageZones[0]?.id ?? '');
  const [inviteDraft, setInviteDraft] = React.useState('');
  const [lastSaveLabel, setLastSaveLabel] = React.useState<string | null>(null);

  const resolvedModes = React.useMemo(
    () =>
      defaultOperationalModes.map((mode) => ({
        ...mode,
        enabled: resolveServiceModeEnabled(serviceModes, mode.id, mode.enabled),
      })),
    [serviceModes],
  );

  const activeModesCount = resolvedModes.filter((mode) => mode.enabled).length;
      const activeSupervisorCount = teamMembers.filter((member) => member.role === 'supervisor' && member.status === 'active').length;
      const activeTeamCount = teamMembers.filter((member) => member.status === 'active').length;
      const pausedTeamCount = teamMembers.filter((member) => member.status === 'paused').length;
      const invitedTeamCount = teamMembers.filter((member) => member.status === 'invited').length;
      const blockedTeamCount = teamMembers.filter((member) => member.status === 'blocked').length;
      const reviewTeamCount = teamMembers.filter((member) => member.status === 'review-needed').length;
      const activeZoneCount = coverageZones.filter((zone) => zone.status === 'active').length;
      const pendingZoneCount = coverageZones.filter((zone) => zone.status === 'pending').length;
      const blockedZoneCount = coverageZones.filter((zone) => zone.status === 'blocked').length;
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
          التسعير والتسويات مركزيًا في WLT/Finance. (ربط WLT قيد التنفيذ — J-010)
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
              <Box key={mode.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.line + '33' }}>
                <Pressable
                  onPress={() => setSelectedModeId(isSelected ? '' : mode.id)}
                  style={({ pressed }) => ({
                    flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[1],
                    backgroundColor: pressed ? theme.surfaceInset : undefined,
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
            label={teamPanelOpen ? 'إخفاء الأعضاء' : 'إدارة الفريق'}
            tone="secondary"
            size="sm"
            fullWidth={false}
            onPress={() => setTeamPanelOpen((current) => !current)}
          />
        </Box>

        <Box layoutDirection="row" style={{ flexWrap: 'wrap', gap: spacing[2] }}>
          <SummaryCell label="نشط" value={String(activeTeamCount)} tone="success" />
          <SummaryCell label="موقوف" value={String(pausedTeamCount)} tone="warning" />
          <SummaryCell label="قيد المراجعة" value={String(reviewTeamCount)} tone="info" />
        </Box>

        {teamPanelOpen && (
          <Box gap={3} style={{ paddingHorizontal: spacing[1], marginTop: spacing[1] }}>
            <Box layoutDirection="row" style={{ alignItems: 'center', gap: 6 }}>
              <Icon name="information-circle-outline" size={14} tone="muted" />
              <Text role="caption" tone="muted" align="start" style={{ flex: 1 }}>
                الأدوار والدعوات هنا محلية حتى يتصل مسار إدارة الأعضاء في Control Panel.
              </Text>
            </Box>

            <Box gap={0}>
              {teamMembers.map((member) => {
                const isMemberSelected = selectedMemberId === member.id;
                const roleTone = resolveTeamRoleTone(member.role);
                const statusTone = resolveTeamStatusTone(member.status);
                const memberActionLabel = resolveMemberActionLabel(member);
                const isLastSupervisor = member.role === 'supervisor' && member.status === 'active' && activeSupervisorCount <= 1;

                return (
                  <Box key={member.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.line + '22', paddingVertical: spacing[2] }}>
                    <Pressable
                      onPress={() => setSelectedMemberId(isMemberSelected ? '' : member.id)}
                      style={({ pressed }) => ({
                        flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        backgroundColor: pressed ? theme.surfaceInset : undefined,
                        padding: spacing[1],
                      })}
                    >
                      <Box layoutDirection="row" style={{ alignItems: 'center', gap: spacing[2], flexShrink: 1, minWidth: 0 }}>
                        <Icon
                          name={member.role === 'courier' ? 'bicycle-outline' : member.role === 'owner' ? 'shield-checkmark-outline' : member.role === 'supervisor' ? 'person-circle-outline' : 'person-outline'}
                          size={16}
                          tone={roleTone === 'neutral' ? 'muted' : roleTone === 'info' ? 'action' : roleTone}
                        />
                        <Box style={{ gap: 2, flexShrink: 1, minWidth: 0 }}>
                          <Text role="bodyStrong" align="start">{member.name}</Text>
                          <Text role="caption" tone="muted" align="start">{member.branchAssignment}</Text>
                        </Box>
                      </Box>
                      <Box style={{ alignItems: direction === 'rtl' ? 'flex-start' : 'flex-end', gap: 2, marginStart: spacing[2] }}>
                        <Badge label={member.roleLabel} tone={roleTone} />
                        <Badge label={member.statusLabel} tone={statusTone} />
                        <Text role="caption" tone="muted">{memberActionLabel}</Text>
                      </Box>
                      <Icon name={isMemberSelected ? 'chevron-down' : 'chevron-forward-outline'} mirrored tone="muted" size={14} style={{ marginStart: spacing[2] }} />
                    </Pressable>

                    {isMemberSelected && (
                      <Box paddingX={4} gap={2} style={{ paddingTop: spacing[3] }}>
                        <KeyValueList
                          dense
                          items={[
                            { label: 'الحالة', value: member.statusLabel, tone: statusTone },
                            { label: 'تعيين الفرع', value: member.branchAssignment },
                            { label: 'ملخص الصلاحيات', value: member.permissionsSummary },
                            { label: 'إسناد التوصيل', value: member.deliveryAssignment },
                            { label: 'دورة الدعوة', value: member.inviteLifecycle },
                            { label: 'المراجعة/الأثر', value: member.operationalImpact },
                          ]}
                        />
                        <Text role="bodySm" tone="muted" align="start">
                          {member.auditNote}
                        </Text>
                        {isLastSupervisor ? (
                          <Text role="caption" tone="warning" align="start">
                            لا يمكن تعطيل آخر مشرف.
                          </Text>
                        ) : null}
                        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
                          <Button
                            label={memberActionLabel}
                            tone={member.status === 'blocked' ? 'secondary' : 'brand'}
                            size="sm"
                            fullWidth={false}
                            disabled={isLastSupervisor}
                            onPress={() => {
                              if (isLastSupervisor) {
                                setLastSaveLabel('لا يمكن تعطيل آخر مشرف.');
                                return;
                              }

                              setLastSaveLabel(`${memberActionLabel}: ${member.name}`);
                            }}
                          />
                          <Button
                            label={member.status === 'invited' ? 'إعادة إرسال الدعوة' : member.status === 'blocked' ? 'طلب مراجعة' : 'مراجعة الصلاحيات'}
                            tone="secondary"
                            size="sm"
                            fullWidth={false}
                            onPress={() => {
                              setLastSaveLabel(`${member.statusLabel}: ${member.name}`);
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>

            <Box gap={3} style={{ marginTop: spacing[2] }}>
              <TextField
                label="اسم العضو أو البريد"
                placeholder="مثال: staff@bthwani.sa"
                value={inviteDraft}
                onChangeText={setInviteDraft}
                hint="إنشاء دعوة محلية — مسار العضوية المركزي قيد الربط (J-006)."
              />
              <Button
                label="إضافة عضو"
                tone="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  if (!inviteDraft.trim()) {
                    return;
                  }

                  setLastSaveLabel(`دعوة محلية: ${inviteDraft.trim()}`);
                  setInviteDraft('');
                }}
              />
              {lastSaveLabel && (
                <Text role="caption" tone="success" align="start">
                  {lastSaveLabel}
                </Text>
              )}
            </Box>
          </Box>
        )}
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
              {coverageZones.map((zone) => {
                const isZoneSelected = selectedZoneId === zone.id;
                const statusTone = resolveZoneStatusTone(zone.status);

                return (
                  <Box key={zone.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.line + '22', paddingVertical: spacing[2] }}>
                    <Pressable
                      onPress={() => setSelectedZoneId(isZoneSelected ? '' : zone.id)}
                      style={({ pressed }) => ({
                        flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        backgroundColor: pressed ? theme.surfaceInset : undefined,
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

/** Analytics view-model — preview/seed data only.
 * No customer PII. Summary metrics only per on-demand retrieval contract.
 * Designed for later real-data binding without layout changes. */


function AnalyticsInsightMetric({ label, value, tone = 'default', icon }: { label: string; value: string; tone?: 'default' | 'action' | 'success' | 'info' | 'muted'; icon: React.ComponentProps<typeof Icon>['name'] }) {

  const { direction } = useDirection();
  const accentColor = tone === 'action' ? theme.brand : tone === 'success' ? theme.success : tone === 'info' ? theme.info : theme.lineStrong;
  const iconTone =
    tone === 'default' ? undefined
      : tone === 'action' ? ('brand' as const)
        : tone === 'info' ? ('action' as const)
          : tone === 'muted' ? ('muted' as const)
            : tone;

  return (
    <Box
      padding={3}
      gap={1}
      style={{ flex: 1, minWidth: 140, borderBottomWidth: 2, borderBottomColor: accentColor }}
    >
      <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={14} {...(iconTone !== undefined ? { tone: iconTone } : {})} />
        <Text role="caption" tone="muted" numberOfLines={1} style={{ flex: 1, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
          {label}
        </Text>
      </View>
      <Text role="titleSm" tone={tone} numberOfLines={1} align="start">
        {value}
      </Text>
    </Box>
  );
}

function AnalyticsInsightsPanel({ storeName }: { storeName: string }) {
  const { direction } = useDirection();

  const d = runtimePartnerAnalytics;

  return (
    <Box gap={4}>
      {/* Summary headline */}
      <Box gap={2} paddingY={2}>
        <Text role="label" tone="muted" align="start">
          ملخص الأداء — {storeName}
        </Text>
        <Text role="bodySm" tone="muted" align="start">
          مؤشرات موجزة للتفاعل والنمو. لا تتضمن بيانات عملاء تفصيلية.
        </Text>
      </Box>

      <Divider />

      {/* Engagement metrics grid */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">مؤشرات التفاعل</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <AnalyticsInsightMetric label="حفظ المتجر في المفضلة" value={d.storeFavoritesCount.toLocaleString('ar')} tone="action" icon="heart-outline" />
          <AnalyticsInsightMetric label="متابعو المتجر" value={d.followersCount.toLocaleString('ar')} tone="info" icon="people-outline" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <AnalyticsInsightMetric label="حفظ المنتجات في المفضلة" value={d.productFavoritesCount.toLocaleString('ar')} tone="success" icon="bookmark-outline" />
          <AnalyticsInsightMetric label="عدد التقييمات" value={d.totalRatings.toLocaleString('ar')} tone="muted" icon="star-half-outline" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <AnalyticsInsightMetric label="متوسط التقييم" value={`${d.averageRating} ⭐`} tone="action" icon="star" />
        </View>
      </Box>

      <Divider />

      {/* Top products */}
      <Box gap={3} paddingY={2}>
        <Text role="bodyStrong" align="start">أبرز المنتجات</Text>
        <KeyValueList
          dense
          items={[
            { label: 'الأكثر طلبًا', value: `${d.topOrderedProduct.name} (${d.topOrderedProduct.ordersCount} طلب)`, tone: 'brand' },
            { label: 'الأكثر تفضيلًا', value: `${d.topFavoritedProduct.name} (${d.topFavoritedProduct.favoritesCount} حفظ)`, tone: 'success' },
            { label: 'الأعلى مشاهدة', value: `${d.topViewedProduct.name} (${d.topViewedProduct.viewsCount} مشاهدة)`, tone: 'info' },
          ]}
        />
      </Box>

      <Divider />

      {/* Opportunity spotlight */}
      <Box
        padding={3}
        gap={3}
        background="surfaceRaised"
        radiusToken="md"
        border={false}
        style={{
          borderStartWidth: 4,
          borderStartColor: theme.warning,
        }}
      >
        <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing[2] }}>
          <Icon name="bulb-outline" size={18} tone="warning" />
          <Text role="bodyStrong" tone="warning">فرصة تسويقية</Text>
        </View>
        <Text role="bodySm" align="start">
          <Text role="bodySm" tone="muted">{d.opportunityProduct.name}: </Text>
          {d.opportunityProduct.insight}
        </Text>
        <KeyValueList
          dense
          items={[
            { label: 'المفضلات', value: String(d.opportunityProduct.favoritesCount), tone: 'success' },
            { label: 'الطلبات الفعلية', value: String(d.opportunityProduct.ordersCount), tone: 'warning' },
          ]}
        />
      </Box>

      <Divider />

      {/* Smart recommendation */}
      <Box
        padding={3}
        gap={3}
        background="surfaceRaised"
        radiusToken="md"
        border={false}
        style={{
          borderStartWidth: 4,
          borderStartColor: theme.brand,
        }}
      >
        <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing[2] }}>
          <Icon name="trending-up-outline" size={18} tone="brand" />
          <Text role="bodyStrong" tone="action">توصية ذكية</Text>
        </View>
        <Text role="bodySm" align="start">{d.smartRecommendation}</Text>
      </Box>

      {/* Promotion and marketing decisions are operator-owned (control-panel marketing
          section over runtime APIs). No local promotion action is exposed here. */}
      <Box padding={3} gap={2} background="surfaceRaised" radiusToken="md" border={false}>
        <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing[2] }}>
          <Icon name="megaphone-outline" size={18} tone="muted" />
          <Text role="bodyStrong" tone="muted">الترويج والعروض</Text>
        </View>
        <Text role="bodySm" tone="muted" align="start">
          تُدار الحملات والعروض الترويجية من فريق التسويق عبر لوحة التحكم. لا توجد إجراءات ترويج محلية من تطبيق الشريك.
        </Text>
      </Box>
    </Box>
  );
}

export function DshPartnerHubSurface(props: DshPartnerHubSurfaceProps) {

  const {
    state = 'ready',
    section,
    onSectionChange,
    storeName = 'متجر الفخامة',
    branchLabel = 'الرياض، فرع الياسمين',
    cityLabel = 'الرياض',
    managerLabel = 'خالد',
    todayHoursLabel = '09:00 - 23:00',
    storeOpen = true,
    listingEnabled = true,
    activeZoneLabel = 'الياسمين / الندى',
    activeOrdersCount = 13,
    serviceModes = [],
    onOpenOrdersBoard,
    onOpenOrdersSearch,
    onOpenStoreScope,
    onOpenSupportDirectory,
    onOpenWalletHub,
    onOpenBell,
    onOpenOperationalFlow,
    onOpenSupportScreen,
    onOpenStoreCourierSetup,
    onToggleAvailability,
    canonicalStoreId,
    dshAuthBearerToken,
    dshClientId,
    walletBalanceLabel,
    // ML-T1: partner lifecycle stage for readiness status summary (read-only, summary-only per on-demand contract)
    partnerLifecycleStage = 'partner-review' as DshPartnerLifecycleStage,
  } = props as DshPartnerHubSurfaceProps & { partnerLifecycleStage?: DshPartnerLifecycleStage; dshAuthBearerToken?: string | null; dshClientId?: string | null };

  const [isAvailable, setIsAvailable] = React.useState<boolean>(storeOpen);


  const { direction } = useDirection();

  const partnersGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('partners'), []);
  const catalogsGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('catalogs'), []);
  const marketingGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('marketing'), []);
  const financeGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('finance'), []);
  // ML-T1: journey map reference — summary-only; details on-demand per on-demand contract
  const partnerStatusStep = React.useMemo(() => getDshPartnerJourneyStep(undefined), []);
  const {
    hydrated: appearanceHydrated,
    mode: appearanceMode,
    setMode: setAppearanceMode,
  } = useAppPartnerAppearance();
  const [internalSection, setInternalSection] = React.useState<PartnerHubSection>('hub');
  const [notificationPreferences, setNotificationPreferences] = React.useState<NotificationPreferenceState>(defaultNotificationPreferences);
  const [showAdvancedNotifications, setShowAdvancedNotifications] = React.useState<boolean>(false);
  const activeSection = section ?? internalSection;
  const updateSection = onSectionChange ?? setInternalSection;
  const activeCanonicalStore = React.useMemo((): DshCanonicalStoreCard | undefined => {
    return undefined;
  }, []);
  const identity = useIdentitySession();
  const {
    statusState: selfStatusState,
    readinessState: selfReadinessState,
    readinessViewModel: selfReadinessViewModel,
    reload: reloadSelfStatus,
  } = usePartnerSelfController(identity.state.kind);
  const resolvedActivationStatus = selfStatusState.kind === 'success'
    ? selfStatusState.partner.activationStatus
    : mapPublishStageToPartnerActivationStatus(activeCanonicalStore?.publishStage);
  // Publication gate split (shared model owns the decision, this surface renders it):
  // partner_active/client_hidden = internally active, NOT client-facing yet.
  // client_visible = full operational surfaces tied to client exposure.
  const isClientVisibleStage = isDshPartnerClientVisible(resolvedActivationStatus);
  const isInternalActiveOnly =
    identity.state.kind === 'authenticated' &&
    selfStatusState.kind === 'success' &&
    isDshPartnerActivationComplete(resolvedActivationStatus) &&
    !isClientVisibleStage;
  const _storeMediaId = activeCanonicalStore?.id ?? canonicalStoreId;
  const resolvedActiveZoneLabel = activeCanonicalStore?.zoneLabel ?? activeZoneLabel;

  const storeMediaState = useDshEntityMedia(_storeMediaId, 'store');
  const storeMediaAssets = storeMediaState.kind === 'ready' ? storeMediaState.assets : [];
  const storeCoverUrl = storeMediaAssets.find((a) => a.purpose === 'cover')?.public_url;
  const storeLogoUrl = storeMediaAssets.find((a) => a.purpose === 'logo')?.public_url;

  const [selectedModeId, setSelectedModeId] = React.useState<string>('pickup');
  const resolvedStoreName = activeCanonicalStore?.storeName ?? storeName;
  const resolvedCityLabel = activeCanonicalStore?.cityLabel ?? cityLabel;
  const resolvedBranchLabel = activeCanonicalStore?.branchLabel ?? branchLabel;
  const resolvedManagerLabel = activeCanonicalStore?.managerName ?? managerLabel;
  const resolvedTodayHoursLabel = activeCanonicalStore?.operatingHoursLabel ?? todayHoursLabel;
  const [branchContact] = React.useState('011 555 0123');

  const activeHubNavigationItems = React.useMemo(() => {
    return hubNavigationItems.filter((item) => item.id !== 'profile');
  }, []);

  const storeVisibility = React.useMemo(() => {
    return resolveDshStoreClientVisibility({
      ...(activeCanonicalStore?.publishStage !== undefined ? { publishStage: activeCanonicalStore.publishStage } : {}),
      activationStatus: resolvedActivationStatus,
      catalogPublished: listingEnabled,
      deliveryModesReady: serviceModes.some((mode) => mode.enabled),
      serviceabilityAvailable: true,
      storeOpen: isAvailable,
    });
  }, [listingEnabled, activeCanonicalStore?.publishStage, resolvedActivationStatus, serviceModes, isAvailable]);

  const visibilityLabel = listingEnabled ? 'مفعّل' : 'موقوف';

  const enabledNotificationChannelsCount = React.useMemo(
    () => ['orders', 'operations', 'inventory', 'finance', 'marketing', 'system'].filter((key) => notificationPreferences[key as NotificationPreferenceId]).length,
    [notificationPreferences],
  );

  function updateNotificationPreference(preferenceId: NotificationPreferenceId, nextValue: boolean) {
    setNotificationPreferences((current) => ({
      ...current,
      [preferenceId]: nextValue,
    }));
  }

  function openOrderAlerts() {
    onOpenOperationalFlow?.('order-alerts');
    onOpenBell?.();
  }

  function openOperationsDirectory() {
    onOpenOperationalFlow?.('order-issue-queue');
    onOpenSupportDirectory?.();
    onOpenSupportScreen?.('order-issue-queue');
  }

  const openOrdersSearch = React.useCallback(() => {
    if (onOpenOrdersSearch) {
      onOpenOrdersSearch();
      return;
    }

    onOpenOrdersBoard?.();
  }, [onOpenOrdersBoard, onOpenOrdersSearch]);

  const summaryItems = React.useMemo<readonly SummaryItem[]>(
    () => [
      { id: 'store-status', label: 'حالة المتجر', value: isAvailable ? 'مفتوح الآن' : 'مغلق الآن', tone: isAvailable ? 'success' : 'warning' },
      { id: 'active-orders', label: 'الطلبات النشطة', value: String(activeOrdersCount), tone: 'brand' },
      { id: 'hours', label: 'ساعات العمل', value: resolvedTodayHoursLabel, tone: 'info' },
    ],
    [activeOrdersCount, resolvedTodayHoursLabel, isAvailable],
  );

  if (state !== 'ready') {
    const isLoading = state === 'loading';
    const tone = state === 'offline' ? 'warning' : state === 'empty' ? 'neutral' : state === 'loading' ? 'neutral' : 'danger';

    return (
      <StateView
        loading={isLoading}
        tone={tone}
        title="مركز حساب الشريك"
        description="نجهز الآن نموذج التنقل الخاص بالحساب. سيبقى المسار واضحًا ومضغوطًا حتى يكتمل التحميل."
        actionLabel={onOpenOrdersBoard ? 'فتح الطلبات' : undefined}
        onActionPress={onOpenOrdersBoard}
      />
    );
  }

  if (identity.state.kind === 'authenticated' && (selfStatusState.kind === 'idle' || selfStatusState.kind === 'loading')) {
    return <StateView loading title="جاري تحميل حالة الانضمام…" />;
  }

  if (identity.state.kind === 'authenticated' && selfStatusState.kind === 'error') {
    return (
      <StateView
        tone="danger"
        title="تعذر تحميل حالة الانضمام"
        description={selfStatusState.message}
        actionLabel="إعادة المحاولة"
        onActionPress={reloadSelfStatus}
      />
    );
  }

  if (identity.state.kind === 'authenticated' && selfStatusState.kind === 'success' && !isDshPartnerActivationComplete(selfStatusState.partner.activationStatus)) {
    const statusMeta = getDshPartnerActivationStateMetadata(selfStatusState.partner.activationStatus);
    const readinessItems = selfReadinessViewModel?.items ?? [];
    return (
      <MobileScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
        showsVerticalScrollIndicator={false}
      >
        <Surface style={{ padding: spacing[4], gap: spacing[3], borderRadius: radius.md }}>
          <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
            <Text role="titleMd" style={{ textAlign: 'right', fontWeight: 'bold' }}>
              حالة الانضمام
            </Text>
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
              لا يمكن تفعيل الحساب ذاتيًا. تتم المراجعة والتفعيل من لوحة التحكم.
            </Text>
          </View>

          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2] }}>
            <Badge label={getDshPartnerActivationStatusLabel(selfStatusState.partner.activationStatus)} tone="info" />
            <Badge label={selfReadinessState.kind === 'success' && selfReadinessState.readiness.canActivatePartner ? 'جاهز للمراجعة' : 'بانتظار استكمال الاعتماد'} tone={selfReadinessState.kind === 'success' && selfReadinessState.readiness.canActivatePartner ? 'success' : 'warning'} />
          </View>

          <View style={{ gap: spacing[2], alignItems: 'flex-end' }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>الخطوة التالية</Text>
            <Text role="bodySm" tone="secondary" style={{ textAlign: 'right' }}>
              {statusMeta.nextAction}
            </Text>
            {statusMeta.blockedReason ? (
              <Text role="caption" tone="danger" style={{ textAlign: 'right' }}>
                {statusMeta.blockedReason}
              </Text>
            ) : null}
          </View>
        </Surface>

        <Surface style={{ padding: spacing[4], gap: spacing[2], borderRadius: radius.md }}>
          <Text role="bodyStrong" style={{ textAlign: 'right', fontWeight: 'bold' }}>
            النواقص والجاهزية
          </Text>
          {selfReadinessState.kind === 'loading' || selfReadinessState.kind === 'idle' ? (
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>جاري تحميل الجاهزية…</Text>
          ) : readinessItems.length === 0 ? (
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>لا توجد تفاصيل جاهزية متاحة الآن.</Text>
          ) : (
            readinessItems.map((item) => (
              <View key={item.label} style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: spacing[2] }}>
                <Icon name={item.satisfied ? 'checkmark-circle' : 'ellipse-outline'} size={18} tone={item.satisfied ? 'success' : 'muted'} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text role="bodySm" style={{ textAlign: 'right' }}>{item.label}</Text>
                  {!item.satisfied && item.blockedReason ? (
                    <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>{item.blockedReason}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Surface>

        <Button label="تحديث الحالة" tone="secondary" onPress={reloadSelfStatus} />
      </MobileScrollView>
    );
  }

  if (activeSection !== 'hub') {
    if (activeSection === 'profile') {
      return (
        <HubSectionShell title={sectionCopy.profile.title} description={sectionCopy.profile.description} icon={sectionCopy.profile.icon} onBack={() => updateSection('hub')}>
          <StoreProfileScreen
            storeName={resolvedStoreName}
            branchLabel={resolvedBranchLabel}
            cityLabel={resolvedCityLabel}
            managerLabel={resolvedManagerLabel}
            todayHoursLabel={resolvedTodayHoursLabel}
            activeZoneLabel={resolvedActiveZoneLabel}
            storeOpen={storeOpen}
            listingEnabled={listingEnabled}
            {...(activeCanonicalStore?.id !== undefined ? { canonicalStoreId: activeCanonicalStore.id } : {})}
            {...(activeCanonicalStore?.sourceRecordId !== undefined ? { sourceRecordId: activeCanonicalStore.sourceRecordId } : {})}
            {...(activeCanonicalStore?.deliveryReadinessLabel !== undefined ? { deliveryReadinessLabel: activeCanonicalStore.deliveryReadinessLabel } : {})}
            {...(activeCanonicalStore?.coverageSummary !== undefined ? { coverageSummary: activeCanonicalStore.coverageSummary } : {})}
            {...(activeCanonicalStore?.publishStage !== undefined ? { publishStage: activeCanonicalStore.publishStage } : {})}
            activationStatus={resolvedActivationStatus}
            serviceModes={serviceModes}
            {...(onOpenStoreScope !== undefined ? { onOpenStoreScope } : {})}
          />
        </HubSectionShell>
      );
    }

    if (activeSection === 'analytics') {
      // Growth/marketing surfaces imply client exposure — locked until client_visible.
      if (isInternalActiveOnly) {
        return (
          <HubSectionShell title={sectionCopy.analytics.title} description={sectionCopy.analytics.description} icon={sectionCopy.analytics.icon} onBack={() => updateSection('hub')}>
            <StateView
              tone="warning"
              title="التحليلات والتسويق غير متاحة قبل الظهور للعملاء"
              description="الشريك نشط داخليًا، المتجر غير ظاهر للعملاء حتى اكتمال بوابات النشر. تُفتح مؤشرات النمو والتسويق بعد تفعيل الظهور من لوحة التحكم."
            />
          </HubSectionShell>
        );
      }
      return (
        <HubSectionShell title={sectionCopy.analytics.title} description={sectionCopy.analytics.description} icon={sectionCopy.analytics.icon} onBack={() => updateSection('hub')}>
          <AnalyticsInsightsPanel storeName={resolvedStoreName} />
        </HubSectionShell>
      );
    }

    if (activeSection === 'wallet') {
      return (
        <WltDshPartnerBridge
          branchLabel={resolvedBranchLabel}
          activeZoneLabel={resolvedActiveZoneLabel}
          serviceModes={serviceModes}
          onBack={() => updateSection('hub')}
          onOpenExpandedWallet={onOpenWalletHub}
          onOpenSettlementReview={onOpenWalletHub}
          onOpenFinancialReport={onOpenWalletHub}
          dshAuthBearerToken={dshAuthBearerToken}
          dshClientId={dshClientId}
        />
      );
    }

    if (activeSection === 'settings') {
      const primaryNotificationRows = [
        {
          id: 'orders' as const,
          title: 'تنبيهات الطلبات',
          subtitle: 'الطلبات الجديدة، التأخير، وحالات الموافقة والإفراج.',
          icon: 'receipt-outline' as const,
          value: notificationPreferences.orders,
        },
        {
          id: 'operations' as const,
          title: 'تنبيهات التشغيل',
          subtitle: 'الفرع، الفريق، ساعات العمل، والتوصيات السريعة للورديات.',
          icon: 'people-outline' as const,
          value: notificationPreferences.operations,
        },
        {
          id: 'inventory' as const,
          title: 'تنبيهات المخزون',
          subtitle: 'النواقص، المنتجات منخفضة الكمية، وتغييرات الجاهزية.',
          icon: 'cube-outline' as const,
          value: notificationPreferences.inventory,
        },
        {
          id: 'finance' as const,
          title: wltDshPartnerUiCopy.financeNotificationTitle,
          subtitle: wltDshPartnerUiCopy.financeNotificationSubtitle,
          icon: 'wallet-outline' as const,
          value: notificationPreferences.finance,
        },
      ];

      const secondaryNotificationRows = [
        {
          id: 'marketing' as const,
          title: 'التسويق والنمو',
          subtitle: 'العروض والتوصيات الموسمية والفرص المقترحة للنمو.',
          icon: 'megaphone-outline' as const,
          value: notificationPreferences.marketing,
        },
        {
          id: 'system' as const,
          title: 'تنبيهات النظام',
          subtitle: 'الهوية، الإعدادات، وحالة الربط العام للحساب.',
          icon: 'shield-checkmark-outline' as const,
          value: notificationPreferences.system,
        },
        {
          id: 'sound' as const,
          title: 'الصوت والاهتزاز',
          subtitle: 'تفعيل التنبيه السمعي والاهتزازي عند وجود حدث مهم.',
          icon: 'volume-high-outline' as const,
          value: notificationPreferences.sound,
        },
        {
          id: 'dailyDigest' as const,
          title: 'ملخص يومي مختصر',
          subtitle: 'استلام ملخص يومي موحّد بدل فتح أكثر من شاشة منفصلة.',
          icon: 'calendar-outline' as const,
          value: notificationPreferences.dailyDigest,
        },
        {
          id: 'priorityOnly' as const,
          title: 'العاجلة فقط',
          subtitle: 'تقليل التشويش وإبراز الحالات ذات الأولوية العالية فقط.',
          icon: 'flash-outline' as const,
          value: notificationPreferences.priorityOnly,
        },
      ];

      const rowDirection = direction === 'rtl' ? 'row-reverse' : 'row';

      return (
        <HubSectionShell title={sectionCopy.settings.title} description={sectionCopy.settings.description} icon={sectionCopy.settings.icon} onBack={() => updateSection('hub')}>
          <Box gap={4}>
            {/* Appearance Section */}
            <Box padding={0} gap={0}>
              <View
                style={{
                  flexDirection: rowDirection,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing[4],
                  paddingVertical: 14,
                  backgroundColor: theme.surface,
                }}
              >
                <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: spacing[3], flexShrink: 1, minWidth: 0 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.surfaceInset,
                      borderWidth: 1,
                      borderColor: theme.line,
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="color-palette-outline" size={17} tone="muted" />
                  </View>
                  <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
                    <Text role="bodyStrong" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }} numberOfLines={1}>
                      المظهر
                    </Text>
                    <Text role="bodySm" tone="muted" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }} numberOfLines={1}>
                      فاتح أبيض أو داكن زجاجي
                  </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: rowDirection,
                    backgroundColor: theme.surfaceInset,
                    borderRadius: radius.sm,
                    padding: 3,
                    borderWidth: 1,
                    borderColor: theme.line,
                    gap: spacing[1],
                  }}
                >
                  <Pressable
                    onPress={() => setAppearanceMode('lightPremium')}
                    style={{
                      paddingHorizontal: spacing[3],
                      paddingVertical: 6,
                      borderRadius: 9,
                      backgroundColor: appearanceMode === 'lightPremium' ? theme.brand : 'transparent',
                    }}
                  >
                    <Text
                      role="bodyStrong"
                      style={{
                        fontSize: typography.caption.fontSize,
                        color: appearanceMode === 'lightPremium' ? theme.brandContrast : theme.text,
                      }}
                    >
                      فاتح
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setAppearanceMode('darkGlass')}
                    style={{
                      paddingHorizontal: spacing[3],
                      paddingVertical: 6,
                      borderRadius: 9,
                      backgroundColor: appearanceMode === 'darkGlass' ? theme.brand : 'transparent',
                    }}
                  >
                    <Text
                      role="bodyStrong"
                      style={{
                        fontSize: typography.caption.fontSize,
                        color: appearanceMode === 'darkGlass' ? theme.brandContrast : theme.text,
                      }}
                    >
                      داكن
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Box>

            <Divider />

            {/* Current Preferences */}
            <Box padding={0} gap={0}>
              <Text role="label" tone="muted" style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[2] }}>
                التفضيلات الحالية
              </Text>
              {([
                { label: 'مستوى التنبيه', value: notificationPreferences.priorityOnly ? 'العاجلة فقط' : 'كل التنبيهات', tone: notificationPreferences.priorityOnly ? 'warning' : 'success' },
                { label: 'الصوت والاهتزاز', value: notificationPreferences.sound ? 'مفعّل' : 'موقوف', tone: notificationPreferences.sound ? 'success' : 'warning' },
                { label: 'الملخص اليومي', value: notificationPreferences.dailyDigest ? 'مفعّل' : 'موقوف', tone: notificationPreferences.dailyDigest ? 'info' : 'default' },
                { label: 'الظهور في القائمة', value: listingEnabled ? 'مفعل' : 'موقوف', tone: listingEnabled ? 'success' : 'warning' },
                { label: 'حالة المتجر', value: storeOpen ? 'مفتوح الآن' : 'مغلق الآن', tone: storeOpen ? 'success' : 'warning' },
                { label: 'ساعات العمل', value: todayHoursLabel, tone: 'default' },
              ] as const).map((item, index, arr) => (
                <View
                  key={item.label}
                  style={{
                    flexDirection: rowDirection,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    backgroundColor: theme.surface,
                    borderBottomWidth: index === arr.length - 1 ? 0 : 1,
                    borderBottomColor: theme.line,
                  }}
                >
                  <Text role="body" style={{ color: theme.text }}>
                    {item.label}
                  </Text>
                  <Chip label={item.value} />
                </View>
              ))}
            </Box>

            <Divider />

            {/* Notification Preferences */}
            <Box padding={0} gap={0}>
              <Text role="label" tone="muted" style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[2] }}>
                إعدادات الإشعارات
              </Text>
              {primaryNotificationRows.map((item) => (
                <SettingsOptionRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  value={item.value}
                  onValueChange={(nextValue) => updateNotificationPreference(item.id, nextValue)}
                  compact={true}
                  last={false}
                />
              ))}

              <Pressable
                onPress={() => setShowAdvancedNotifications(!showAdvancedNotifications)}
                style={({ pressed }) => ({
                  flexDirection: rowDirection,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing[4],
                  paddingVertical: 10,
                  backgroundColor: pressed ? theme.surfaceInset : theme.surface,
                  borderBottomWidth: showAdvancedNotifications ? 1 : 0,
                  borderBottomColor: theme.line,
                })}
              >
                <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 }}>
                  <Icon name="options-outline" size={18} tone="muted" style={{ flexShrink: 0 }} />
                  <View style={{ flexShrink: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
                    <Text role="bodyStrong" style={{ color: theme.brand, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                      إعدادات متقدمة
                    </Text>
                    <Text role="bodySm" tone="muted" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                      إدارة إعدادات الصوت، الملخصات والتسويق
                    </Text>
                  </View>
                </View>
                <Icon name={showAdvancedNotifications ? "chevron-down-outline" : "chevron-forward-outline"} mirrored tone="muted" size={18} />
              </Pressable>

              {showAdvancedNotifications && secondaryNotificationRows.map((item, index, arr) => (
                <SettingsOptionRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  value={item.value}
                  onValueChange={(nextValue) => updateNotificationPreference(item.id, nextValue)}
                  compact={true}
                  last={index === arr.length - 1}
                />
              ))}
            </Box>

            <Divider />

            {/* Quick Access */}
            <Box padding={0} gap={0}>
              <Text role="label" tone="muted" style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[2] }}>
                الوصول السريع
              </Text>
              {[
                {
                  id: 'order-alerts',
                  title: 'فتح تنبيهات الطلب',
                  icon: 'notifications-outline' as const,
                  onPress: openOrderAlerts,
                },
                {
                  id: 'branch-scope',
                  title: 'اختيار الفرع',
                  icon: 'git-branch-outline' as const,
                  onPress: onOpenStoreScope,
                },
                {
                  id: 'operations-directory',
                  title: 'دليل العمليات',
                  icon: 'headset-outline' as const,
                  onPress: openOperationsDirectory,
                },
              ].map((item, index, arr) => (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  style={({ pressed }) => ({
                    flexDirection: rowDirection,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    backgroundColor: pressed ? theme.surfaceInset : theme.surface,
                    borderBottomWidth: index === arr.length - 1 ? 0 : 1,
                    borderBottomColor: theme.line,
                  })}
                >
                  <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 }}>
                    <Icon name={item.icon} size={18} tone="muted" style={{ flexShrink: 0 }} />
                    <Text role="bodyStrong" style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                      {item.title}
                    </Text>
                  </View>
                  <Icon name="chevron-forward-outline" mirrored tone="muted" size={18} />
                </Pressable>
              ))}
            </Box>

            {/* Safe area spacer for bottom navigation */}
            <View style={{ height: 140 }} />
          </Box>
        </HubSectionShell>
      );
    }

    if (activeSection === 'inventory') {
      return (
        <HubSectionShell title={sectionCopy.inventory.title} description={sectionCopy.inventory.description} icon={sectionCopy.inventory.icon} onBack={() => updateSection('hub')}>
          <InventoryCatalogScreen
            storeName={resolvedStoreName}
            branchLabel={resolvedBranchLabel}
            activeZoneLabel={resolvedActiveZoneLabel}
            todayHoursLabel={resolvedTodayHoursLabel}
            {...(activeCanonicalStore?.id !== undefined ? { canonicalStoreId: activeCanonicalStore.id } : {})}
          />
        </HubSectionShell>
      );
    }

    if (activeSection === 'operations') {
      return (
        <OperationsPanel
          branchLabel={resolvedBranchLabel}
          cityLabel={resolvedCityLabel}
          storeName={resolvedStoreName}
          todayHoursLabel={resolvedTodayHoursLabel}
          storeOpen={isAvailable}
          activeZoneLabel={resolvedActiveZoneLabel}
          serviceModes={serviceModes}
          onBack={() => updateSection('hub')}
          {...(onOpenStoreCourierSetup !== undefined ? { onOpenStoreCourierSetup } : {})}
          listingEnabled={listingEnabled}
          storeVisibility={storeVisibility}
          visibilityLabel={visibilityLabel}
        />
      );
    }

    const copy = sectionCopy[activeSection as Exclude<PartnerHubSection, 'hub'>];

    return (
      <HubSectionShell
        title={copy.title}
        description={copy.description}
        icon={copy.icon}
        onBack={() => updateSection('hub')}
      />
    );
  }

  return (
    <Box style={{ flex: 1, position: 'relative' }} background="background">
      <MobileScrollView fill padding={0} gap={4} contentContainerStyle={{ paddingBottom: partnerHubBottomInset }}>
        {/* Store header — inline replacement for StoreHero (not in new-repo ui-kit) */}
        <Box
          padding={4}
          gap={3}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: theme.line,
            backgroundColor: theme.surface,
          }}
        >
          <View
            style={{
              flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: spacing[3],
                flex: 1,
                minWidth: 0,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.md,
                  backgroundColor: theme.brandSurface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.brand + '33',
                  flexShrink: 0,
                }}
              >
                <Icon name="storefront-outline" size={24} tone="brand" />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
                <Text role="bodyStrong" numberOfLines={1} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                  {resolvedStoreName}
                </Text>
                <Text role="bodySm" tone="muted" numberOfLines={1} style={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                  {resolvedBranchLabel} · {resolvedActiveZoneLabel}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing[2] }}>
              <Badge label={isAvailable ? 'مفتوح' : 'مغلق'} tone={isAvailable ? 'success' : 'warning'} />
              <Pressable
                onPress={onOpenStoreScope}
                accessibilityRole="button"
                accessibilityLabel="اختيار الفرع"
                style={{ padding: spacing[2], borderRadius: radius.md }}
              >
                <Icon name="git-branch-outline" size={18} tone="muted" />
              </Pressable>
            </View>
          </View>
          {/* Service mode chips — readonly display */}
          <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {defaultOperationalModes.map((mode) => (
              <Pressable
                key={mode.id}
                onPress={() => setSelectedModeId(mode.id)}
                style={({ pressed }: { pressed: boolean }) => ({
                  flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: spacing[3],
                  paddingVertical: 6,
                  borderRadius: radius.round,
                  borderWidth: 1,
                  borderColor: selectedModeId === mode.id ? theme.brand : theme.line,
                  backgroundColor: selectedModeId === mode.id ? theme.brandSurface : pressed ? theme.surfaceInset : theme.surface,
                })}
              >
                <Icon
                  name={mode.id === 'pickup' ? 'hand-left-outline' : mode.id === 'partner_delivery' ? 'car-outline' : 'bicycle-outline'}
                  size={14}
                  tone={selectedModeId === mode.id ? 'brand' : 'muted'}
                />
                <Text
                  role="caption"
                  style={{ color: selectedModeId === mode.id ? theme.brand : theme.text }}
                >
                  {mode.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </Box>

        <Box padding={4} gap={4}>
          {isInternalActiveOnly ? (
            <Surface
              style={{
                padding: spacing[3],
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: theme.warning,
              }}
            >
              <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing[2] }}>
                <Icon name="eye-off-outline" size={18} tone="warning" />
                <Text role="bodyStrong" tone="warning" style={{ flex: 1, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                  الشريك نشط داخليًا، المتجر غير ظاهر للعملاء حتى اكتمال بوابات النشر
                </Text>
              </View>
            </Surface>
          ) : null}
          {/* 1) Wallet Balance Block */}
          <Box gap={2} paddingY={2}>
            <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2, alignItems: direction === 'rtl' ? 'flex-end' : 'flex-start' }}>
                <Text role="caption" tone="muted">رصيد المتجر الحالي</Text>
                <Text role="titleLg" tone="action">{walletBalanceLabel ?? '—'}</Text>
              </View>
              <Button
                label="عرض المحفظة"
                tone="secondary"
                fullWidth={false}
                onPress={() => updateSection('wallet')}
              />
            </View>
          </Box>

          <Divider />
          {/* 4) Main Sections Nav — icon + title + subtitle + chevron, RTL-correct */}
          <View style={{ gap: spacing[2] }}>
            {activeHubNavigationItems.map((item) => (
              <HubNavRow
                key={item.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onPress={() => updateSection(item.section)}
              />
            ))}
          </View>
        </Box>
      </MobileScrollView>
    </Box>
  );
}

export type PartnerHomeScreenProps = Omit<DshPartnerHubSurfaceProps, 'section'>;

export function PartnerHomeScreen(props: PartnerHomeScreenProps) {
  return <DshPartnerHubSurface {...props} section="hub" />;
}

export type OperationsScreenProps = Omit<DshPartnerHubSurfaceProps, 'section'>;

export function OperationsScreen(props: OperationsScreenProps) {
  return <DshPartnerHubSurface {...props} section="operations" />;
}

export type PartnerSettingsScreenProps = Omit<DshPartnerHubSurfaceProps, 'section'>;

export function PartnerSettingsScreen(props: PartnerSettingsScreenProps) {
  return <DshPartnerHubSurface {...props} section="settings" />;
}
