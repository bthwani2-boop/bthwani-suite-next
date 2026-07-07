import React from 'react';
import { Pressable } from 'react-native';
import { Box, Button, Chip, SectionHeader, Surface, Text, TextField } from '@bthwani/ui-kit';
import type { DshPartnerOperationalFlowId, DshPartnerSupportIssueCategoryId } from '../dsh-partner.types';
import { getOperationsSupportFlowSpec } from '../../shared';

export type PartnerOrderIssueFlowId = 'order-issue-queue' | 'order-reject';

export type PartnerOrderIssueCategorySpec = {
  id: DshPartnerSupportIssueCategoryId;
  title: string;
  description: string;
  owner: 'شريك' | 'كابتن' | 'عميل' | 'دعم' | 'ميداني' | 'دعم / WLT' | 'لوحة التحكم';
  severity: 'warning' | 'danger' | 'info';
  allowedActions: readonly string[];
  forbiddenActions: readonly string[];
  nextFlowId: DshPartnerOperationalFlowId;
};

const partnerIssueNextFlowMap: Record<DshPartnerSupportIssueCategoryId, DshPartnerOperationalFlowId> = {
  'delayed-preparation': 'order-prepare',
  'item-unavailable': 'inventory-adjust',
  'partner-reject-request': 'order-reject',
  'courier-not-arrived': 'order-handoff',
  'customer-not-responding': 'order-chat-send',
  'handoff-mismatch': 'order-handoff',
  'wrong-item': 'order-issue-queue',
  'payment-refund-review': 'partner-finance-bridge',
};

function buildPartnerIssueCategorySpec(
  categoryId: DshPartnerSupportIssueCategoryId
): PartnerOrderIssueCategorySpec {
  const flowSpec = getOperationsSupportFlowSpec(categoryId);

  return {
    id: categoryId,
    title: flowSpec.title,
    description: flowSpec.description,
    owner: flowSpec.ownerLabel as PartnerOrderIssueCategorySpec['owner'],
    severity:
      flowSpec.severity === 'danger'
        ? 'danger'
        : flowSpec.severity === 'warning'
          ? 'warning'
          : 'info',
    allowedActions: flowSpec.allowedActions,
    forbiddenActions: flowSpec.forbiddenActions,
    nextFlowId: partnerIssueNextFlowMap[categoryId],
  };
}

export const PARTNER_ORDER_ISSUE_CATEGORY_SPECS: Record<
  DshPartnerSupportIssueCategoryId,
  PartnerOrderIssueCategorySpec
> = {
  'delayed-preparation': buildPartnerIssueCategorySpec('delayed-preparation'),
  'item-unavailable': buildPartnerIssueCategorySpec('item-unavailable'),
  'partner-reject-request': buildPartnerIssueCategorySpec('partner-reject-request'),
  'courier-not-arrived': buildPartnerIssueCategorySpec('courier-not-arrived'),
  'customer-not-responding': buildPartnerIssueCategorySpec('customer-not-responding'),
  'handoff-mismatch': buildPartnerIssueCategorySpec('handoff-mismatch'),
  'wrong-item': buildPartnerIssueCategorySpec('wrong-item'),
  'payment-refund-review': buildPartnerIssueCategorySpec('payment-refund-review'),
};

function resolveCategoryFlowId(categoryId: DshPartnerSupportIssueCategoryId): PartnerOrderIssueFlowId {
  return categoryId === 'partner-reject-request' ? 'order-reject' : 'order-issue-queue';
}

export function resolvePartnerOrderIssueDefaultCategory(
  activeFlowId?: PartnerOrderIssueFlowId
): DshPartnerSupportIssueCategoryId {
  if (activeFlowId === 'order-reject') {
    return 'partner-reject-request';
  }

  return 'delayed-preparation';
}

export function getPartnerOrderIssueCategorySpec(
  categoryId: DshPartnerSupportIssueCategoryId
): PartnerOrderIssueCategorySpec {
  return PARTNER_ORDER_ISSUE_CATEGORY_SPECS[categoryId];
}

type IssueCategoryCardProps = {
  category: PartnerOrderIssueCategorySpec;
  selected: boolean;
};

