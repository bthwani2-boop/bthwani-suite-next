import React from 'react';
export type KeyValueItem = {
    label: string;
    value: string;
    tone?: "default" | "success" | "warning" | "danger" | "info" | "action" | "secondary" | "muted" | "inverse" | "brand" | undefined;
};
export type KeyValueListProps = {
    items: readonly KeyValueItem[];
    dense?: boolean;
};
export declare function KeyValueList({ items, dense }: KeyValueListProps): React.JSX.Element;
//# sourceMappingURL=KeyValueList.d.ts.map