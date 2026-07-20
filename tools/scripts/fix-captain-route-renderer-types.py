from pathlib import Path

PATH = Path("services/dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx")
text = PATH.read_text(encoding="utf-8")

text = text.replace('import type { IconName } from "@bthwani/ui-kit";\n', '')
text = text.replace(
    'import type { DshCaptainOrderBellItem } from "../shared/orders";\n',
    'import type { DshCaptainOrderBellItem, DshCaptainOrdersScreenState } from "../shared/orders";\n',
)
text = text.replace(
    'type CaptainOrdersInboxScreenState = NonNullable<\n  React.ComponentProps<typeof CaptainOrdersInboxScreen>["state"]\n>;\n',
    'type CaptainOrdersInboxScreenState = DshCaptainOrdersScreenState;\n',
)
text = text.replace(
    'type PodScreenState = NonNullable<\n  React.ComponentProps<typeof DshCaptainPoDSubmissionScreen>["state"]\n>;\n',
    'type PodScreenState = NonNullable<React.ComponentProps<typeof DshCaptainPoDSubmissionScreen>["state"]>;\n'
    'type IconName = React.ComponentProps<typeof Icon>["name"];\n',
)

PATH.write_text(text, encoding="utf-8")
