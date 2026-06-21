import type { ReactNode } from "react";
import type { ControlPanelSection } from "./ControlPanelSectionRegistry";

export type ControlPanelNavigationItem = {
  readonly section: ControlPanelSection;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly badge?: ReactNode;
  readonly disabled?: boolean;
};

export type ControlPanelNavigationProps = {
  readonly items: ReadonlyArray<ControlPanelNavigationItem>;
  readonly activeSection?: ControlPanelSection;
  readonly onSectionPress?: (section: ControlPanelSection) => void;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly dir?: "ltr" | "rtl";
};

export function ControlPanelNavigation({
  items,
  activeSection,
  onSectionPress,
  header,
  footer,
  dir = "rtl",
}: ControlPanelNavigationProps) {
  return (
    <nav
      dir={dir}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
      aria-label="قائمة لوحة التحكم"
    >
      {header != null ? <div style={{ flexShrink: 0 }}>{header}</div> : null}
      <ul style={{ flex: 1, listStyle: "none", margin: 0, padding: 0, overflowY: "auto" }}>
        {items.map((item) => (
          <li key={item.section}>
            <button
              type="button"
              disabled={item.disabled ?? false}
              aria-current={activeSection === item.section ? "page" : undefined}
              aria-disabled={item.disabled ?? false}
              onClick={() => { onSectionPress?.(item.section); }}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                background: "none",
                border: "none",
                cursor: (item.disabled ?? false) ? "not-allowed" : "pointer",
                textAlign: "inherit",
              }}
            >
              {item.icon != null ? <span aria-hidden="true">{item.icon}</span> : null}
              <span>{item.label}</span>
              {item.badge != null ? <span>{item.badge}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {footer != null ? <div style={{ flexShrink: 0 }}>{footer}</div> : null}
    </nav>
  );
}
