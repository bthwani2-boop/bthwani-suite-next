/**
 * PartnerCatalogReadinessPanel — read-only partner catalog readiness summary
 * Owner: app-partner surface
 * API boundary: supplied by the partner catalog shared controller.
 *
 * Explains catalog readiness status to the partner:
 * - Why an item may not be visible to clients
 * - Who owns the current stage (partner vs catalog vs marketing)
 * - What the partner CAN edit: stock, availability, price override, prep note
 * - What the partner CANNOT do: approve, publish, set client-visible
 *
 * Partner surface ownership (per system contract):
 *   ✅ CAN: stock, availability, preparationNote, internalNote, price override
 *   ❌ CANNOT: approval, publish, client-visible, product identity
 *
 * Constraints:
 * - No direct Tamagui import. All UI via @bthwani/ui-kit.
 * - No canonical data mutation.
 * - No self-approval or publish CTAs.
 * - Uses shared workflow/visibility summary.
 */

import React from 'react';
import { Box, Button, Surface, Text, useTheme,
  radius,
  typography,
} from '@bthwani/ui-kit';
import {
  translateStage,
  translateOwner,
  canRenderInClientSurface,
} from '../../shared';

export type PartnerCatalogReadinessPanelProps = {
  productId: string;
  productName: string;
  publishStage?: string;
  available: boolean;
  stockCount: number;
  onClose?: () => void;
  onEditStock?: () => void;
  onEditAvailability?: () => void;
};

type ReadinessRow = {
  id: string;
  label: string;
  satisfied: boolean;
  owner: string;
  currentOwner: 'partner' | 'catalog' | 'marketing' | 'operations';
  partnerCanFix: boolean;
  reason?: string | undefined;
  nextAction: string;
  apiNote: string;
};

function deriveReadinessRows(
  publishStage: string | undefined,
  available: boolean,
  stockCount: number,
): ReadinessRow[] {
  const stageLabel = publishStage ? translateStage(publishStage) : '—';
  const isClientVisible = publishStage ? canRenderInClientSurface(publishStage) : false;

  return [
    {
      id: 'catalog-approved',
      label: '✅ اعتماد الكتالوج',
      satisfied: publishStage === 'catalog-adopted' || publishStage === 'client-visible' || publishStage === 'published',
      owner: 'control-panel/catalogs',
      currentOwner: 'catalog',
      partnerCanFix: false,
      reason: !(publishStage === 'catalog-adopted' || publishStage === 'client-visible')
        ? `المرحلة الحالية: ${stageLabel} — يحتاج اعتماد الكتالوج`
        : undefined,
      nextAction: 'بانتظار اعتماد من control-panel/catalogs — لا يمكن للشريك التسريع',
      apiNote: 'Catalog approval state is owned by control-panel/catalogs',
    },
    {
      id: 'marketing-cleared',
      label: '📢 مراجعة التسويق',
      satisfied: publishStage !== 'marketing-review' && publishStage !== 'marketing-approved' ? true
        : publishStage === 'marketing-approved',
      owner: 'control-panel/marketing',
      currentOwner: 'marketing',
      partnerCanFix: false,
      reason: publishStage === 'marketing-review'
        ? 'المنتج في مراجعة فريق التسويق'
        : undefined,
      nextAction: publishStage === 'marketing-review'
        ? 'بانتظار مراجعة التسويق — لا إجراء مطلوب من الشريك'
        : 'لا شيء مطلوب',
      apiNote: 'Marketing review state is owned by control-panel/marketing',
    },
    {
      id: 'partner-availability',
      label: '📦 التوفر والمخزون',
      satisfied: available && stockCount > 0,
      owner: 'app-partner',
      currentOwner: 'partner',
      partnerCanFix: true,
      reason: !available ? 'المنتج غير متوفر — راجع إعداد التوفر'
        : stockCount === 0 ? 'المخزون صفر — أضف كميات'
          : undefined,
      nextAction: !available ? 'تفعيل التوفر من لوحة المخزون'
        : stockCount === 0 ? 'تحديث الكمية من لوحة المخزون'
          : 'لا شيء مطلوب',
      apiNote: 'Inventory changes are owned by the partner inventory controller',
    },
    {
      id: 'client-visible',
      label: '👁 ظاهر للعميل',
      satisfied: isClientVisible,
      owner: 'control-panel/catalogs',
      currentOwner: 'catalog',
      partnerCanFix: false,
      reason: !isClientVisible
        ? 'المنتج لم يُصرَّح بظهوره للعميل بعد — يحتاج نشر من الكتالوج'
        : undefined,
      nextAction: !isClientVisible
        ? 'بانتظار نشر من control-panel/catalogs — لا إجراء من الشريك'
        : 'المنتج ظاهر للعميل ✅',
      apiNote: 'Client visibility is owned by catalog publication state',
    },
  ];
}

