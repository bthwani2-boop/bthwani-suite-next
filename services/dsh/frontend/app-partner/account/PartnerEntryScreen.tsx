import React from 'react';
import {
  Box,
  Button,
  Card,
  Icon,
  MobileScrollView,
  StateView,
  Surface,
  Text,
  TopBar,
} from '@bthwani/ui-kit';

export type DshPartnerEntryScreenState = 'ready' | 'loading' | 'empty';

type DshEntryScreenState = DshPartnerEntryScreenState;

export type PartnerEntryScreenProps = {
  state?: DshPartnerEntryScreenState;
  // ML-017: partner store availability toggle — signals ops and dispatch whether store accepts orders
  isStoreAvailable?: boolean;
  onToggleStoreAvailability?: (available: boolean) => void;
  onOpenOrdersBoardPress?: () => void;
  onOpenOrderDetailPress?: () => void;
  onOpenMaintenancePress?: () => void;
  onOpenIssueQueuePress?: () => void;
};

type DshEntryScreenProps = PartnerEntryScreenProps;

function renderHero(state: DshPartnerEntryScreenState, onOpenOrdersBoardPress?: () => void) {
  if (state === 'loading') {
    return <StateView title="جاري التحميل..." loading />;
  }

  if (state === 'empty') {
    return (
      <StateView
        title="لا توجد طلبات بانتظار الفرع"
        description="أبقِ مدخل لوحة الطلبات ظاهرًا حتى يتمكن مشغل الفرع من استئناف الفرز فور وصول أي طلب جديد."
        actionLabel="فتح لوحة الطلبات"
        onActionPress={onOpenOrdersBoardPress}
      />
    );
  }

  return (
    <Card
      title="مدخل تشغيل الفرع"
      subtitle="نقطة بداية واحدة لفرز الطلبات، تجهيزها، متابعة الصيانة، واحتواء الاستثناءات داخل app-partner فقط."
      footer={<Button label="فتح لوحة الطلبات" onPress={onOpenOrdersBoardPress} />}
    />
  );
}

function renderOrdersSection(
  onOpenOrdersBoardPress?: () => void,
  onOpenOrderDetailPress?: () => void,
) {
  return (
    <Box gap={3}>
      <Card
        title="مراجعة صف الطلبات"
        subtitle="ابدأ من لوحة الطلبات حتى يظل قرار الفرع التالي واضحًا خلال ثوانٍ."
        footer={<Button label="عرض لوحة الطلبات" tone="secondary" onPress={onOpenOrdersBoardPress} />}
      />
      <Card
        title="فتح مسار تجهيز الطلب"
        subtitle="التجهيز، الجاهزية، والتسليم للكابتن تبقى مجمعة في مسار طلب واحد."
        footer={<Button label="فتح تفاصيل الطلب" tone="ghost" onPress={onOpenOrderDetailPress} />}
      />
    </Box>
  );
}

function renderSupportSection(
  onOpenMaintenancePress?: () => void,
  onOpenIssueQueuePress?: () => void,
) {
  return (
    <Box gap={3}>
      <Card
        title="مساحة صيانة الفرع"
        subtitle="التوفر وصيانة الفرع يظلان متاحين من دون إزاحة خط الطلبات الرئيسي."
        footer={<Button label="فتح الصيانة" tone="secondary" onPress={onOpenMaintenancePress} />}
      />
      <Card
        title="صف استثناءات الطلبات"
        subtitle="المشكلات والتصعيدات تبقى ظاهرة كصف مرافق محتوى داخل الفرع نفسه."
        footer={<Button label="فتح صف الاستثناءات" tone="ghost" onPress={onOpenIssueQueuePress} />}
      />
    </Box>
  );
}

export function PartnerEntryScreen({
  state = 'ready',
  isStoreAvailable = false,
  onToggleStoreAvailability,
  onOpenOrdersBoardPress,
  onOpenOrderDetailPress,
  onOpenMaintenancePress,
  onOpenIssueQueuePress,
}: PartnerEntryScreenProps) {
  const backAction = onOpenOrdersBoardPress;

  return (
    <MobileScrollView fill padding={4} gap={4} contentContainerStyle={{ paddingBottom: 112 }}>
      <TopBar
        variant="secondary"
        title="مدخل الشريك"
        style={{ marginHorizontal: -16, marginTop: -16 }}
      />

      {renderHero(state, onOpenOrdersBoardPress)}

      {state === 'ready' ? (
        <>
          <Surface tone={isStoreAvailable ? 'success' : 'raised'} padding={3} gap={2}>
            <Text role="titleSm">{isStoreAvailable ? 'المتجر مفتوح ويستقبل الطلبات' : 'المتجر مغلق حالياً'}</Text>
            <Button
              label={isStoreAvailable ? 'إغلاق المتجر مؤقتاً' : 'فتح المتجر لاستقبال الطلبات'}
              tone={isStoreAvailable ? 'danger' : 'primary'}
              onPress={() => onToggleStoreAvailability?.(!isStoreAvailable)}
            />
          </Surface>
          <Surface tone="raised" padding={3} gap={2}>
            <Text role="label" tone="muted">
              نطاق السطح
            </Text>
            <Text role="bodySm" tone="muted">
              هذا المدخل مملوك للفرع الحالي فقط: الطلبات، التجهيز، الصيانة، والاستثناءات. لا يعرض تحليلات عامة أو خريطة تشغيلية خارج تطبيق الشريك.
            </Text>
          </Surface>

          <Surface tone="raised" padding={3} gap={3}>
            <Text role="label" tone="muted">
              الطلبات ومسار التنفيذ
            </Text>
            <Text role="bodySm" tone="muted">
              مدخل لوحة الطلبات وتسلسل تجهيز الفرع والتسليم للكابتن.
            </Text>
            {renderOrdersSection(onOpenOrdersBoardPress, onOpenOrderDetailPress)}
          </Surface>

          <Surface tone="raised" padding={3} gap={3}>
            <Text role="label" tone="muted">
              الصيانة والاستثناءات
            </Text>
            <Text role="bodySm" tone="muted">
              الصيانة وصف المشكلات يبقيان مرافقين للطلبات بدل أن يتحولا إلى واجهة عامة منفصلة.
            </Text>
            {renderSupportSection(onOpenMaintenancePress, onOpenIssueQueuePress)}
          </Surface>
        </>
      ) : (
        <Surface tone="raised" padding={3} gap={2}>
          <Text role="body" tone="muted">
            حالة المدخل نشطة. لا يتم تنفيذ منطق أعمال أو طلبات شبكة هنا.
          </Text>
        </Surface>
      )}
    </MobileScrollView>
  );
}

export { PartnerEntryScreen as DshEntryScreen };

// export default PartnerEntryScreen; // Unused default export