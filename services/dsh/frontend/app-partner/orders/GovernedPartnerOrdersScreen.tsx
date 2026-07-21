import React from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  MobileScrollView,
  SearchField,
  StateView,
  Tabs,
  Text,
} from '@bthwani/ui-kit';
import {
  PREPARATION_ISSUE_KIND_LABELS,
  STORE_CAPTAIN_HANDOFF_EXCEPTION_LABELS,
} from '../../shared/orders';
import type { GovernedPartnerOrderItem } from '../../shared/partner/partner.adapters';
import type { PartnerOrdersHomeScreenState } from './OrdersInboxScreen';

export type GovernedPartnerOrderActionId =
  | 'accept'
  | 'reject'
  | 'details'
  | 'prepare'
  | 'ready'
  | 'revise_estimate'
  | 'report_issue'
  | 'resolve_issue'
  | 'handoff'
  | 'handoff_exception'
  | 'issue'
  | 'delivering';

type StageId = 'all' | 'decision' | 'preparation' | 'ready' | 'handoff' | 'monitoring';

const STAGES: ReadonlyArray<{ readonly id: StageId; readonly label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'decision', label: 'قرار' },
  { id: 'preparation', label: 'تجهيز' },
  { id: 'ready', label: 'جاهزية' },
  { id: 'handoff', label: 'تسليم' },
  { id: 'monitoring', label: 'متابعة' },
];

function hasOpenHandoffException(item: GovernedPartnerOrderItem): boolean {
  return item.openStoreCaptainHandoffExceptionId !== '';
}

function primaryAction(item: GovernedPartnerOrderItem): GovernedPartnerOrderActionId {
  if (hasOpenHandoffException(item)) return 'details';
  if (item.allowedActions.includes('resolve_issue')) return 'resolve_issue';
  if (item.allowedActions.includes('accept')) return 'accept';
  if (item.allowedActions.includes('prepare')) return 'prepare';
  if (item.allowedActions.includes('ready')) return 'ready';
  if (item.allowedActions.includes('handoff')) return 'handoff';
  if (item.allowedActions.includes('report_issue')) return 'report_issue';
  if (item.status === 'delivering') return 'delivering';
  if (item.issueRequired || item.status === 'cancelled') return 'issue';
  return 'details';
}

function primaryLabel(item: GovernedPartnerOrderItem): string {
  if (hasOpenHandoffException(item)) return 'عرض استثناء العهدة';
  const action = primaryAction(item);
  if (action === 'resolve_issue') return 'حل مشكلات التحضير';
  if (action === 'accept') return 'قبول الطلب';
  if (action === 'prepare') return 'بدء التحضير';
  if (action === 'ready') return 'تأكيد الجاهزية';
  if (action === 'handoff') return 'تأكيد التسليم للكابتن';
  if (action === 'report_issue') return 'تسجيل مشكلة';
  if (action === 'delivering') return 'متابعة التوصيل';
  if (action === 'issue') return 'فتح المشكلة';
  return 'عرض التفاصيل';
}

function stageMatches(item: GovernedPartnerOrderItem, stage: StageId): boolean {
  if (stage === 'all') return true;
  if (stage === 'decision') return item.allowedActions.includes('accept') || item.allowedActions.includes('reject');
  if (stage === 'preparation') {
    return item.allowedActions.includes('prepare')
      || item.allowedActions.includes('revise_estimate')
      || item.allowedActions.includes('report_issue')
      || item.allowedActions.includes('resolve_issue');
  }
  if (stage === 'ready') return item.allowedActions.includes('ready');
  if (stage === 'handoff') {
    return hasOpenHandoffException(item)
      || item.allowedActions.includes('handoff')
      || item.storeCaptainHandoffStatus === 'awaiting_partner'
      || item.storeCaptainHandoffStatus === 'partner_confirmed';
  }
  return item.allowedActions.length === 0;
}

function statusLabel(item: GovernedPartnerOrderItem): string {
  if (hasOpenHandoffException(item)) {
    return item.openStoreCaptainHandoffExceptionStatus === 'acknowledged'
      ? 'استثناء عهدة قيد مراجعة العمليات'
      : 'استثناء عهدة جديد';
  }
  if (item.openPreparationIssueCount > 0) return `${item.openPreparationIssueCount} مشكلة تمنع الجاهزية`;
  if (item.storeCaptainHandoffStatus === 'awaiting_partner') return 'ينتظر تأكيد المتجر';
  if (item.storeCaptainHandoffStatus === 'partner_confirmed') return 'ينتظر استلام الكابتن';
  if (item.preparation.preparationSlaState === 'overdue') return item.slaLabel ?? 'متأخر عن الجاهزية';
  if (item.preparation.preparationSlaState === 'due_soon') return item.slaLabel ?? 'اقترب موعد الجاهزية';
  if (item.allowedActions.includes('accept')) return 'ينتظر قرار المتجر';
  if (item.allowedActions.includes('prepare')) return item.slaLabel ?? 'مقبول وينتظر بدء التحضير';
  if (item.allowedActions.includes('ready')) return item.slaLabel ?? 'قيد التحضير';
  if (item.allowedActions.includes('handoff')) return 'جاهز للتسليم';
  if (item.status === 'completed') return 'مكتمل';
  if (item.status === 'cancelled') return 'ملغي';
  return item.nextActionLabel;
}

