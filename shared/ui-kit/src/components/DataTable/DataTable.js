"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTable = DataTable;
const _shared_1 = require("../_shared");
const EmptyState_1 = require("../EmptyState");
const Text_1 = require("../Text");
function DataTable({ columns, rows, getRowKey, emptyTitle = "No rows", onRowPress }) {
    if (rows.length === 0)
        return <EmptyState_1.EmptyState title={emptyTitle}/>;
    return (<_shared_1.Block width="100%" borderWidth={1} borderColor="$borderColor" borderRadius="$lg" overflow="hidden" gap={0}>
      <_shared_1.Inline backgroundColor="$surfaceInset" padding="$3" gap="$3">
        {columns.map((column) => (<_shared_1.Block key={column.key} flex={column.width ? undefined : 1} width={column.width}>
            <Text_1.Text role="label" tone="secondary">{column.header}</Text_1.Text>
          </_shared_1.Block>))}
      </_shared_1.Inline>
      {rows.map((row) => (<_shared_1.Inline key={getRowKey(row)} padding="$3" gap="$3" borderTopWidth={1} borderTopColor="$borderColor" hoverStyle={{ backgroundColor: "$surfaceInset" }} onPress={onRowPress ? () => onRowPress(row) : undefined} accessibilityRole={onRowPress ? "button" : undefined}>
          {columns.map((column) => (<_shared_1.Block key={column.key} flex={column.width ? undefined : 1} width={column.width}>
              {column.render(row)}
            </_shared_1.Block>))}
        </_shared_1.Inline>))}
    </_shared_1.Block>);
}
//# sourceMappingURL=DataTable.js.map