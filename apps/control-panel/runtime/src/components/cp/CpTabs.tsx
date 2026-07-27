import { cpRadius, cpType } from "./cpScale";
import { useCpTokens } from "./cpTokens";

/**
 * CpTabs — token-driven tab strip. Replaces hand-rolled tab buttons across
 * dashboard/overview screens with a single implementation backed by the
 * shared chip tokens.
 */
export type CpTabItem = { readonly value: string; readonly label: string };

export function CpTabs({
  items,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  readonly items: readonly CpTabItem[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly "aria-label"?: string;
}) {
  const { tokens } = useCpTokens();
  return (
    <div role="tablist" aria-label={ariaLabel} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      {items.map((item) => {
        const selected = item.value === value;
        const chip = selected ? tokens.components.chips.selected : tokens.components.chips.default;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: cpRadius.pill,
              fontSize: cpType.body.fontSize,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: chip.backgroundColor,
              border: `1px solid ${chip.borderColor}`,
              color: chip.textColor,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