function statusTone(item: GovernedPartnerOrderItem): 'danger' | 'warning' | 'success' | 'neutral' {
  if (hasOpenHandoffException(item)) return 'danger';
  if (item.openPreparationIssueCount > 0) return 'danger';
  if (item.storeCaptainHandoffStatus === 'awaiting_partner') return 'warning';
  if (item.storeCaptainHandoffStatus === 'partner_confirmed') return 'success';
  if (item.preparation.preparationSlaState === 'overdue') return 'danger';
  if (item.preparation.preparationSlaState === 'due_soon') return 'warning';
  if (item.preparation.preparationSlaState === 'ready') return 'success';
  return item.allowedActions.length > 0 ? 'warning' : 'neutral';
}

function renderState(state: Exclude<PartnerOrdersHomeScreenState, 'ready'>, onRetry: () => void | Promise<void>) {
  if (state === 'loading') return <StateView title="جارٍ تحميل لوحة الطلبات" loading />;
  if (state === 'empty') return <StateView title="لا توجد طلبات" description="ستظهر الطلبات هنا عند وصولها من DSH." actionLabel="تحديث" onActionPress={() => void onRetry()} />;
  if (state === 'offline') return <StateView tone="warning" title="الاتصال غير متاح" description="لم تُعرض أي بيانات محلية بديلة." actionLabel="إعادة المحاولة" onActionPress={() => void onRetry()} />;
  if (state === 'disabled') return <StateView tone="warning" title="لوحة الطلبات غير متاحة" description="لا يسمح نطاق الحساب الحالي بقراءة لوحة الطلبات." />;
  if (state === 'partial') return <StateView tone="warning" title="بيانات جزئية" description="أعد المزامنة قبل تنفيذ أي قرار." actionLabel="إعادة المزامنة" onActionPress={() => void onRetry()} />;
  return <StateView tone="danger" title="تعذر تحميل الطلبات" description="لم يتم تنفيذ أي تغيير." actionLabel="إعادة المحاولة" onActionPress={() => void onRetry()} />;
}

