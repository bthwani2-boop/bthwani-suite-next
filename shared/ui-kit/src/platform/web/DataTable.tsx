import type { ReactNode } from "react";
import { lightThemeColors } from "../../tokens/colors";

export type DataTableColumn<T extends Record<string, unknown>> = {
  readonly key: keyof T & string;
  readonly label: string;
  readonly render?: (value: T[keyof T], row: T) => ReactNode;
};

export type DataTableProps<T extends Record<string, unknown>> = {
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly onRowAction?: (row: T) => void;
  readonly rowActionLabel?: string;
};

const TH_STYLE = {
  padding: "0.5rem 0.75rem",
  textAlign: "start" as const,
  fontSize: "0.75rem",
  fontWeight: 600,
  opacity: 0.7,
  borderBottom: `1px solid ${lightThemeColors.borderColor}`,
  whiteSpace: "nowrap" as const,
};

const TD_STYLE = {
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  borderBottom: `1px solid ${lightThemeColors.borderColor}`,
  verticalAlign: "middle" as const,
};

export function DataTable<T extends Record<string, unknown>>({ columns, rows, onRowAction, rowActionLabel }: DataTableProps<T>) {
  const hasActions = Boolean(onRowAction && rowActionLabel);
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", background: lightThemeColors.surface }}
        aria-label="table"
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={TH_STYLE}>{col.label}</th>
            ))}
            {hasActions && <th style={TH_STYLE}>{rowActionLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (hasActions ? 1 : 0)} style={{ ...TD_STYLE, textAlign: "center", opacity: 0.5 }}>
                لا توجد بيانات
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : lightThemeColors.surfaceRaised }}>
                {columns.map((col) => (
                  <td key={col.key} style={TD_STYLE}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "")}
                  </td>
                ))}
                {hasActions && onRowAction && (
                  <td style={TD_STYLE}>
                    <button
                      type="button"
                      onClick={() => onRowAction(row)}
                      style={{ fontSize: "0.8125rem", cursor: "pointer", background: "transparent", border: "none", color: lightThemeColors.action, padding: "0.25rem 0.5rem" }}
                    >
                      {rowActionLabel}
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
