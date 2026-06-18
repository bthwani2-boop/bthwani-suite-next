import type { ReactNode } from "react";
import { Spinner } from "tamagui";
import { Block } from "../_shared";
import { Button } from "../Button";
import { Surface } from "../Surface";
import { Text } from "../Text";

export type StateTone = "neutral" | "info" | "success" | "warning" | "danger";

export type StateViewProps = {
  title: string;
  description?: string;
  tone?: StateTone;
  loading?: boolean;
  icon?: ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function StateView({
  title,
  description,
  tone = "neutral",
  loading,
  icon,
  actionLabel,
  onActionPress
}: StateViewProps) {
  const surfaceTone = tone === "neutral" ? "inset" : tone;
  return (
    <Surface tone={surfaceTone} centered padding="$6" width="100%">
      <Block alignItems="center" gap="$3" maxWidth={520}>
        {loading ? <Spinner size="large" color="$action" /> : icon}
        <Text role="titleMd" align="center">{title}</Text>
        {description ? <Text role="body" tone="secondary" align="center">{description}</Text> : null}
        {actionLabel && onActionPress ? (
          <Button label={actionLabel} tone={tone === "danger" ? "danger" : "primary"} onPress={onActionPress} fullWidth={false} />
        ) : null}
      </Block>
    </Surface>
  );
}
