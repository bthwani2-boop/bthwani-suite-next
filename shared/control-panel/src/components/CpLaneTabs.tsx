import { cpRadius, cpType } from "./cpScale";
import { useCpTokens } from "./cpTokens";

export type CpLaneTabItem = { readonly id: string; readonly label: string; readonly badge?: string; readonly active?: boolean };
export type CpLaneTabsProps = {
  readonly items: readonly CpLaneTabItem[];
  readonly onSelect?: (id: string) => void;
  readonly ariaLabel?: string;
};

export function CpLaneTabs({ items, onSelect, ariaLabel }: CpLaneTabsProps) {
  const { tokens } = useCpTokens();
  return (
    <nav aria-label={ariaLabel} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {items.map((item) => {
        const chip = item.active ? tokens.components.chips.selected : tokens.components.chips.default;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={item.active ? "page" : undefined}
            onClick={() => onSelect?.(item.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              padding: "0.5rem 1rem", borderRadius: cpRadius.pill,
              fontSize: cpType.body.fontSize, fontWeight: 600, cursor: "pointer",
              backgroundColor: chip.backgroundColor, border: `1px solid ${chip.borderColor}`, color: chip.textColor,
            }}
          >
            <span>{item.label}</span>
            {item.badge ? <span style={{ fontSize: cpType.caption.fontSize, padding: "0 0.4rem", borderRadius: cpRadius.pill, background: tokens.accentMuted, color: tokens.accent }}>{item.badge}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

export type CpSubTabItem = { readonly id: string; readonly label: string; readonly active?: boolean };
export type CpSubTabsProps = {
  readonly items: readonly CpSubTabItem[];
  readonly onSelect?: (id: string) => void;
  readonly ariaLabel?: string;
};

export function CpSubTabs({ items, onSelect, ariaLabel }: CpSubTabsProps) {
  const { tokens } = useCpTokens();
  return (
    <nav aria-label={ariaLabel} style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
      {items.map((item) => {
        const chip = item.active ? tokens.components.chips.selected : tokens.components.chips.default;
        return <button key={item.id} type="button" aria-current={item.active ? "page" : undefined} onClick={() => onSelect?.(item.id)} style={{ padding: "0.375rem 0.75rem", borderRadius: cpRadius.sm, fontSize: cpType.label.fontSize, fontWeight: 600, cursor: "pointer", backgroundColor: chip.backgroundColor, border: `1px solid ${chip.borderColor}`, color: chip.textColor }}>{item.label}</button>;
      })}
    </nav>
  );
}