function IssueCategoryCard({ category, selected }: IssueCategoryCardProps) {
  const severityTone =
    category.severity === 'danger'
      ? 'danger'
      : category.severity === 'warning'
        ? 'warning'
        : 'info';

  return (
    <Surface
      tone={selected ? 'default' : 'raised'}
      padding={3}
      gap={2}
    >
      <Box layoutDirection="row" justify="space-between" align="center" style={{ flexWrap: 'wrap' }} gap={2}>
        <Text role="bodyStrong">{category.title}</Text>
        <Box layoutDirection="row" gap={2} style={{ flexWrap: 'wrap' }}>
          <Chip label={category.owner} />
          <Chip
            label={category.severity === 'danger' ? 'حرجة' : category.severity === 'warning' ? 'تحتاج قرار' : 'متابعة'}

            selected={selected}
          />
        </Box>
      </Box>

      <Text role="bodySm" tone="muted">
        {category.description}
      </Text>

      <Text role="caption" tone="muted">
        {`المسار التالي: ${category.nextFlowId}`}
      </Text>
    </Surface>
  );
}

export type DshPartnerOrderIssuePanelProps = {
  activeFlowId?: PartnerOrderIssueFlowId;
  selectedCategoryId?: DshPartnerSupportIssueCategoryId;
  onSelectFlow?: (flowId: PartnerOrderIssueFlowId) => void;
  onSelectCategory?: (categoryId: DshPartnerSupportIssueCategoryId) => void;
};

export function DshPartnerOrderIssuePanel({
  activeFlowId,
  selectedCategoryId,
  onSelectFlow,
  onSelectCategory,
}: DshPartnerOrderIssuePanelProps) {
  const [issueNote, setIssueNote] = React.useState('');
  const [internalCategoryId, setInternalCategoryId] = React.useState<DshPartnerSupportIssueCategoryId>(
    selectedCategoryId ?? resolvePartnerOrderIssueDefaultCategory(activeFlowId),
  );

  React.useEffect(() => {
    if (selectedCategoryId) {
      setInternalCategoryId(selectedCategoryId);
      return;
    }

    setInternalCategoryId(resolvePartnerOrderIssueDefaultCategory(activeFlowId));
  }, [activeFlowId, selectedCategoryId]);

  const selectedCategory = PARTNER_ORDER_ISSUE_CATEGORY_SPECS[internalCategoryId];

  function handleSelectCategory(categoryId: DshPartnerSupportIssueCategoryId) {
    setInternalCategoryId(categoryId);
    onSelectCategory?.(categoryId);
  }

  return (
    <Surface tone="raised" gap={3}>
      <SectionHeader
        title="معالجة الاستثناءات"
        subtitle="تعريف الاستثناءات أصبح أوسع من طابور المشكلة والرفض فقط، مع مالك وإجراءات وممنوعات واضحة لكل حالة."
      />

      <Box gap={2}>
        {(Object.values(PARTNER_ORDER_ISSUE_CATEGORY_SPECS) as PartnerOrderIssueCategorySpec[]).map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={category.title}
            onPress={() => handleSelectCategory(category.id)}
            style={{ width: '100%' }}
          >
            <IssueCategoryCard
              category={category}
              selected={internalCategoryId === category.id}
            />
          </Pressable>
        ))}
      </Box>

      <Surface tone="default" padding={3} gap={2}>
        <Text role="bodyStrong">{selectedCategory.title}</Text>
        <Text role="bodySm" tone="muted">
          {selectedCategory.description}
        </Text>
        <Text role="caption" tone="muted">{`المالك الحالي: ${selectedCategory.owner}`}</Text>
        <Text role="caption" tone="muted">{`المسار التالي: ${selectedCategory.nextFlowId}`}</Text>
        <Text role="caption" tone="success">
          {`الإجراءات المسموحة: ${selectedCategory.allowedActions.join(' · ')}`}
        </Text>
        <Text role="caption" tone="warning">
          {`الإجراءات الممنوعة: ${selectedCategory.forbiddenActions.join(' · ')}`}
        </Text>
      </Surface>

      <TextField
        label="ملاحظة تشغيلية مختصرة"
        value={issueNote}
        onChangeText={setIssueNote}
        hint="اكتب سبب المعالجة أو الإجراء التالي. هذه الملاحظة Preview فقط ولا تنشئ mutation."
      />

      <Button
        label="تأكيد المتابعة"
        tone="secondary"
        onPress={() => onSelectFlow?.(resolveCategoryFlowId(internalCategoryId))}
      />
    </Surface>
  );
}

// export default DshPartnerOrderIssuePanel; // Unused default export