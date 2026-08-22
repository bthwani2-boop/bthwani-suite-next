// app-field — DshFieldPartnerCard
// نسخة طبق الأصل من مانح dsh-suite — بطاقة ملف انضمام شريك
// ملتزم بالكامل بالمسار السيادي shared كحاكم وعقل للواجهات
import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Icon, Text, spacing, radius, colorRoles } from '@bthwani/ui-kit';
import { buildPartnerListRowViewModel, getDshPartnerActivationProgress, isDshPartnerActivationComplete } from '../../shared/partner';
import type { DshPartnerSummary } from '../../shared/partner';
import { formatFieldPartnerCategory } from './field-display';

type DshFieldPartnerCardProps = {
  readonly partner: DshPartnerSummary;
  readonly onPress?: () => void;
};

function toBadgeTone(tone: 'success' | 'warning' | 'danger' | 'info' | 'muted'): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  return tone === 'muted' ? 'neutral' : tone;
}

// ── Main card ──────────────────────────────────────────────────────────────
export function DshFieldPartnerCard({ partner, onPress }: DshFieldPartnerCardProps) {
  // Leverage the shared brain to build the view model
  const vm = buildPartnerListRowViewModel(partner);

  const progress = getDshPartnerActivationProgress(partner.activationStatus);
  const isComplete = isDshPartnerActivationComplete(partner.activationStatus);

  // Use nextAction and blockedReason directly from shared brain (or fallback if empty)
  const nextStep = vm.nextAction || 'إكمال النواقص';
  const phaseLabel = isComplete ? 'اكتمل مسار الاعتماد' : vm.blockedReason || 'جاري استكمال ومطابقة البيانات الميدانية';

  const updatedDate = (() => {
    try {
      return new Date(partner.updatedAt).toLocaleDateString('ar-YE', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return partner.updatedAt;
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: colorRoles.surfaceBase,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colorRoles.borderSubtle,
          borderRightWidth: 4,
          borderRightColor: colorRoles.brandAction,
          padding: spacing[3],
          marginBottom: spacing[2],
          gap: spacing[2],
          shadowColor: colorRoles.brandStructure,
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        {/* Row 1: identity, status, and progress */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing[3],
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colorRoles.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="storefront-outline" size={21} tone="brand" />
          </View>
          <View style={{ flex: 1, gap: spacing[2], alignItems: 'flex-end' }}>
            {/* Badges row */}
            <View style={{ flexDirection: 'row-reverse', gap: spacing[1], flexWrap: 'wrap' }}>
              <Badge label={vm.statusLabel} tone={toBadgeTone(vm.statusTone)} />
              <Badge label={`اكتمال ${progress}%`} tone="neutral" />
            </View>
            {/* Store name */}
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 15,
                textAlign: 'right',
                color: colorRoles.textPrimary,
              }}
            >
              {partner.displayName || 'ملف انضمام جديد'}
            </Text>
            {/* City / category */}
            <Text style={{ fontSize: 13, color: colorRoles.textMuted, textAlign: 'right' }}>
              {formatFieldPartnerCategory(partner.category)}
            </Text>
            <View style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: colorRoles.surfaceMuted, overflow: 'hidden' }}>
              <View style={{ width: `${progress}%`, height: '100%', borderRadius: 3, backgroundColor: colorRoles.brandAction }} />
            </View>
          </View>
        </View>

        {/* Row 2: Current phase */}
        <View style={{ gap: 2, alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '600', fontSize: 13, textAlign: 'right', color: colorRoles.textPrimary }}>
            المرحلة الحالية
          </Text>
          <Text style={{ fontSize: 12, color: colorRoles.textMuted, textAlign: 'right' }} numberOfLines={1}>
            {phaseLabel}
          </Text>
        </View>

        {/* Row 3: Next step | Last updated */}
        <View
          style={{
            flexDirection: 'row-reverse',
            gap: spacing[3],
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flex: 1, minWidth: 120, alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ fontSize: 11, color: colorRoles.textMuted }}>الخطوة التالية</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', textAlign: 'right', color: colorRoles.textPrimary }}>
              {nextStep}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 120, alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ fontSize: 11, color: colorRoles.textMuted }}>آخر تحديث / موعد</Text>
            <Text style={{ fontSize: 13, textAlign: 'right', color: colorRoles.textSecondary }}>
              الآن · {updatedDate}
            </Text>
          </View>
          <View style={{ minWidth: 86, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: isComplete ? colorRoles.success : colorRoles.brandAction, textAlign: 'right' }}>{isComplete ? 'مكتمل' : 'فتح الملف'}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
