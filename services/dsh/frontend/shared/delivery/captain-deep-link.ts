import type { DshCaptainCommandTarget } from './captain.contract';

const CAPTAIN_DEEP_LINK_PROTOCOL = 'bthwani-captain-next:';

const CAPTAIN_DEEP_LINK_TARGETS: Readonly<Record<string, DshCaptainCommandTarget>> = {
  'captain/dsh': 'home',
  'captain/dsh/orders/map': 'map',
};

export function captainNavigationTargetFromDeepLink(url: string): DshCaptainCommandTarget | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== CAPTAIN_DEEP_LINK_PROTOCOL) return null;
    const path = `${parsed.hostname}${parsed.pathname}`.replace(/^\/+|\/+$/g, '');
    return CAPTAIN_DEEP_LINK_TARGETS[path] ?? null;
  } catch {
    return null;
  }
}
