from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace(relative: str, old: str, new: str) -> None:
    target = ROOT / relative
    text = target.read_text(encoding="utf-8")
    if old in text:
        target.write_text(text.replace(old, new, 1), encoding="utf-8")
        return
    if new not in text:
        raise RuntimeError(f"missing import isolation anchor: {relative}")


replace(
    "services/dsh/frontend/app-partner/DshPartnerSurface.tsx",
    "import { PlatformVarsProvider, FeatureFlagProvider, usePlatformVars } from '../shared/platform';",
    "import { FeatureFlagProvider } from '../shared/platform/FeatureFlagProvider';\nimport { PlatformVarsProvider, usePlatformVars } from '../shared/platform/PlatformVarsProvider';",
)

replace(
    "services/dsh/frontend/app-partner/account/PartnerSupportScreen.tsx",
    '''import {
  TICKET_CATEGORY_LABELS,
  usePartnerSupportController,
  type DshCreateTicketInput,
  type DshSupportTicket,
  type DshTicketCategory,
  type DshTicketPriority,
} from "../../shared/support";''',
    '''import {
  TICKET_CATEGORY_LABELS,
  type DshCreateTicketInput,
  type DshSupportTicket,
  type DshTicketCategory,
  type DshTicketPriority,
} from "../../shared/support/support.types";
import { usePartnerSupportController } from "../../shared/support/use-partner-support-controller";''',
)

replace(
    "services/dsh/frontend/app-partner/orders/PartnerOrderActionPanel.tsx",
    "import type { DshFulfillmentDeliveryMode } from '../../shared/delivery';",
    "import type { DshFulfillmentDeliveryMode } from '../../shared/delivery/delivery.contract';",
)

Path(__file__).unlink()
