import type { ReactNode } from "react";
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
export declare function DataTable<TRow>({ columns, rows, getRowKey, emptyTitle, onRowPress }: DataTableProps<TRow>): import("react").JSX.Element;
//# sourceMappingURL=DataTable.d.ts.map