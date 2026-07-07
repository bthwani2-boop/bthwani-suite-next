import type {
  DshCaptainRoute,
  DshCaptainCommandTarget,
} from '../shared/delivery';

export type { DshCaptainRoute, DshCaptainCommandTarget };

export type DshCaptainNavigationCommand = {
  token: number;
  target: DshCaptainCommandTarget;
};

export type DshCaptainSurfaceProps = {
  command: DshCaptainNavigationCommand;
  captainId?: string;
  onExit?: () => void;
  onOpenService?: (serviceId: string) => void;
  walletBalanceLabel?: string;
};

export type {
  DshCaptainState,
  DshCaptainStateGroup,
  DshCaptainStateMeta,
} from '../shared/delivery';

export type {
  DshCaptainProfileSnapshot,
} from './dsh-captain-binding.contracts';
