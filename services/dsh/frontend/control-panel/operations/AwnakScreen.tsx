'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AWNAK_STAGE_LABELS } from '../../shared/orders';
import { OperatorSpecialRequestsWorkbench } from '../../shared/special-requests';

export type AwnakScreenProps = {
  hubHref?: string;
  subGroup?: string;
  focusParams?: any;
};

const STAGE_ORDER = Object.keys(AWNAK_STAGE_LABELS) as Array<keyof typeof AWNAK_STAGE_LABELS>;

export function AwnakScreen({ focusParams }: AwnakScreenProps) {
  return (
    <OperatorSpecialRequestsWorkbench
      requestType="AWNAK_ERRAND"
      title="عونك — العمليات"
      stageLabels={AWNAK_STAGE_LABELS}
      stageOrder={STAGE_ORDER}
      focusParams={focusParams}
    />
  );
}

export default AwnakScreen;
