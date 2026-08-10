"use client";

// control-panel — ControlPanelFieldProblemPanel
//
// Operator/support-side rendering of a governed field failure. The operator
// must see the same reason code the employee saw, plus the correlation id, so
// a support ticket can be traced without exposing session tokens or secrets.
// Mirrors `DshFieldProblemNotice` on app-field: one backend reason code, one
// explanation, on every surface.
import type { ReactNode } from "react";
import { CpStatePanel } from "@bthwani/control-panel/components";
import {
  buildGovernedProblemView,
  type GovernedProblem,
} from "../../shared/field-readiness";

export type ControlPanelFieldProblemPanelProps = {
  readonly problem: GovernedProblem;
  /** Overrides the kind-derived title when the surrounding context needs one. */
  readonly title?: string;
  readonly children?: ReactNode;
};

export function ControlPanelFieldProblemPanel({
  problem,
  title,
  children,
}: ControlPanelFieldProblemPanelProps) {
  const view = buildGovernedProblemView(problem);
  // The reason code belongs in the `code` slot; putting the message there
  // leaves operators without the code they need to escalate.
  const reference = view.correlationId
    ? `${view.code} · ${view.correlationId}`
    : view.code;

  return (
    <CpStatePanel
      role="alert"
      title={title ?? view.title}
      description={view.description}
      code={reference}
    >
      {children}
    </CpStatePanel>
  );
}
