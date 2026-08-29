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
