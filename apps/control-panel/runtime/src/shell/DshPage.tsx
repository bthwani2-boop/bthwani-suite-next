"use client";

import type { ReactNode } from "react";
import { ControlPanelShell } from "./ControlPanelShell";
import { ControlPanelNavigation } from "./ControlPanelNavigation";
import { ControlPanelTopBar } from "./ControlPanelTopBar";
import { useDshNavigation } from "./useDshNavigation";
import type { DshSection } from "./useDshNavigation";

export type DshPageProps = {
  readonly activeSection: DshSection;
  readonly sectionLabel: string;
  readonly children: ReactNode;
  readonly sidePanel?: ReactNode;
  readonly statusBar?: ReactNode;
};

/**
 * Single source of truth for ALL control panel page layouts.
 * Every page must use this — no page assembles its own Shell/Navigation/TopBar.
 */
export function DshPage({
  activeSection,
  sectionLabel,
  children,
  sidePanel,
  statusBar,
}: DshPageProps) {
  const { items, handleSectionPress } = useDshNavigation();

  return (
    <ControlPanelShell
      dir="rtl"
      navigation={
        <ControlPanelNavigation
          dir="rtl"
          items={items}
          activeSection={activeSection}
          onSectionPress={handleSectionPress}
        />
      }
      topBar={
        <ControlPanelTopBar
          title={<strong>لوحة التحكم — DSH</strong>}
          serviceLabel={<span>{sectionLabel}</span>}
        />
      }
      main={children}
      sidePanel={sidePanel}
      statusBar={statusBar}
    />
  );
}
