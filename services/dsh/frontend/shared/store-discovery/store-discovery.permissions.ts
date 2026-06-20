export type DshClientContext = {
  readonly isAuthenticated: boolean;
};

export function canViewStores(_ctx: DshClientContext): boolean {
  return true;
}
