// app-field — DshFieldPartnerCard
// نسخة طبق الأصل من مانح dsh-suite — بطاقة ملف انضمام شريك
// ملتزم بالكامل بالمسار السيادي shared كحاكم وعقل للواجهات
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, spacing, radius, colorRoles } from '@bthwani/ui-kit';
import { buildPartnerListRowViewModel, getDshPartnerActivationProgress } from '../../shared/partner';
import type { DshPartnerSummary } from '../../shared/partner';
import type { DshPartnerActivationStatus } from '../../shared/partner';

type DshFieldPartnerCardProps = {
  readonly partner: DshPartnerSummary;
  readonly onPress: () => void;
};

// ── Badge color mapper driven by shared statusTone ──────────────────────────
function resolveBadgeColors(tone: 'success' | 'warning' | 'danger' | 'info' | 'muted'): { bg: string; fg: string } {
  const styles = {
    success: { bg: colorRoles.surfaceBase, fg: colorRoles.brandStructure },
    danger:  { bg: colorRoles.surfaceBase, fg: colorRoles.brandAction },
    warning: { bg: colorRoles.surfaceBase, fg: colorRoles.brandAction },
    info:    { bg: colorRoles.surfaceBase, fg: colorRoles.brandStructure },
    muted:   { bg: colorRoles.surfaceBase, fg: colorRoles.brandStructure },
  };
  return styles[tone] ?? styles.muted;
}

// ── Inline badge ───────────────────────────────────────────────────────────
function InlineBadge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.round,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 11, color: fg, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ── Main card ──────────────────────────────────────────────────────────────
export function DshFieldPartnerCard({ partner, onPress }: DshFieldPartnerCardProps) {
  // Leverage the shared brain to build the view model
  const vm = buildPartnerListRowViewModel(partner);
  
  const progress = getDshPartnerActivationProgress(partner.activationStatus);
  const badgeColors = resolveBadgeColors(vm.statusTone);

  // Use nextAction and blockedReason directly from shared brain (or fallback if empty)
  const nextStep = vm.nextAction || 'إكمال النواقص';
  const phaseLabel = vm.blockedReason || 'جاري استكمال ومطابقة البيانات الميدانية';

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
          padding: spacing[4],
          marginBottom: spacing[3],
          gap: spacing[3],
          shadowColor: colorRoles.brandStructure,
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        {/* Row 1: Badges + title */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing[3],
          }}
        >
          {/* Right side: badges + title + subtitle */}
          <View style={{ flex: 1, gap: spacing[2], alignItems: 'flex-end' }}>
            {/* Badges row */}
            <View style={{ flexDirection: 'row-reverse', gap: spacing[1], flexWrap: 'wrap' }}>
              <InlineBadge label={vm.statusLabel} bg={badgeColors.bg} fg={badgeColors.fg} />
              <InlineBadge
                label={`اكتمال ${progress}%`}
                bg={colorRoles.borderSubtle}
                fg={colorRoles.textMuted}
              />
            </View>
            {/* Store name */}
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 16,
                textAlign: 'right',
                color: colorRoles.textPrimary,
              }}
            >
              {partner.displayName || 'ملف انضمام جديد'}
            </Text>
            {/* City / category */}
            <Text style={{ fontSize: 13, color: colorRoles.textMuted, textAlign: 'right' }}>
              {partner.category}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        {/* Row 2: Current phase */}
        <View style={{ gap: spacing[1], alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '600', fontSize: 14, textAlign: 'right', color: colorRoles.textPrimary }}>
            المرحلة الحالية
          </Text>
          <Text style={{ fontSize: 13, color: colorRoles.textMuted, textAlign: 'right' }}>
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
        </View>
      </View>
    </Pressable>
  );
}
