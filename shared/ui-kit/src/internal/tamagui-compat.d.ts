import type { ComponentType } from "react";
export type FlexibleUiComponent = ComponentType<Record<string, unknown>>;
export declare function createUiStyled(component: unknown, configuration: Record<string, unknown>): FlexibleUiComponent;
export declare function asUiComponent(component: unknown): FlexibleUiComponent;
export declare function asUiCompoundComponent<const TKey extends string>(component: unknown, _keys: readonly TKey[]): FlexibleUiComponent & Record<TKey, FlexibleUiComponent>;
//# sourceMappingURL=tamagui-compat.d.ts.map