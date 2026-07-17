"use client";

import type { ReactNode } from "react";
import { Spinner } from "tamagui";
import { Block } from "../_shared";
import { Button } from "../Button";
import { Surface } from "../Surface";
import { Text } from "../Text";

export type StateTone = "neutral" | "info" | "success" | "warning" | "danger";
export type StateViewId = "loading" | "empty" | "offline" | "recoverableError";
export type StateViewKind = "warning";

export type StateViewProps = {
  title: string;
  description?: string | undefined;
  /**
   * Semantic state identifier used by shared surface registries. Explicit
   * tone/loading props still take precedence when a caller needs a custom
   * presentation.
   */
  stateId?: StateViewId | undefined;
  /** Compatibility with governed state-copy records that classify warnings. */
  kind?: StateViewKind | undefined;
  tone?: StateTone | undefined;
  loading?: boolean | undefined;
  icon?: ReactNode | undefined;
  actionLabel?: string | undefined;
  onActionPress?: (() => void) | undefined;
};

const STATE_PRESENTATION: Readonly<Record<StateViewId, {
  tone: StateTone;
  loading: boolean;
}>> = {
  loading: { tone: "info", loading: true },
  empty: { tone: "neutral", loading: false },
  offline: { tone: "warning", loading: false },
  recoverableError: { tone: "danger", loading: false },
};

export function StateView({
  title,
  description,
  stateId,
  kind,
  tone,
  loading,
  icon,
  actionLabel,
  onActionPress
}: StateViewProps) {
  const semanticPresentation = stateId ? STATE_PRESENTATION[stateId] : undefined;
  const resolvedTone = tone ?? (kind === "warning" ? "warning" : semanticPresentation?.tone) ?? "neutral";
  const resolvedLoading = loading ?? semanticPresentation?.loading ?? false;
  const surfaceTone = resolvedTone === "neutral" ? "inset" : resolvedTone;

  return (
    <Surface tone={surfaceTone} centered padding="$6" width="100%">
      <Block alignItems="center" gap="$3" maxWidth={520}>
        {resolvedLoading ? <Spinner size="large" color="$action" /> : icon}
        <Text role="titleMd" align="center">{title}</Text>
        {description ? <Text role="body" tone="secondary" align="center">{description}</Text> : null}
        {actionLabel && onActionPress ? (
          <Button
            label={actionLabel}
            tone={resolvedTone === "danger" ? "danger" : "primary"}
            onPress={onActionPress}
            fullWidth={false}
          />
        ) : null}
      </Block>
    </Surface>
  );
}
