import type { ReactNode } from "react";
import { Block, Inline } from "../_shared";
import { EmptyState } from "../EmptyState";
import { Text } from "../Text";

export type DataTableColumn<TRow> = {
  key: string;
  header: string;
  width?: number;
  render: (row: TRow) => ReactNode;
};

export type DataTableProps<TRow> = {
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[];
  getRowKey: (row: TRow) => string;
  emptyTitle?: string;
  onRowPress?: (row: TRow) => void;
};

export function DataTable<TRow>({
  columns,
  rows,
  getRowKey,
  emptyTitle = "No rows",
  onRowPress
}: DataTableProps<TRow>) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <Block width="100%" borderWidth={1} borderColor="$borderColor" borderRadius="$lg" overflow="hidden" gap={0}>
      <Inline backgroundColor="$surfaceInset" padding="$3" gap="$3">
        {columns.map((column) => (
          <Block key={column.key} flex={column.width ? undefined : 1} width={column.width}>
            <Text role="label" tone="secondary">{column.header}</Text>
          </Block>
        ))}
      </Inline>
      {rows.map((row) => (
        <Inline
          key={getRowKey(row)}
          padding="$3"
          gap="$3"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          hoverStyle={{ backgroundColor: "$surfaceInset" }}
          onPress={onRowPress ? () => onRowPress(row) : undefined}
          accessibilityRole={onRowPress ? "button" : undefined}
        >
          {columns.map((column) => (
            <Block key={column.key} flex={column.width ? undefined : 1} width={column.width}>
              {column.render(row)}
            </Block>
          ))}
        </Inline>
      ))}
    </Block>
  );
}