export function PartnerCatalogReadinessPanel({
  productId,
  productName,
  publishStage,
  available,
  stockCount,
  onClose,
  onEditStock,
  onEditAvailability,
}: PartnerCatalogReadinessPanelProps) {
  const theme = useTheme() as any;

  const rows = deriveReadinessRows(publishStage, available, stockCount);
  const isClientVisible = publishStage ? canRenderInClientSurface(publishStage) : false;
  const stageLabel = publishStage ? translateStage(publishStage) : 'غير محدد';
  const ownerLabel = publishStage ? translateOwner(publishStage) : 'غير محدد';

  const blockedRows = rows.filter((r) => !r.satisfied);
  const partnerFixableRows = blockedRows.filter((r) => r.partnerCanFix);

  return (
    <Surface
      tone="raised"
      padding={4}
      gap={4}
      border
      style={{ borderRadius: radius.sm, direction: 'rtl' }}
    >
      {/* Header */}
      <Box layoutDirection="row" justify="space-between" align="center">
        <Box gap={0}>
          <Text role="titleLg" weight="black" style={{ fontSize: 16, color: theme.brandHeaderBackground }}>
            🚦 جاهزية الكتالوج
          </Text>
          <Text role="caption" tone="muted" style={{ fontSize: typography.caption.fontSize }}>
            ملخص جاهزية مستمد من حالة الكتالوج المشتركة
          </Text>
        </Box>
        {onClose && (
          <Button label="✕" tone="secondary" size="sm" onPress={onClose} style={{ minWidth: 0 }} />
        )}
      </Box>

      {/* Product summary */}
      <Surface
        tone="inset"
        padding={3}
        gap={2}
        style={{
          borderRadius: radius.xs,
          borderWidth: 2,
          borderColor: isClientVisible ? theme.success : theme.warning,
          borderStyle: 'solid',
        }}
      >
        <Text role="caption" weight="black" style={{ color: theme.brandHeaderBackground }}>
          {productName}
        </Text>
        <Box layoutDirection="row" gap={4} style={{ flexWrap: 'wrap' }}>
          <Box gap={0}>
            <Text role="caption" tone="muted" style={{ fontSize: 10 }}>المرحلة الحالية</Text>
            <Text role="caption" weight="bold" style={{}}>{stageLabel}</Text>
          </Box>
          <Box gap={0}>
            <Text role="caption" tone="muted" style={{ fontSize: 10 }}>المالك الحالي</Text>
            <Text role="caption" weight="bold" style={{}}>{ownerLabel}</Text>
          </Box>
          <Box gap={0}>
            <Text role="caption" tone="muted" style={{ fontSize: 10 }}>ظاهر للعميل</Text>
            <Text
              role="caption"
              weight="bold"
              style={{ color: isClientVisible ? theme.success : theme.danger }}
            >
              {isClientVisible ? '✅ نعم' : '❌ لا'}
            </Text>
          </Box>
        </Box>
      </Surface>

      {/* Readiness rows */}
      <Box gap={2}>
        <Text role="caption" weight="black" style={{ color: theme.brandHeaderBackground }}>
          متطلبات الجاهزية
        </Text>
        {rows.map((row) => (
          <Box
            key={row.id}
            gap={1}
            style={{
              padding: 10,
              backgroundColor: row.satisfied ? theme.surfaceInset : theme.dangerSurface || theme.surfaceInset,
              borderRadius: radius.xs,
              borderWidth: 1,
              borderColor: row.satisfied ? theme.success : row.partnerCanFix ? theme.warning : theme.danger,
              borderStyle: 'solid',
            }}
          >
            <Box layoutDirection="row" align="center" justify="space-between">
              <Text role="caption" weight="bold" style={{ color: theme.brandHeaderBackground }}>
                {row.label}
              </Text>
              <Text
                role="caption"
                weight="bold"
                style={{ fontSize: typography.caption.fontSize, color: row.satisfied ? theme.success : row.partnerCanFix ? theme.warning : theme.danger }}
              >
                {row.satisfied ? '✅' : row.partnerCanFix ? '⚠️ بإمكانك الإصلاح' : '🔒 خارج صلاحية الشريك'}
              </Text>
            </Box>
            {row.reason && (
              <Text role="caption" tone="muted" style={{ fontSize: typography.caption.fontSize }}>
                {row.reason}
              </Text>
            )}
            <Text role="caption" weight="semibold" style={{ fontSize: typography.caption.fontSize, color: theme.brandHeaderBackground }}>
              {row.nextAction}
            </Text>
            <Text role="caption" tone="muted" style={{ fontSize: 10, direction: 'ltr' }}>
              {row.apiNote}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Partner permissions */}
      <Surface
        tone="inset"
        padding={3}
        gap={2}
        style={{ borderRadius: radius.xs, borderWidth: 1, borderColor: theme.line, borderStyle: 'solid' }}
      >
        <Text role="caption" weight="black" style={{ color: theme.brandHeaderBackground }}>
          صلاحيات الشريك في هذا المنتج
        </Text>
        <Box gap={1}>
          <Text role="caption" weight="semibold" style={{ color: theme.success,}}>
            ✅ يمكنك تعديل: المخزون، التوفر، سعر خاص، ملاحظة تحضير، ملاحظة داخلية
          </Text>
          <Text role="caption" weight="semibold" style={{ color: theme.danger,}}>
            ❌ لا يمكنك: اعتماد المنتج، النشر للعميل، تغيير هوية المنتج، تعديل فئته الأساسية
          </Text>
        </Box>
      </Surface>

      {/* Partner-fixable actions */}
      {partnerFixableRows.length > 0 && (
        <Box gap={2}>
          <Text role="caption" weight="black" style={{ color: theme.warning }}>
            ⚠️ إجراءات بإمكانك تنفيذها
          </Text>
          {partnerFixableRows.map((row) => {
            if (row.id === 'partner-availability') {
              return (
                <Box key={row.id} gap={2}>
                  {onEditStock && (
                    <Button
                      label="📦 تحديث المخزون"
                      tone="primary"
                      size="sm"
                      onPress={onEditStock}
                    />
                  )}
                  {onEditAvailability && (
                    <Button
                      label="🔄 تعديل حالة التوفر"
                      tone="secondary"
                      size="sm"
                      onPress={onEditAvailability}
                    />
                  )}
                </Box>
              );
            }
            return null;
          })}
        </Box>
      )}

      {isClientVisible && available && stockCount > 0 && (
        <Surface
          tone="inset"
          padding={3}
          style={{ borderRadius: radius.xs, borderWidth: 2, borderColor: theme.success, borderStyle: 'solid' }}
        >
          <Text role="caption" weight="black" style={{ color: theme.success, textAlign: 'center' }}>
            🎉 المنتج ظاهر للعميل ومتوفر للطلب
          </Text>
        </Surface>
      )}
    </Surface>
  );
}
