// Authority: services/dsh/frontend/app-client — preferences sub-screen.
// Sovereign shared: services/dsh/frontend/shared
// Notification config: surfaced via usePlatformNotificationConfigController (future binding).

import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  ActionStrip,
  Box,
  Button,
  Divider,
  Icon,
  MobileScrollView,
  Surface,
  Switch,
  Text,
  TextField,
  TopBar,
  colorPalette,
  radius,
  safeArea,
  spacing,
  useTheme,
} from '@bthwani/ui-kit';

export type PreferencesHubScreenProps = {
  onBack?: () => void;
};

type PrefsSection = 'delivery' | 'notifications' | 'privacy';

export function PreferencesHubScreen({ onBack }: PreferencesHubScreenProps) {
  const { theme } = useTheme();

  const [expanded, setExpanded] = React.useState<PrefsSection | null>('delivery');

  // Delivery
  const [deliveryInstructions, setDeliveryInstructions] = React.useState(
    'اتصل قبل الوصول بدقيقتين واترك الطلب عند الباب عند عدم الرد.',
  );

  // Notifications
  const [orderAlerts, setOrderAlerts]   = React.useState(true);
  const [arrivalBell, setArrivalBell]   = React.useState(true);
  const [promoAlerts, setPromoAlerts]   = React.useState(true);
  const [systemAlerts, setSystemAlerts] = React.useState(false);

  // Privacy & experience
  const [quickOrder, setQuickOrder]           = React.useState(true);
  const [autoSaveAddr, setAutoSaveAddr]       = React.useState(true);
  const [highPrivacy, setHighPrivacy]         = React.useState(false);
  const [accessMode, setAccessMode]           = React.useState(false);

  const [statusMsg, setStatusMsg]   = React.useState('');
  const [statusTone, setStatusTone] = React.useState<'success' | 'danger'>('success');

  const toggle = (s: PrefsSection) => setExpanded((prev) => (prev === s ? null : s));

  const quickSuggestions = [
    'اترك الطلب عند الباب دون طرق.',
    'اتصل قبل الوصول بخمس دقائق.',
    'سلم الطلب يدوياً للمستلم فقط.',
  ];

  const flash = (msg: string, tone: 'success' | 'danger') => {
    setStatusMsg(msg);
    setStatusTone(tone);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSave = () => flash('تم حفظ جميع التفضيلات بنجاح!', 'success');

  const handleReset = () => {
    setDeliveryInstructions('اتصل قبل الوصول بدقيقتين واترك الطلب عند الباب عند عدم الرد.');
    setOrderAlerts(true); setArrivalBell(true); setPromoAlerts(true); setSystemAlerts(false);
    setQuickOrder(true); setAutoSaveAddr(true); setHighPrivacy(false); setAccessMode(false);
    flash('تم إعادة التفضيلات إلى القيم الافتراضية.', 'success');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar
        variant="surface"
        title="تفضيلات التوصيل"
        actions={
          onBack
            ? [{ id: 'back', icon: <Icon name="chevron-back" mirrored size={18} />, accessibilityLabel: 'العودة', onPress: onBack }]
            : []
        }
      />

      <MobileScrollView
        fill
        padding={4}
        gap={4}
        contentContainerStyle={{ paddingBottom: safeArea.comfortable + spacing[12] }}
      >
        {/* Status banner */}
        {statusMsg ? (
          <Surface
            tone="raised"
            padding={3}
            style={{
              backgroundColor: statusTone === 'success' ? colorPalette.successSoft : colorPalette.dangerSoft,
              borderColor: statusTone === 'success' ? colorPalette.successSoft : colorPalette.dangerSoft,
              borderWidth: 1,
              borderRadius: radius.sm2,
            }}
          >
            <Box align="center" gap={2} style={{ flexDirection: 'row-reverse' }}>
              <Icon
                name={statusTone === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={statusTone === 'success' ? colorPalette.success : colorPalette.danger}
              />
              <Text
                role="bodySm"
                weight="bold"
                style={{
                  color: statusTone === 'success' ? colorPalette.successStrong : colorPalette.dangerStrong,
                  flex: 1,
                  textAlign: 'right',
                }}
              >
                {statusMsg}
              </Text>
            </Box>
          </Surface>
        ) : null}

        {/* Section list */}
        <View style={{ paddingTop: spacing[2] }}>
          <Text role="bodyStrong" tone="muted" style={{ textAlign: 'right', paddingHorizontal: spacing[4], marginBottom: spacing[2] }}>
            خيارات التفضيلات
          </Text>

          <Divider />

          {/* 1. Delivery */}
          <ActionStrip
            icon="car"
            title="تعليمات الكابتن والتسليم"
            subtitle={deliveryInstructions.length > 40 ? deliveryInstructions.substring(0, 40) + '...' : deliveryInstructions}
            expanded={expanded === 'delivery'}
            onPress={() => toggle('delivery')}
            hideDivider
          >
            <Box gap={3} style={{ paddingTop: spacing[2] }}>
              <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
                ملاحظات تظهر للكابتن لمساعدته في التوصيل.
              </Text>
              <TextField
                value={deliveryInstructions}
                onChangeText={setDeliveryInstructions}
                placeholder="أدخل تعليمات التوصيل..."
                multiline
                numberOfLines={3}
                style={{ textAlign: 'right', color: theme.text, minHeight: 80 }}
              />
              <Box gap={2} style={{ marginTop: spacing[1], flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
                {quickSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setDeliveryInstructions(s)}
                    style={{ paddingVertical: 6, paddingHorizontal: spacing[3], backgroundColor: theme.fieldBackground, borderRadius: radius.lg2, borderWidth: 1, borderColor: theme.line }}
                  >
                    <Text role="bodySm" style={{ color: theme.text }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </Box>
            </Box>
          </ActionStrip>

          <Divider />

          {/* 2. Notifications */}
          <ActionStrip
            icon="notifications"
            title="إعدادات التنبيهات"
            subtitle="إشعارات حالة الطلب، جرس الوصول، والعروض"
            expanded={expanded === 'notifications'}
            onPress={() => toggle('notifications')}
            hideDivider
          >
            <Box gap={4} style={{ paddingTop: spacing[2] }}>
              <Switch label="إشعارات حالة الطلب المباشرة" description="تحديثات فورية عند قبول الطلب وخروج الكابتن." value={orderAlerts} onValueChange={setOrderAlerts} />
              <Divider />
              <Switch label="تفعيل جرس الوصول الذكي" description="تنبيه بصوت مميز عند اقتراب الكابتن." value={arrivalBell} onValueChange={setArrivalBell} />
              <Divider />
              <Switch label="العروض والتخفيضات الحصرية" description="تنبيهات لأقوى التخفيضات وكوبونات التوصيل المجاني." value={promoAlerts} onValueChange={setPromoAlerts} />
              <Divider />
              <Switch label="تنبيهات النظام الأساسية" description="إشعارات الأمان والتحديثات الهامة." value={systemAlerts} onValueChange={setSystemAlerts} />
            </Box>
          </ActionStrip>

          <Divider />

          {/* 3. Privacy */}
          <ActionStrip
            icon="lock-closed"
            title="الخصوصية وتسهيلات التجربة"
            subtitle="الطلب السريع، حفظ العناوين، ووضع الخصوصية"
            expanded={expanded === 'privacy'}
            onPress={() => toggle('privacy')}
            hideDivider
          >
            <Box gap={4} style={{ paddingTop: spacing[2] }}>
              <Switch label="الطلب السريع بلمسة واحدة" description="إتمام الطلب باستخدام عنوانك وطريقة الدفع الافتراضية." value={quickOrder} onValueChange={setQuickOrder} />
              <Divider />
              <Switch label="حفظ المواقع والعناوين تلقائياً" description="حفظ العناوين الجديدة تلقائياً لاستخدامها مستقبلاً." value={autoSaveAddr} onValueChange={setAutoSaveAddr} />
              <Divider />
              <Switch label="تفعيل وضع الخصوصية العالي" description="حظر رؤية اسمك الكامل أو رقمك الفعلي للكابتن." value={highPrivacy} onValueChange={setHighPrivacy} />
              <Divider />
              <Switch label="تسهيلات الوصول وقراءة الشاشة" description="تكبير الخطوط وزيادة التباين وتوافق قارئ الشاشة." value={accessMode} onValueChange={setAccessMode} />
            </Box>
          </ActionStrip>

          <Divider />
        </View>

        {/* Actions */}
        <Box gap={2} style={{ marginTop: spacing[4] }}>
          <Button label="حفظ كل التفضيلات والتغييرات" tone="brand" onPress={handleSave} style={{ width: '100%' }} />
          <Button label="إعادة تعيين إلى الافتراضي" tone="ghost" onPress={handleReset} style={{ width: '100%' }} />
        </Box>
      </MobileScrollView>
    </View>
  );
}

export default PreferencesHubScreen;