export function GovernedPartnerOrdersScreen({
  state,
  items,
  searchMode,
  onCloseSearch,
  onRetry,
  onAction,
}: {
  readonly state: PartnerOrdersHomeScreenState;
  readonly items: readonly GovernedPartnerOrderItem[];
  readonly searchMode: boolean;
  readonly onCloseSearch: () => void;
  readonly onRetry: () => void | Promise<void>;
  readonly onAction: (actionId: GovernedPartnerOrderActionId, orderId: string) => void;
}) {
  const [stage, setStage] = React.useState<StageId>('all');
  const [query, setQuery] = React.useState('');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (state !== 'ready') return renderState(state, onRetry);

  const normalized = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!stageMatches(item, stage)) return false;
    if (!normalized) return true;
    return [item.orderCode, item.branchLabel, item.itemsSummaryLabel ?? '', item.amountLabel]
      .join(' ')
      .toLowerCase()
      .includes(normalized);
  });

  const tabItems = STAGES.map((item) => ({
    id: item.id,
    label: `${item.label} (${items.filter((order) => stageMatches(order, item.id)).length})`,
  }));

  return (
    <MobileScrollView fill padding={4} gap={3}>
      <Box gap={1}>
        <Text role="titleLg">مركز تجهيز الطلبات</Text>
        <Text role="bodySm" tone="muted">الموعد والمشكلات والعهدة مصدرها DSH، ولا يمكن الاستلام قبل اكتمال التأكيد الثنائي.</Text>
      </Box>

      <Tabs items={tabItems} value={stage} onValueChange={(value) => setStage(value as StageId)} />

      {searchMode ? (
        <Box gap={2}>
          <SearchField value={query} onChangeText={setQuery} placeholder="رقم الطلب أو الصنف أو الفرع" />
          <Button label="إغلاق البحث" tone="ghost" size="sm" fullWidth={false} onPress={onCloseSearch} />
        </Box>
      ) : null}

      {filtered.length === 0 ? (
        <StateView title="لا توجد نتائج" description="غيّر التبويب أو عبارة البحث." />
      ) : (
        <Box gap={2}>
          {filtered.map((item, index) => {
            const action = primaryAction(item);
            const expanded = expandedId === item.id;
            const openHandoffException = hasOpenHandoffException(item);
            const handoffExceptionAvailable = !openHandoffException && (
              item.storeCaptainHandoffStatus === 'awaiting_partner'
              || item.storeCaptainHandoffStatus === 'partner_confirmed'
            );
            return (
              <React.Fragment key={item.id}>
                {index > 0 ? <Divider /> : null}
                <Box gap={2} paddingY={2}>
                  <Box layoutDirection="row" justify="space-between" align="center">
                    <Box gap={1}>
                      <Text role="bodyStrong">{item.orderCode}</Text>
                      <Text role="caption" tone="muted">{`${item.itemsCountLabel} · ${item.amountLabel} · ${item.elapsedLabel}`}</Text>
                    </Box>
                    <Badge label={statusLabel(item)} tone={statusTone(item)} />
                  </Box>

                  {expanded ? (
                    <Box gap={1} background="surfaceInset" padding={3}>
                      <Text role="bodySm">{item.itemsSummaryLabel ?? 'تُقرأ تفاصيل الأصناف من الطلب عند فتحه.'}</Text>
                      <Text role="caption" tone="muted">{`نمط التنفيذ: ${item.orderTypeLabel}`}</Text>
                      {item.preparation.estimatedReadyAt ? (
                        <Text role="caption" tone="muted">{`موعد الجاهزية: ${new Date(item.preparation.estimatedReadyAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}`}</Text>
                      ) : null}
                      {item.preparation.preparationDelayReason ? (
                        <Text role="caption" tone="warning">{`سبب آخر مراجعة: ${item.preparation.preparationDelayReason}`}</Text>
                      ) : null}
                      {item.preparationIssues.filter((issue) => issue.status === 'open').map((issue) => (
                        <Text key={issue.id} role="caption" tone="danger">
                          {`${PREPARATION_ISSUE_KIND_LABELS[issue.kind]}: ${issue.note}`}
                        </Text>
                      ))}
                      {openHandoffException && item.openStoreCaptainHandoffExceptionReason ? (
                        <Text role="bodySm" tone="danger">
                          {`${STORE_CAPTAIN_HANDOFF_EXCEPTION_LABELS[item.openStoreCaptainHandoffExceptionReason]} · ${item.openStoreCaptainHandoffExceptionStatus === 'acknowledged' ? 'قيد مراجعة العمليات' : 'بانتظار اعتماد العمليات'}`}
                        </Text>
                      ) : null}
                      {item.storeCaptainHandoffCaptainId ? (
                        <Text role="caption" tone="muted">{`الكابتن المعيّن: ${item.storeCaptainHandoffCaptainId}`}</Text>
                      ) : null}
                      {item.nextOwnerLabel ? <Text role="caption" tone="muted">{`الجهة التالية: ${item.nextOwnerLabel}`}</Text> : null}
                    </Box>
                  ) : null}

                  <Box layoutDirection="row" gap={2}>
                    <Button label={primaryLabel(item)} size="sm" fullWidth={false} onPress={() => onAction(action, item.id)} />
                    {handoffExceptionAvailable ? (
                      <Button label="نقص أو عدم تطابق" tone="danger" size="sm" fullWidth={false} onPress={() => onAction('handoff_exception', item.id)} />
                    ) : null}
                    {item.allowedActions.includes('report_issue') && action !== 'report_issue' ? (
                      <Button label="تسجيل مشكلة" tone="danger" size="sm" fullWidth={false} onPress={() => onAction('report_issue', item.id)} />
                    ) : null}
                    {item.allowedActions.includes('revise_estimate') ? (
                      <Button label="تعديل الوقت" tone="secondary" size="sm" fullWidth={false} onPress={() => onAction('revise_estimate', item.id)} />
                    ) : null}
                    {item.allowedActions.includes('reject') ? (
                      <Button label="رفض مع سبب" tone="danger" size="sm" fullWidth={false} onPress={() => onAction('reject', item.id)} />
                    ) : null}
                    <Button
                      label={expanded ? 'إغلاق التفاصيل' : 'تفاصيل'}
                      tone="ghost"
                      size="sm"
                      fullWidth={false}
                      onPress={() => setExpandedId(expanded ? null : item.id)}
                    />
                  </Box>
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      )}
    </MobileScrollView>
  );
}
