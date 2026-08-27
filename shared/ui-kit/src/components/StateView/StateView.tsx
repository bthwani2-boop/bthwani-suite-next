"use client";

import type { ReactNode } from "react";
import { Spinner } from "tamagui";
import { Block } from "../_shared";
import { Button } from "../Button";
import { Surface } from "../Surface";
import { Text } from "../Text";

export type StateTone = "neutral" | "info" | "success" | "warning" | "danger";
export type StateViewId = "loading" | "empty" | "offline" | "recoverableError";

export type StateViewProps = {
  title: string;
  description?: string | undefined;
  /**
   * Semantic state identifier used by shared surface registries. Explicit
   * tone/loading props still take precedence when a caller needs a custom
   * presentation.
   */
  stateId?: StateViewId | undefined;
  tone?: StateTone | undefined;
  loading?: boolean | undefined;
  icon?: ReactNode | undefined;
  actionLabel?: string | undefined;
  onActionPress?: (() => void) | undefined;
  /** Stable reason code shown as a support reference, e.g. `CHECKLIST_INCOMPLETE`. */
  code?: string | undefined;
  /** Secondary affordance, e.g. "contact support" beside a retry. */
  secondaryActionLabel?: string | undefined;
  onSecondaryActionPress?: (() => void) | undefined;
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
  tone,
  loading,
  icon,
  actionLabel,
  onActionPress,
  code,
  secondaryActionLabel,
  onSecondaryActionPress
}: StateViewProps) {
  const semanticPresentation = stateId ? STATE_PRESENTATION[stateId] : undefined;
  const resolvedTone = tone ?? semanticPresentation?.tone ?? "neutral";
  const resolvedLoading = loading ?? semanticPresentation?.loading ?? false;
  const surfaceTone = resolvedTone === "neutral" ? "inset" : resolvedTone;
  // A colour change alone is not perceivable feedback: announce the state and
  // keep the reason code readable as text.
  const isUrgent = resolvedTone === "danger" || resolvedTone === "warning";
  const announcement = [title, description, code ? `رمز السبب: ${code}` : null]
    .filter(Boolean)
    .join(". ");

  return (
    <Surface tone={surfaceTone} centered padding="$6" width="100%">
      <Block
        alignItems="center"
        gap="$3"
        maxWidth={520}
        aria-live={isUrgent ? "assertive" : "polite"}
      >
        {resolvedLoading ? <Spinner size="large" color="$action" /> : icon}
        <Block
          accessible
          role={isUrgent ? "alert" : undefined}
          aria-label={announcement}
          alignItems="center"
          gap="$2"
        >
          <Text role="titleMd" align="center">{title}</Text>
          {description ? <Text role="body" tone="secondary" align="center">{description}</Text> : null}
          {code ? <Text role="caption" tone="secondary" align="center">{`رمز السبب: ${code}`}</Text> : null}
        </Block>
        {actionLabel && onActionPress ? (
          <Button
            label={actionLabel}
            tone={resolvedTone === "danger" ? "danger" : "primary"}
            onPress={onActionPress}
            fullWidth={false}
          />
        ) : null}
        {secondaryActionLabel && onSecondaryActionPress ? (
          <Button
            label={secondaryActionLabel}
            tone="ghost"
            onPress={onSecondaryActionPress}
            fullWidth={false}
          />
        ) : null}
      </Block>
    </Surface>
  );
}
