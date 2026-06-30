export type TabItem<TId extends string = string> = {
    id: TId;
    label: string;
    disabled?: boolean;
};
export type TabsProps<TId extends string = string> = {
    items: readonly TabItem<TId>[];
    value: TId;
    onValueChange: (value: TId) => void;
    accessibilityLabel?: string;
};
export declare function Tabs<TId extends string>({ items, value, onValueChange, accessibilityLabel }: TabsProps<TId>): import("react").JSX.Element;
//# sourceMappingURL=Tabs.d.ts.map