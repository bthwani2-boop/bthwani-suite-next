'use client';

import { useControlPanelSession } from '../session/control-panel-session';
import type { CanonicalOperationsGroupId } from './operations.types';

type ReadRequirement = {
  readonly actions: readonly string[];
};

function resolveReadRequirement(
  group: CanonicalOperationsGroupId,
  subGroup?: string,
): ReadRequirement {
  if