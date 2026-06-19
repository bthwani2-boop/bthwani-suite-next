import type { ComponentType } from "react";
import { styled } from "tamagui";

export type FlexibleUiComponent = ComponentType<Record<string, unknown>>;

const styledFactory = styled as unknown as (
  component: unknown,
  configuration: Record<string, unknown>
) => unknown;

export function createUiStyled(
  component: unknown,
  configuration: Record<string, unknown>
): FlexibleUiComponent {
  return styledFactory(component, configuration) as FlexibleUiComponent;
}

export function asUiComponent(component: unknown): FlexibleUiComponent {
  return component as FlexibleUiComponent;
}

export function asUiCompoundComponent<const TKey extends string>(
  component: unknown,
  _keys: readonly TKey[]
): FlexibleUiComponent & Record<TKey, FlexibleUiComponent> {
  return component as FlexibleUiComponent & Record<TKey, FlexibleUiComponent>;
}
