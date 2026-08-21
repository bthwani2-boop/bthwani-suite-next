// app-field — canonical Expo Router route contract.
// Domain state and server truth remain outside this navigation contract.

export type DshFieldRoute =
  | 'stores'
  | 'onboarding'
  | 'partner-progress'
  | 'visit'
  | 'verification'
  | 'checklist'
  | 'account'
  | 'profile'
  | 'profile-completion'
  | 'finance'
  | 'escalation'
  | 'work-queue'
  | 'products-upload';

export type DshFieldRouteState =
  | { kind: 'stores' }
  | { kind: 'onboarding'; partnerId?: string; assignmentId?: string }
  | { kind: 'partner-progress'; partnerId: string }
  | { kind: 'visit'; storeId: string }
  | { kind: 'verification'; storeId: string; visitId: string }
  | { kind: 'checklist'; visitId: string; storeId: string }
  | { kind: 'account' }
  | { kind: 'profile' }
  | { kind: 'profile-completion' }
  | { kind: 'finance' }
  | { kind: 'escalation'; storeId: string; visitId?: string }
  | { kind: 'work-queue' }
  | { kind: 'products-upload'; partnerId: string };

export type DshFieldNavigationMode = 'push' | 'replace';

export type DshFieldNavigation = {
  readonly navigate: (route: DshFieldRouteState, mode?: DshFieldNavigationMode) => void;
  readonly back: () => void;
};

export type DshFieldSurfaceProps = {
  readonly route: DshFieldRouteState;
  readonly navigation: DshFieldNavigation;
  readonly installationId?: string;
};

function segment(value: string): string {
  return encodeURIComponent(value.trim());
}

function withQuery(path: string, entries: readonly (readonly [string, string | undefined])[]): string {
  const query = entries
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `${path}?${query}` : path;
}

export function dshFieldRouteToPath(route: DshFieldRouteState): string {
  switch (route.kind) {
    case 'stores': return '/';
    case 'onboarding':
      return withQuery(
        route.assignmentId ? `/onboarding/assignments/${segment(route.assignmentId)}` : '/onboarding',
        route.assignmentId ? [] : [['partnerId', route.partnerId]],
      );
    case 'partner-progress': return `/partners/${segment(route.partnerId)}`;
    case 'visit': return `/stores/${segment(route.storeId)}/visit`;
    case 'verification': return `/stores/${segment(route.storeId)}/visits/${segment(route.visitId)}/verification`;
    case 'checklist': return `/stores/${segment(route.storeId)}/visits/${segment(route.visitId)}/checklist`;
    case 'account': return '/account';
    case 'profile': return '/account/profile';
    case 'profile-completion': return '/account/completion';
    case 'finance': return '/finance';
    case 'escalation': return withQuery(`/stores/${segment(route.storeId)}/escalation`, [['visitId', route.visitId]]);
    case 'work-queue': return '/work-queue';
    case 'products-upload': return `/partners/${segment(route.partnerId)}/products`;
  }
}
