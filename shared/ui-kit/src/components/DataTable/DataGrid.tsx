"use client";

import { ReactNode } from "react";
import { Block, Inline } from "../_shared";
import { EmptyState } from "../EmptyState";
import { Text } from "../Text";
import { Checkbox } from "../Checkbox";
import { Button } from "../Button";

export type DataGridColumn<TRow> = {
  key: string;
  header: string;
  width?: number | string;
  minWidth?: number | string;
  flex?: number;
  sortable?: boolean;
  pinned?: "left" | "right";
  render: (row: TRow) => ReactNode;
};

export type DataGridProps<TRow> = {
  columns: readonly DataGridColumn<TRow>[];
  rows: readonly TRow[];
  getRowKey: (row: TRow) => string;
  emptyTitle?: string;
  emptyMessage?: string;
  onRowPress?: (row: TRow) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  selectedRowKeys?: Set<string>;
  onSelectionChange?: (selectedKeys: Set<string>) => void;
  batchActions?: ReactNode;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (key: string, direction: "asc" | "desc") => void;
  rowActions?: (row: TRow) => ReactNode;
};

export function DataGrid<TRow>({
  columns,
  rows,
  getRowKey,
  emptyTitle = "لا توجد بيانات",
  emptyMessage,
  onRowPress,
  isLoading = false,
  error,
  onRefresh,
  selectedRowKeys,
  onSelectionChange,
  batchActions,
  page,
  totalPages,
  onPageChange,
  sortBy,
  sortDirection,
  onSortChange,
  rowActions,
}: DataGridProps<TRow>) {
  if (error) {
    return (
      <Block padding="$6" alignItems="center" justifyContent="center" gap="$4">
        <Text tone="danger">حدث خطأ أثناء تحميل البيانات.</Text>
        <Text tone="secondary">{error.message}</Text>
        {onRefresh ? <Button onPress={onRefresh}>إعادة المحاولة</Button> : null}
      </Block>
    );
  }

  if (isLoading && rows.length === 0) {
    return (
      <Block padding="$6" alignItems="center" justifyContent="center">
        <Text tone="secondary">جاري التحميل...</Text>
      </Block>
    );
  }

  const rowKeys = rows.map(getRowKey);
  const selectedOnPage = selectedRowKeys
    ? rowKeys.filter((key) => selectedRowKeys.has(key)).length
    : 0;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  const isIndeterminate = selectedOnPage > 0 && !allSelected;
  const currentPage = page ?? 1;

  return (
    <Block
      width="100%"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$lg"
      overflow="hidden"
      gap={0}
      style={{ position: "relative" }}
    >
      {selectedRowKeys && selectedRowKeys.size > 0 && batchActions ? (
        <Inline
          backgroundColor="$surfaceInset"
          padding="$2"
          gap="$4"
          alignItems="center"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Text tone="action">{selectedRowKeys.size} محدد</Text>
          {batchActions}
        </Inline>
      ) : null}

      <Inline backgroundColor="$surfaceInset" padding="$3" gap="$3" alignItems="center">
        {onSelectionChange ? (
          <Block width={40}>
            <Checkbox
              checked={allSelected}
              indeterminate={isIndeterminate}
              aria-label="تحديد جميع الصفوف في الصفحة الحالية"
              onChange={(event) => {
                const next = new Set(selectedRowKeys ?? []);
                if (event.target.checked) {
                  for (const key of rowKeys) next.add(key);
                } else {
                  for (const key of rowKeys) next.delete(key);
                }
                onSelectionChange(next);
              }}
            />
          </Block>
        ) : null}
        {columns.map((column) => (
          <Block
            key={column.key}
            flex={column.flex ?? (column.width ? undefined : 1)}
            width={column.width}
            style={{
              minWidth: column.minWidth,
              position: column.pinned ? "sticky" : "static",
              left: column.pinned === "left" ? 0 : undefined,
              right: column.pinned === "right" ? 0 : undefined,
            }}
          >
            {column.sortable && onSortChange ? (
              <Inline
                gap="$1"
                alignItems="center"
                accessibilityRole="button"
                accessibilityLabel={`ترتيب حسب ${column.header}`}
                style={{ cursor: "pointer" }}
                onPress={() => {
                  if (sortBy === column.key) {
                    onSortChange(column.key, sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    onSortChange(column.key, "asc");
                  }
                }}
              >
                <Text role="label" tone="secondary">
                  {column.header}
                </Text>
                {sortBy === column.key ? (
                  <Text tone="secondary">{sortDirection === "asc" ? "↑" : "↓"}</Text>
                ) : null}
              </Inline>
            ) : (
              <Text role="label" tone="secondary">
                {column.header}
              </Text>
            )}
          </Block>
        ))}
        {rowActions ? <Block width={48} /> : null}
      </Inline>

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyMessage} />
      ) : (
        rows.map((row) => {
          const rowKey = getRowKey(row);
          return (
            <Inline
              key={rowKey}
              padding="$3"
              gap="$3"
              borderTopWidth={1}
              borderTopColor="$borderColor"
              hoverStyle={{ backgroundColor: "$surfaceInset" }}
              onPress={onRowPress ? () => onRowPress(row) : undefined}
              accessibilityRole={onRowPress ? "button" : undefined}
              style={{ opacity: isLoading ? 0.5 : 1 }}
            >
              {onSelectionChange ? (
                <Block width={40} onPress={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedRowKeys?.has(rowKey) ?? false}
                    aria-label={`تحديد الصف ${rowKey}`}
                    onChange={(event) => {
                      const next = new Set(selectedRowKeys ?? []);
                      if (event.target.checked) next.add(rowKey);
                      else next.delete(rowKey);
                      onSelectionChange(next);
                    }}
                  />
                </Block>
              ) : null}
              {columns.map((column) => (
                <Block
                  key={column.key}
                  flex={column.flex ?? (column.width ? undefined : 1)}
                  width={column.width}
                  style={{
                    minWidth: column.minWidth,
                    position: column.pinned ? "sticky" : "static",
                    left: column.pinned === "left" ? 0 : undefined,
                    right: column.pinned === "right" ? 0 : undefined,
                  }}
                >
                  {column.render(row)}
                </Block>
              ))}
              {rowActions ? (
                <Block
                  width={48}
                  alignItems="center"
                  justifyContent="center"
                  onPress={(event) => event.stopPropagation()}
                >
                  {rowActions(row)}
                </Block>
              ) : null}
            </Inline>
          );
        })
      )}

      {onPageChange && totalPages !== undefined && totalPages > 1 ? (
        <Inline
          padding="$3"
          justifyContent="center"
          alignItems="center"
          gap="$4"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <Button
            tone="ghost"
            disabled={currentPage <= 1 || isLoading}
            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            السابق
          </Button>
          <Text>
            {currentPage} / {totalPages}
          </Text>
          <Button
            tone="ghost"
            disabled={currentPage >= totalPages || isLoading}
            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            التالي
          </Button>
        </Inline>
      ) : null}
    </Block>
  );
}
