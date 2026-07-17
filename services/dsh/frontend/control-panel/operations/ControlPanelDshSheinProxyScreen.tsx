'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SHEIN_PROXY_STAGE_LABELS } from '../../shared/orders';
import { OperatorSpecialRequestsWorkbench } from '../../shared/special-requests';

export type ControlPanelDshSheinProxyScreenProps = {
  hubHref?: string;
  subGroup?: string;
  focusParams?: any;
};

const STAGE_ORDER = Object.keys(SHEIN_PROXY_STAGE_LABELS) as Array<keyof typeof SHEIN_PROXY_STAGE_LABELS>;

export function ControlPanelDshSheinProxyScreen({ focusParams }: ControlPanelDshSheinProxyScreenProps) {
  return (
    <OperatorSpecialRequestsWorkbench
      requestType="SHEIN_ASSISTED_PURCHASE"
      title="شي إن — عمليات الوكالة"
      stageLabels={SHEIN_PROXY_STAGE_LABELS}
      stageOrder={STAGE_ORDER}
      focusParams={focusParams}
    />
  );
}

export default ControlPanelDshSheinProxyScreen;
