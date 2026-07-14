import type { ReactNode } from "react";
import { Block, Inline } from "../_shared";
import { EmptyState } from "../EmptyState";
import { Text } from "../Text";
import { Checkbox } from "../Checkbox";
import { Button } from "../Button";
import { Icon } from "../Icon";

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

  selectedRowKeys?: Set<string>;
  onSelectionChange?: (selectedKeys: Set<string>) => void;

  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;

  rowActions?: (row: TRow) => ReactNode;
};

export function DataTable<TRow>({
  columns,
  rows,
  getRowKey,
  emptyTitle = "No rows",
  onRowPress,
  selectedRowKeys,
  onSelectionChange,
  page,
  totalPages,
  onPageChange,
  rowActions
}: DataTableProps<TRow>) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <Block width="100%" borderWidth={1} borderColor="$borderColor" borderRadius="$lg" overflow="hidden" gap={0}>
      <Inline backgroundColor="$surfaceInset" padding="$3" gap="$3" alignItems="center">
        {onSelectionChange && (
          <Block width={40}>
            <Checkbox
              checked={selectedRowKeys?.size === rows.length && rows.length > 0}
              onChange={(e) => {
                if (e.target.checked) onSelectionChange(new Set(rows.map(getRowKey)));
                else onSelectionChange(new Set());
              }}
            />
          </Block>
        )}
        {columns.map((column) => (
          <Block key={column.key} flex={column.width ? undefined : 1} width={column.width}>
            <Text role="label" tone="secondary">{column.header}</Text>
          </Block>
        ))}
        {rowActions && <Block width={48} />}
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
          {onSelectionChange && (
            <Block width={40} onPress={(e: any) => e.stopPropagation()}>
              <Checkbox
                checked={selectedRowKeys?.has(getRowKey(row))}
                onChange={(e) => {
                  const s = new Set(selectedRowKeys);
                  if (e.target.checked) s.add(getRowKey(row));
                  else s.delete(getRowKey(row));
                  onSelectionChange(s);
                }}
              />
            </Block>
          )}
          {columns.map((column) => (
            <Block key={column.key} flex={column.width ? undefined : 1} width={column.width}>
              {column.render(row)}
            </Block>
          ))}
          {rowActions && (
            <Block width={48} alignItems="center" justifyContent="center" onPress={(e: any) => e.stopPropagation()}>
              {rowActions(row)}
            </Block>
          )}
        </Inline>
      ))}

      {onPageChange && totalPages && totalPages > 1 && (
        <Inline padding="$3" justifyContent="center" alignItems="center" gap="$4" borderTopWidth={1} borderTopColor="$borderColor">
          <Button
            tone="ghost"
            disabled={page === 1}
            onPress={() => onPageChange(page ? page - 1 : 1)}
          >
            السابق
          </Button>
          <Text>
            {page} / {totalPages}
          </Text>
          <Button
            tone="ghost"
            disabled={page === totalPages}
            onPress={() => onPageChange(page ? page + 1 : 1)}
          >
            التالي
          </Button>
        </Inline>
      )}
    </Block>
  );
}
