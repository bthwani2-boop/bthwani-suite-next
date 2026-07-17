'use client';

import React from 'react';
import { SpecialOpsWorkbenchScreen } from './SpecialOpsWorkbenchScreen';

export function AwnakScreen(props: any) {
  return (
    <SpecialOpsWorkbenchScreen
      {...props}
      subGroup="awnak"
    />
  );
}
