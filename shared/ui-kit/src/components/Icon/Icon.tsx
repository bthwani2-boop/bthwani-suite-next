// shared/ui-kit — cross-platform Icon contract
import React from "react";
import { colorRoles } from "../../tokens";
import { WebIconRenderer } from "./icon-renderer.web";
import type { IconProps, IconRenderer } from "./icon.types";

export type { IconProps, IconRenderer, IconRendererProps } from "./icon.types";

let activeRenderer: IconRenderer = WebIconRenderer;

/**
 * Registers the renderer owned by a native platform entry point. The web
 * contract remains the default so importing the shared package never loads a
 * native icon module.
 */
export function configureIconRenderer(renderer: IconRenderer): void {
  activeRenderer = renderer;
}

export function Icon({ name, size = 24, tone, color, style, mirrored, accessibilityLabel }: IconProps) {
  let resolvedColor = color;
  if (!resolvedColor && tone) {
    if (tone === 'brand' || tone === 'action') resolvedColor = colorRoles.brandAction;
    else if (tone === 'success') resolvedColor = colorRoles.success;
    else if (tone === 'warning') resolvedColor = colorRoles.warning;
    else if (tone === 'danger') resolvedColor = colorRoles.danger;
    else if (tone === 'muted') resolvedColor = colorRoles.textMuted;
  }
  if (!resolvedColor) {
    resolvedColor = colorRoles.textPrimary;
  }

  const transform = mirrored ? [{ scaleX: -1 }] : undefined;

  return activeRenderer({
    name,
    size,
    color: resolvedColor,
    style: [transform ? { transform } : null, style],
    ...(accessibilityLabel === undefined ? {} : { accessibilityLabel }),
  });
}

export default Icon;
