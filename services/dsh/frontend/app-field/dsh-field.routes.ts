// app-field — dsh-field.routes.ts
// Configuration for routing, screen registry, and types.
// No JSX. No ui-kit.

import type { DshPartnerSummary } from '../shared/partner';

export type DshFieldRoute =
  | 'stores'
  | 'onboarding'
  | 'partner-progress'
  | 'visit'
  | 'verification'
  | 'checklist'
  | 'account'
  | 'profile'
  | 'history'
  | 'finance'
  | 'escalation'
  | 'work-queue'
  | 'products-upload';

export type DshFieldRouteState =
  | { kind: 'stores' }
  | { kind: 'onboarding'; partnerId?: string }
  | { kind: 'partner-progress'; partnerId: string }
  | { kind: 'visit'; storeId: string }
  // Self-resolves the field actor's own scoped store — takes no storeId param.
  | { kind: 'verification' }
  | { kind: 'checklist'; visitId: string; storeId: string }
  | { kind: 'account' }
  | { kind: 'profile' }
  | { kind: 'history' }
  | { kind: 'finance' }
  | { kind: 'escalation'; storeId: string; visitId?: string }
  // Self-resolves the field actor's own open visits/escalations across stores.
  | { kind: 'work-queue' }
  | { kind: 'products-upload'; partnerId: string };

export type DshFieldNavigationCommand = {
  token: number;
  target: DshFieldRoute;
  storeId?: string;
  partnerId?: string;
  visitId?: string;
};

export type DshFieldSurfaceProps = {
  command?: DshFieldNavigationCommand;
  onExit?: () => void;
};
