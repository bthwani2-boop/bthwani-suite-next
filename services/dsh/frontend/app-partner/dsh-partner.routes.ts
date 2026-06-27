// app-partner — dsh-partner.routes.ts
// Configuration for partner routing, screen registry, and types.
// No JSX. No ui-kit.

export type DshPartnerRoute =
  | 'store'
  | 'onboarding'
  | 'catalog'
  | 'orders'
  | 'support'
  | 'performance'
  | 'settlement'
  | 'documents'
  | 'requirements';

export type DshPartnerRouteState =
  | { kind: 'store' }
  | { kind: 'onboarding' }
  | { kind: 'catalog' }
  | { kind: 'orders' }
  | { kind: 'support' }
  | { kind: 'performance' }
  | { kind: 'settlement'; orderId?: string }
  | { kind: 'documents' }
  | { kind: 'requirements' };

export type DshPartnerNavigationCommand = {
  token: number;
  target: DshPartnerRoute;
  orderId?: string;
};

export type DshPartnerSurfaceProps = {
  command?: DshPartnerNavigationCommand;
  onExit?: () => void;
};
