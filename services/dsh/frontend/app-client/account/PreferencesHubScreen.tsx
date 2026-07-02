// Authority: services/dsh/frontend/app-client — preferences sub-screen.
// Sovereign shared: services/dsh/frontend/shared

import React from 'react';
import { ScrollView, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Button,
  Text,
  colorRoles,
  radius,
  spacing,
} from '@bthwani/ui-kit';

export type PreferencesHubScreenProps = {
  onBack?: () => void;
};

type PrefsSection = 'delivery' | 'notifications' | 'privacy';

// SVG Icons
function BackIcon({ color = colorRoles.textPrimary }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 19l-7-7 7-7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CarIcon({ color = colorRoles.brandAction }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2m13-7H9v3h11v-3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="7.5" cy="17.5" r="2.5" stroke={color} strokeWidth={2} />
      <Circle cx="16.5" cy="17.5" r="2.5" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function BellIcon({ color = colorRoles.brandAction }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// LockIcon color default has been fixed
function LockIcon({ color = colorRoles.brandAction }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15v3m-5-6h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 01-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 11V7a4 4 0 118 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownIcon({ color = colorRoles.textMuted }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M19 9l-7 7-7-7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronUpIcon({ color = colorRoles.textMuted }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 15l7-7 7 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Local Custom Components
function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colorRoles.borderSubtle,
        backgroundColor: colorRoles.surfaceBase,
      }}
    >
      <View style={{ width: 40, alignItems: 'center' }}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
            <BackIcon color={colorRoles.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text role="bodyStrong" style={{ fontSize: 18, color: colorRoles.textPrimary }}>
        {title}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

interface ActionStripProps {
  icon: 'car' | 'notifications' | 'lock-closed';
  title: string;
  subtitle: string;
  expanded: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}

function ActionStrip({ icon, title, subtitle, expanded, onPress, children }: ActionStripProps) {
  return (
    <View style={{ width: '100%' }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 80, 13, 0.08)', justifyContent: 'center', alignItems: 'center' }}>
            {icon === 'car' ? <CarIcon /> : icon === 'notifications' ? <BellIcon /> : <LockIcon />}
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <Text role="bodyStrong" style={{ color: colorRoles.textPrimary }}>{title}</Text>
            <Text role="bodySm" numberOfLines={1} style={{ color: colorRoles.textMuted }}>{subtitle}</Text>
          </View>
        </View>
        <View style={{ paddingRight: 8 }}>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </View>
      </TouchableOpacity>

      {expanded && children && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {children}
        </View>
      )}
    </View>
  );
}

interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  isLast?: boolean;
}

function SwitchRow({ label, description, value, onValueChange, isLast = false }: SwitchRowProps) {
  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 12 }}>
          <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, textAlign: 'right' }}>
            {label}
          </Text>
          {description ? (
            <Text role="bodySm" style={{ color: colorRoles.textMuted, textAlign: 'right', marginTop: 2 }}>
              {description}
            </Text>
          ) : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colorRoles.surfaceBase, true: colorRoles.brandAction }}
          thumbColor={value ? colorRoles.surfaceBase : colorRoles.surfaceBase}
        />
      </View>
      {!isLast && <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginHorizontal: 16 }} />}
    </View>
  );
}

