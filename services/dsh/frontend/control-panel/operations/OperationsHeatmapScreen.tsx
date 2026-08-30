'use client';

import React from 'react';
import { Card, StateView, Text } from '@bthwani/ui-kit';
import {
  CpBadge,
  CpButton,
  CpKpiCard,
  CpKpiStrip,
  CpTable,
  CpTableCell,
  CpTableHeaderCell,
} from '@bthwani/control-panel/components';
import { createDshHttpClient } from '../../shared/_kernel/dsh-http-request';
import { resolveDshApiBaseUrl } from '../../shared/_kernel/dsh-api-base-url';
import { GoogleMapsWebCanvas, type GoogleMapsWebPoint } from '../maps/GoogleMapsWebCanvas';

export type OperationsHeatmapScreenProps = {
  readonly hubHref: string;
  readonly subGroup?: string;
};

type OperationsHeatmapCell = {
  readonly cellKey: string;
  readonly centerLatitude: number;
  readonly centerLongitude: number;
  readonly captainCount: number;
  readonly freshCount: number;
  readonly staleCount: number;
  readonly lostCount: number;
};

type OperationsHeatmapResponse = {
  readonly cells: readonly OperationsHeatmapCell[];
  readonly totalCells: number;
};

type HeatmapState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'success'; readonly data: OperationsHeatmapResponse }
  | { readonly kind: 'empty' }
  | { readonly kind: 'error'; readonly message: string };

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  'dsh-control-panel-operations-heatmap',
);

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'تعذر تحميل خريطة العمليات من DSH Runtime.';
}

function freshnessLabel(cell: OperationsHeatmapCell): string {
  if (cell.lostCount > 0) return 'مفقود/قديم';
  if (cell.staleCount > 0) return 'يحتاج تحديث';
  return 'حديث';
}

function freshnessTone(cell: OperationsHeatmapCell): 'success' | 'warning' | 'danger' {
  if (cell.lostCount > 0) return 'danger';
  if (cell.staleCount > 0) return 'warning';
  return 'success';
}

function toMapPoint(cell: OperationsHeatmapCell): GoogleMapsWebPoint {
  return {
    id: cell.cellKey,
    latitude: cell.centerLatitude,
    longitude: cell.centerLongitude,
    title: `${cell.captainCount} كابتن`,
    description: `حديث ${cell.freshCount} · متأخر ${cell.staleCount} · مفقود ${cell.lostCount}`,
  };
}

export function OperationsHeatmapScreen(_: OperationsHeatmapScreenProps) {
  const [state, setState] = React.useState<HeatmapState>({ kind: 'loading' });

  const load = React.useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const data = await request<OperationsHeatmapResponse>('/dsh/operator/dispatch/heatmap');
      if (!Array.isArray(data.cells) || data.cells.length === 0) {
        setState({ kind: 'empty' });
        return;
      }
      setState({ kind: 'success', data });
    } catch (error) {
      setState({ kind: 'error', message: messageFrom(error) });
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') {
    return <StateView stateId="loading" title="جارٍ تحميل خريطة العمليات" description="يتم جلب آخر مواقع الكباتن المقبولة من DSH Runtime." />;
  }
  if (state.kind === 'error') {
    return (
      <StateView
        stateId="recoverableError"
        title="تعذر تحميل خريطة العمليات"
        description={state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={() => void load()}
      />
    );
  }
  if (state.kind === 'empty') {
    return (
      <Card style={{ padding: '2rem' }}>
        <StateView
          stateId="empty"
          title="لا توجد خلايا موقع حية"
          description="لم يُرجع DSH أي تعيينات مقبولة ذات إحداثيات مسجلة حاليًا. هذه حالة فارغة مثبتة وليست صفراً مصطنعاً."
        />
        <div style={{ marginTop: '1rem' }}>
          <CpButton variant="secondary" onClick={() => void load()}>تحديث</CpButton>
        </div>
      </Card>
    );
  }

  const cells = state.data.cells;
  const points = cells.map(toMapPoint);
  const captainCount = cells.reduce((sum, cell) => sum + cell.captainCount, 0);
  const freshCount = cells.reduce((sum, cell) => sum + cell.freshCount, 0);
  const staleCount = cells.reduce((sum, cell) => sum + cell.staleCount, 0);
  const lostCount = cells.reduce((sum, cell) => sum + cell.lostCount, 0);

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Text role="titleMd">خريطة المناطق التشغيلية</Text>
          <Text role="body" tone="muted">
            الخلايا مشتقة server-side من آخر موقع لكل كابتن ذي تعيين مقبول؛ الخريطة والجدول أدناه يستهلكان نفس response فقط.
          </Text>
        </div>
        <CpButton variant="secondary" onClick={() => void load()}>تحديث</CpButton>
      </div>

      <CpKpiStrip>
        <CpKpiCard label="الخلايا" value={state.data.totalCells.toLocaleString('ar-YE')} />
        <CpKpiCard label="الكباتن" value={captainCount.toLocaleString('ar-YE')} />
        <CpKpiCard label="مواقع حديثة" value={freshCount.toLocaleString('ar-YE')} />
        <CpKpiCard label="متأخرة/مفقودة" value={(staleCount + lostCount).toLocaleString('ar-YE')} />
      </CpKpiStrip>

      <GoogleMapsWebCanvas
        points={points}
        ariaLabel="خريطة كثافة مواقع الكباتن في العمليات"
        height={480}
      />

      <Card style={{ padding: '1rem', overflowX: 'auto' }}>
        <Text role="titleSm" style={{ marginBottom: '0.75rem' }}>تمثيل وصولي للخلايا نفسها</Text>
        <CpTable aria-label="جدول خلايا خريطة العمليات">
          <thead>
            <tr>
              <CpTableHeaderCell>الخلية</CpTableHeaderCell>
              <CpTableHeaderCell>الإحداثيات</CpTableHeaderCell>
              <CpTableHeaderCell>الكباتن</CpTableHeaderCell>
              <CpTableHeaderCell>حديث</CpTableHeaderCell>
              <CpTableHeaderCell>متأخر</CpTableHeaderCell>
              <CpTableHeaderCell>مفقود</CpTableHeaderCell>
              <CpTableHeaderCell>الحالة</CpTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {cells.map((cell) => (
              <tr key={cell.cellKey}>
                <CpTableCell><span dir="ltr">{cell.cellKey}</span></CpTableCell>
                <CpTableCell><span dir="ltr">{cell.centerLatitude.toFixed(5)}, {cell.centerLongitude.toFixed(5)}</span></CpTableCell>
                <CpTableCell>{cell.captainCount.toLocaleString('ar-YE')}</CpTableCell>
                <CpTableCell>{cell.freshCount.toLocaleString('ar-YE')}</CpTableCell>
                <CpTableCell>{cell.staleCount.toLocaleString('ar-YE')}</CpTableCell>
                <CpTableCell>{cell.lostCount.toLocaleString('ar-YE')}</CpTableCell>
                <CpTableCell><CpBadge tone={freshnessTone(cell)}>{freshnessLabel(cell)}</CpBadge></CpTableCell>
              </tr>
            ))}
          </tbody>
        </CpTable>
      </Card>
    </div>
  );
}

export default OperationsHeatmapScreen;
