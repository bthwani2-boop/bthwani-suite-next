import React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Surface,
  Tabs,
  Text,
  TextField,
  useTheme,
  spacing,
} from '@bthwani/ui-kit';
import type { PartnerOfferRecord, PartnerOfferStatus, PartnerOfferType } from '../../shared/partner/dsh-partner-offer-types';
import {
  getPartnerOfferVisibilityRecord,
} from '../../shared/partner/marketing.visibility';
import { getDshControlPanelGovernanceEntry } from '../../shared/runtime/dsh-control-panel-governance.map';

type AnalyticsWorkspaceState = 'ready' | 'loading' | 'empty' | 'error' | 'offline' | 'no-analytics' | 'no-campaigns';
type PromotionsTab = 'active' | 'pending' | 'rejected' | 'new';

export type PromotionsScreenProps = {
  storeName: string;
  branchLabel: string;
  activeZoneLabel: string;
  todayHoursLabel: string;
  state?: AnalyticsWorkspaceState;
};

type IntakeFormState = {
  title: string;
  offerType: PartnerOfferType;
  valueLabel: string;
  eligibility: string;
};

const INITIAL_FORM: IntakeFormState = {
  title: '',
  offerType: 'discount',
  valueLabel: '',
  eligibility: 'الكل',
};

function buildPartnerStoreId(storeName: string) {
  return storeName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '') || 'partner-store';
}

function translateStatus(status: PartnerOfferStatus): { label: string; tone: 'neutral' | 'warning' | 'action' | 'success' | 'danger' } {
  switch (status) {
    case 'inbound': return { label: 'في الانتظار', tone: 'neutral' };
    case 'review': return { label: 'قيد المراجعة', tone: 'warning' };
    case 'marketing-ready': return { label: 'جاهز للتسويق', tone: 'action' };
    case 'published': return { label: 'نشط', tone: 'success' };
    case 'paused': return { label: 'موقوف', tone: 'warning' };
    case 'rejected': return { label: 'مرفوض', tone: 'danger' };
    case 'archived': return { label: 'مؤرشف', tone: 'neutral' };
    default: return { label: status, tone: 'neutral' };
  }
}

function translateOfferType(type: PartnerOfferType): string {
  switch (type) {
    case 'discount': return 'خصم مباشر';
    case 'free-delivery': return 'توصيل مجاني';
    case 'bundle': return 'حزمة';
    case 'buy-x-get-y': return 'اشتر واحصل على';
    case 'coupon': return 'كوبون';
    default: return type;
  }
}

function renderState(state: Exclude<AnalyticsWorkspaceState, 'ready'>) {
  if (state === 'loading') {
    return <Text role="bodySm" tone="muted">جارٍ تجهيز العروض الحالية.</Text>;
  }
  if (state === 'empty') {
    return <Text role="bodySm" tone="muted">لا توجد عروض بعد، ويمكنك تقديم أول اقتراح الآن.</Text>;
  }
  if (state === 'offline') {
    return <Text role="bodySm" tone="muted">الشاشة غير متصلة الآن. أعد المحاولة لاحقًا.</Text>;
  }
  return <Text role="bodySm" tone="muted">تعذر تحميل مسار العروض حاليًا.</Text>;
}

function PromotionRow({
  offer,
  visibilityNote,
  showDivider = false,
  actionLabel,
  onActionPress,
}: {
  offer: PartnerOfferRecord;
  visibilityNote?: string;
  showDivider?: boolean;
  actionLabel: string;
  onActionPress: (offer: PartnerOfferRecord) => void;
}) {
  const { theme } = useTheme();
  const statusDisplay = translateStatus(offer.status);
  const metaLabel = offer.activeFromDate && offer.activeToDate
    ? `${offer.activeFromDate} → ${offer.activeToDate}`
    : visibilityNote || offer.rejectionReason || offer.eligibility;

  return (
    <Box
      style={{
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: theme.line,
        paddingTop: showDivider ? 12 : 0,
        marginTop: showDivider ? 12 : 0,
      }}
    >
      <Box layoutDirection="row" align="flex-start" justify="space-between" style={{ gap: spacing[3] }}>
        <Box gap={1} style={{ flex: 1, alignItems: 'flex-end' }}>
          <Box layoutDirection="row" style={{ gap: spacing[2], flexWrap: 'wrap', justifyContent: 'flex-start', width: '100%' }}>
            <Badge label={statusDisplay.label} tone={statusDisplay.tone} />
            <Text role="bodyStrong" numberOfLines={1} style={{ textAlign: 'right' }}>
              {offer.title}
            </Text>
          </Box>
          <Text role="bodySm" tone="muted" numberOfLines={2} style={{ textAlign: 'right', width: '100%' }}>
            {translateOfferType(offer.offerType)} • {offer.valueLabel}
          </Text>
          <Text role="caption" tone="muted" numberOfLines={2} style={{ textAlign: 'right', width: '100%' }}>
            {metaLabel}
          </Text>
        </Box>
        <Button
          label={actionLabel}
          tone="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => onActionPress(offer)}
        />
      </Box>
    </Box>
  );
}