export function PreferencesHubScreen({ onBack }: PreferencesHubScreenProps) {
  const insets = useSafeAreaInsets();
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

  const toggle = (s: PrefsSection) => setExpanded((prev) => (prev === s ? null : s));

  const quickSuggestions = [
    'اترك الطلب عند الباب دون طرق.',
    'اتصل قبل الوصول بخمس دقائق.',
    'سلم الطلب يدوياً للمستلم فقط.',
  ];

  const handleSave = () => {};

  const handleReset = () => {
    setDeliveryInstructions('اتصل قبل الوصول بدقيقتين واترك الطلب عند الباب عند عدم الرد.');
    setOrderAlerts(true); setArrivalBell(true); setPromoAlerts(true); setSystemAlerts(false);
    setQuickOrder(true); setAutoSaveAddr(true); setHighPrivacy(false); setAccessMode(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <ScreenHeader title="تفضيلات التوصيل" {...(onBack ? { onBack } : {})} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[4],
          paddingBottom: insets.bottom + spacing[12],
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing[2] }}>
          <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, textAlign: 'right', paddingHorizontal: spacing[4], marginBottom: spacing[2] }}>
            خيارات التفضيلات
          </Text>

          <View style={{ borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 16, overflow: 'hidden', backgroundColor: colorRoles.surfaceBase }}>
            {/* 1. Delivery */}
            <ActionStrip
              icon="car"
              title="تعليمات الكابتن والتسليم"
              subtitle={deliveryInstructions}
              expanded={expanded === 'delivery'}
              onPress={() => toggle('delivery')}
            >
              <View style={{ gap: spacing[3], paddingTop: spacing[2] }}>
                <Text role="bodySm" style={{ color: colorRoles.textMuted, textAlign: 'right' }}>
                  ملاحظات أو توجيهات تظهر للكابتن لمساعدته في العثور على موقعك وتوصيل الطلب بسهولة وسرعة.
                </Text>
                <TextInput
                  value={deliveryInstructions}
                  onChangeText={setDeliveryInstructions}
                  placeholder="أدخل تعليمات التوصيل..."
                  multiline
                  style={{
                    width: '100%',
                    minHeight: 80,
                    borderWidth: 1,
                    borderColor: colorRoles.surfaceBase,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    textAlign: 'right',
                    color: colorRoles.textPrimary,
                    backgroundColor: colorRoles.surfaceBase,
                  }}
                />
                <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[1] }}>
                  {quickSuggestions.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setDeliveryInstructions(s)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: spacing[3],
                        backgroundColor: colorRoles.surfaceBase,
                        borderRadius: 100,
                        borderWidth: 1,
                        borderColor: colorRoles.surfaceBase,
                      }}
                    >
                      <Text role="bodySm" style={{ color: colorRoles.textPrimary }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ActionStrip>

            <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

            {/* 2. Notifications */}
            <ActionStrip
              icon="notifications"
              title="إعدادات التنبيهات"
              subtitle="إشعارات حالة الطلب، جرس الوصول، والعروض"
              expanded={expanded === 'notifications'}
              onPress={() => toggle('notifications')}
            >
              <View style={{ paddingTop: spacing[2] }}>
                <SwitchRow label="إشعارات حالة الطلب المباشرة" description="تحديثات فورية عند قبول الطلب وخروج الكابتن." value={orderAlerts} onValueChange={setOrderAlerts} />
                <SwitchRow label="تفعيل جرس الوصول الذكي" description="تنبيه بصوت مميز عند اقتراب الكابتن." value={arrivalBell} onValueChange={setArrivalBell} />
                <SwitchRow label="العروض والتخفيضات الحصرية" description="تنبيهات لأقوى التخفيضات وكوبونات التوصيل المجاني." value={promoAlerts} onValueChange={setPromoAlerts} />
                <SwitchRow label="تنبيهات النظام الأساسية" description="إشعارات الأمان والتحديثات الهامة." value={systemAlerts} onValueChange={setSystemAlerts} isLast />
              </View>
            </ActionStrip>

            <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

            {/* 3. Privacy */}
            <ActionStrip
              icon="lock-closed"
              title="الخصوصية وتسهيلات التجربة"
              subtitle="الطلب السريع، حفظ العناوين، ووضع الخصوصية العالي"
              expanded={expanded === 'privacy'}
              onPress={() => toggle('privacy')}
            >
              <View style={{ paddingTop: spacing[2] }}>
                <SwitchRow label="الطلب السريع بلمسة واحدة" description="إتمام الطلب باستخدام عنوانك وطريقة الدفع الافتراضية." value={quickOrder} onValueChange={setQuickOrder} />
                <SwitchRow label="حفظ المواقع والعناوين تلقائياً" description="حفظ العناوين الجديدة تلقائياً لاستخدامها مستقبلاً." value={autoSaveAddr} onValueChange={setAutoSaveAddr} />
                <SwitchRow label="تفعيل وضع الخصوصية العالي" description="حظر رؤية اسمك الكامل أو رقمك الفعلي للكابتن." value={highPrivacy} onValueChange={setHighPrivacy} />
                <SwitchRow label="تسهيلات الوصول وقراءة الشاشة" description="تكبير الخطوط وزيادة التباين وتوافق قارئ الشاشة." value={accessMode} onValueChange={setAccessMode} isLast />
              </View>
            </ActionStrip>
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: spacing[2], marginTop: spacing[4] }}>
          <Button
            tone="primary"
            label="حفظ كل التفضيلات والتغييرات"
            onPress={handleSave}
            style={{ backgroundColor: colorRoles.brandAction, borderRadius: 100, elevation: 2 }}
          />

          <TouchableOpacity onPress={handleReset} style={{ alignSelf: 'center', marginTop: 12, padding: 8 }}>
            <Text role="body" style={{ color: colorRoles.brandStructure, fontWeight: 'bold' }}>
              إعادة تعيين إلى الافتراضي
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default PreferencesHubScreen;
