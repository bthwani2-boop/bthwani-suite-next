// app-field — dsh-field.routes.ts
// Configuration for routing, screen registry, and types.
// No JSX. No ui-kit.

import type { DshPartnerSummary, DshPartnerDocumentType } from '../shared/partner';

export type DshFieldRoute =
  | 'stores'
  | 'onboarding'
  | 'visit'
  | 'verification'
  | 'checklist'
  | 'account'
  | 'profile'
  | 'history'
  | 'finance'
  | 'escalation'
  | 'document-upload'
  | 'products-upload';

export type DshFieldRouteState =
  | { kind: 'stores' }
  | { kind: 'onboarding'; partnerId?: string }
  | { kind: 'visit'; storeId: string }
  | { kind: 'verification'; storeId: string }
  | { kind: 'checklist'; visitId: string; storeId: string }
  | { kind: 'account' }
  | { kind: 'profile' }
  | { kind: 'history' }
  | { kind: 'finance' }
  | { kind: 'escalation'; storeId: string; visitId?: string }
  | { kind: 'document-upload'; storeId: string; docKind?: DshPartnerDocumentType }
  | { kind: 'products-upload'; storeId: string };

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