export function PromotionsScreen({
  storeName,
  branchLabel,
  activeZoneLabel,
  todayHoursLabel,
  state = 'ready',
}: PromotionsScreenProps) {
  const { theme } = useTheme();
  const marketingGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('marketing'), []);
  const catalogsGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('catalogs'), []);
  const partnersGovernance = React.useMemo(() => getDshControlPanelGovernanceEntry('partners'), []);
  const [offers, setOffers] = React.useState<PartnerOfferRecord[]>([]);
  const [activeTab, setActiveTab] = React.useState<PromotionsTab>('active');
  const [form, setForm] = React.useState<IntakeFormState>(INITIAL_FORM);
  const [statusMessage, setStatusMessage] = React.useState('');


  if (state !== 'ready') {
    return renderState(state);
  }

  const offerRows = offers.map((offer) => {
    const visibility = getPartnerOfferVisibilityRecord(offer, { targetSurface: 'partner-promotions' });
    const clientReady = !visibility.blockedReason && offer.status === 'published';

    return {
      offer,
      visibility,
      clientReady,
    };
  });

  const activeOffers = offerRows.filter((row) => row.clientReady);
  const pendingOffers = offerRows.filter((row) => !row.clientReady && row.offer.status !== 'rejected' && row.offer.status !== 'archived');
  const rejectedOffers = offerRows.filter((row) => row.offer.status === 'rejected');

  const handleSubmitOffer = () => {
    if (!form.title.trim() || !form.valueLabel.trim()) {
      setStatusMessage('املأ عنوان العرض وقيمته قبل الإرسال.');
      return;
    }

    const newOffer: PartnerOfferRecord = {
      id: `offer-${Date.now()}`,
      title: form.title.trim(),
      partnerName: storeName,
      storeLabel: storeName,
      storeId: buildPartnerStoreId(storeName),
      productId: '',
      productLabel: '',
      category: '',
      offerType: form.offerType,
      status: 'inbound',
      source: 'partner',
      valueLabel: form.valueLabel.trim(),
      eligibility: form.eligibility.trim() || 'الكل',
      displayBadge: form.valueLabel.trim(),
    };
    setOffers((prev) => [...prev, newOffer]);
    setForm(INITIAL_FORM);
    setActiveTab('pending');
    setStatusMessage('تم إرسال العرض للمراجعة التسويقية.');
  };

  const openOfferForm = (offer?: PartnerOfferRecord) => {
    if (offer) {
      setForm({
        title: offer.title,
        offerType: offer.offerType,
        valueLabel: offer.valueLabel,
        eligibility: offer.eligibility,
      });
    }
    setActiveTab('new');
  };

  const renderPanelContent = () => {
    if (activeTab === 'active') {
      return (
        <>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            العروض النشطة هنا هي فقط ما اجتاز النشر وبوابات الشريك والكتالوج على سطح العميل.
          </Text>
          {activeOffers.length > 0 ? (
            activeOffers.map(({ offer, visibility }, index) => (
              <PromotionRow
                key={offer.id}
                offer={offer}
                visibilityNote={visibility.blockedReason}
                showDivider={index > 0}
                actionLabel="عرض"
                onActionPress={() => setStatusMessage(`العرض النشط المحدد: ${offer.title}`)}
              />
            ))
          ) : (
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
              لا توجد عروض نشطة حاليًا.
            </Text>
          )}
        </>
      );
    }

    if (activeTab === 'pending') {
      return (
        <>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            هذه القائمة تشمل ما ينتظر الاعتماد، وما نُشر شكلياً لكنه ما زال محجوباً عن العميل بسبب بوابة الشريك أو نشر المنتج.
          </Text>
          {pendingOffers.length > 0 ? (
            pendingOffers.map(({ offer, visibility }, index) => (
              <PromotionRow
                key={offer.id}
                offer={offer}
                visibilityNote={visibility.blockedReason}
                showDivider={index > 0}
                actionLabel="متابعة"
                onActionPress={() => setStatusMessage(visibility.blockedReason ? `العرض ${offer.title} محجوب عن العميل: ${visibility.blockedReason}` : `العرض ${offer.title} ما زال داخل مسار المراجعة.`)}
              />
            ))
          ) : (
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
              لا توجد عروض تحت المراجعة الآن.
            </Text>
          )}
        </>
      );
    }

    if (activeTab === 'rejected') {
      return (
        <>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            راجع سبب الرفض ثم افتح النموذج لإعادة التقديم بصياغة أو قيمة أوضح.
          </Text>
          {rejectedOffers.length > 0 ? (
            rejectedOffers.map(({ offer, visibility }, index) => (
              <PromotionRow
                key={offer.id}
                offer={offer}
                visibilityNote={visibility.blockedReason}
                showDivider={index > 0}
                actionLabel="إعادة"
                onActionPress={() => {
                  setStatusMessage(`تم تجهيز ${offer.title} لإعادة التقديم.`);
                  openOfferForm(offer);
                }}
              />
            ))
          ) : (
            <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
              لا توجد عروض مرفوضة حاليًا.
            </Text>
          )}
        </>
      );
    }

    return (
      <Box gap={3}>
        <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
          اقترح عرضًا واحدًا واضحًا بقيمة وأهلية محددتين، ثم دعه يمر عبر المراجعة بدل تكديس حملات كثيرة.
        </Text>
        <TextField
          label="عنوان العرض"
          value={form.title}
          onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
          placeholder="مثال: خصم 20% على القهوة"
        />
        <TextField
          label="نوع العرض"
          value={translateOfferType(form.offerType)}
          onChangeText={() => {}}
          hint="اختر: discount · free-delivery · bundle · buy-x-get-y · coupon"
          editable={false}
        />
        <TextField
          label="قيمة العرض"
          value={form.valueLabel}
          onChangeText={(value) => setForm((current) => ({ ...current, valueLabel: value }))}
          placeholder="مثال: 20% أو توصيل مجاني"
        />
        <TextField
          label="شروط الأهلية"
          value={form.eligibility}
          onChangeText={(value) => setForm((current) => ({ ...current, eligibility: value }))}
          placeholder="مثال: للطلبات فوق 50 ريال"
        />
        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
          <Button label="إرسال للمراجعة" tone="brand" fullWidth={false} onPress={handleSubmitOffer} />
          <Button
            label="إلغاء"
            tone="ghost"
            fullWidth={false}
            onPress={() => {
              setForm(INITIAL_FORM);
              setActiveTab('active');
            }}
          />
        </Box>
      </Box>
    );
  };

  return (
    <Box gap={3}>
      <Surface
        tone="raised"
        padding={3}
        gap={3}
        border={false}
        style={{
          borderRadius: 22,
        }}
      >
        <Box gap={1} style={{ alignItems: 'flex-end' }}>
          <Text role="titleSm" style={{ textAlign: 'right' }}>
            العروض المقترحة
          </Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            {storeName} • {branchLabel} • {activeZoneLabel} • {todayHoursLabel}
          </Text>
        </Box>

        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
          <Box padding={3} background="surfaceInset" radiusToken="lg" border borderTone="line" style={{ flexGrow: 1, minWidth: 88 }}>
            <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>نشطة</Text>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>{String(activeOffers.length)}</Text>
          </Box>
          <Box padding={3} background="surfaceInset" radiusToken="lg" border borderTone="line" style={{ flexGrow: 1, minWidth: 88 }}>
            <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>قيد المراجعة</Text>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>{String(pendingOffers.length)}</Text>
          </Box>
          <Box padding={3} background="surfaceInset" radiusToken="lg" border borderTone="line" style={{ flexGrow: 1, minWidth: 88 }}>
            <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>مرفوضة</Text>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>{String(rejectedOffers.length)}</Text>
          </Box>
        </Box>

        <Button
          label="اقتراح عرض جديد"
          tone="brand"
          size="sm"
          fullWidth={false}
          onPress={() => openOfferForm()}
        />
      </Surface>

      <Surface tone="inset" padding={3} gap={2}>
        <Text role="bodyStrong" style={{ textAlign: 'right' }}>
          ملكية العروض
        </Text>
        <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
          {marketingGovernance?.sectionLabel ?? 'Marketing'} يملك اعتماد ونشر العروض. هذا السطح يرسل intent فقط، بينما أهلية الشريك تبقى عند {partnersGovernance?.sectionLabel ?? 'Partners'}، وأي نشر أو تعارض مع الكتالوج يراجع عبر {catalogsGovernance?.sectionLabel ?? 'Catalogs'}.
        </Text>
        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
          لا نعتبر العرض "نشطًا" للعميل إلا إذا كان مرتبطًا بمتجر مؤهل، ومع أي product-linked offer يجب أن يكون المنتج نفسه منشورًا للعملاء.
        </Text>
      </Surface>

      <Tabs<PromotionsTab>
        items={[
          { value: 'active', label: 'النشطة' },
          { value: 'pending', label: 'قيد المراجعة' },
          { value: 'rejected', label: 'المرفوضة' },
          { value: 'new', label: 'اقتراح جديد' },
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
        variant="pill"
        scrollable
      />

      {statusMessage ? (
        <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
          {statusMessage}
        </Text>
      ) : null}

      <Surface
        tone="raised"
        padding={3}
        gap={3}
        border={false}
        style={{
          borderRadius: 22,
        }}
      >
        <Box gap={1} style={{ alignItems: 'flex-end' }}>
          <Text role="titleSm" style={{ textAlign: 'right' }}>
            {activeTab === 'active'
              ? 'العروض النشطة'
              : activeTab === 'pending'
                ? 'قائمة المراجعة'
                : activeTab === 'rejected'
                  ? 'العروض المرفوضة'
                  : 'نموذج الاقتراح'}
          </Text>
          <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
            {activeTab === 'new'
              ? 'ارسل اقتراحًا واحدًا واضحًا بدلاً من نموذج طويل متعدد الحقول.'
              : 'اعرض قسمًا واحدًا في كل مرة لتقليل الضجيج أثناء المتابعة.'}
          </Text>
        </Box>
        <Divider />
        {renderPanelContent()}
      </Surface>
    </Box>
  );
}

export default PromotionsScreen;
