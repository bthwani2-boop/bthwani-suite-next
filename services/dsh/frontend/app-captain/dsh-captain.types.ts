import type { DshCaptainRoute } from "../shared/delivery";
import type { DshCaptainNavigation, DshCaptainNavigationRoute } from "./captain-navigation";

export type { DshCaptainRoute };

export type DshCaptainSurfaceProps = {
  readonly route: DshCaptainNavigationRoute;
  readonly navigation: DshCaptainNavigation;
  readonly captainId?: string;
  readonly onExit?: () => void;
  readonly onOpenService?: (serviceId: string) => void;
  readonly walletBalanceLabel?: string;
};

export type {
  DshCaptainState,
  DshCaptainStateGroup,
  DshCaptainStateMeta,
} from "../shared/delivery";

export type {
  DshCaptainProfileSnapshot,
} from "./dsh-captain-binding.contracts";
