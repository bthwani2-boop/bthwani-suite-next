import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Box, Icon, Text, radius, spacing } from '@bthwani/ui-kit';
import { partnerHubTheme as theme } from './PartnerHubNav';
import type { PartnerOperationalMode } from '../../shared/partner/partner-hub.types';

export interface PartnerHubStoreHeroProps {
  direction: 'rtl' | 'ltr';
  resolvedStoreName: string;
  resolvedBranchLabel: string;
  resolvedActiveZoneLabel: string;
  isAvailable: boolean;
  onOpenStoreScope: (() => void) | undefined;
  serviceModes: PartnerOperationalMode[];
  selectedModeId: string;
  setSelectedModeId: (id: string) => void;
}

export function PartnerHubStoreHero({
  direction,
  resolvedStoreName,
  resolvedBranchLabel,
  resolvedActiveZoneLabel,
  isAvailable,
  onOpenStoreScope,
  serviceModes,
  selectedModeId,
  setSelectedModeId,
}: PartnerHubStoreHeroProps) {
  return (
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
        {serviceModes.map((mode) => (
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
  );
}
