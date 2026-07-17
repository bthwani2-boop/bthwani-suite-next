'use client';

import React from 'react';
import { SpecialOpsWorkbenchScreen } from './SpecialOpsWorkbenchScreen';

export function ControlPanelDshSheinProxyScreen(props: any) {
  return (
    <SpecialOpsWorkbenchScreen
      {...props}
      subGroup="shein"
    />
  );
}
