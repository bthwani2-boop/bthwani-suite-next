"use client";

import type { ReactNode } from "react";
import { ScrollView } from "tamagui";
import { asUiComponent } from "../../internal/tamagui-compat";
import { Inline } from "../_shared";
import { Chip } from "../Chip/Chip";

const HorizontalScroll = asUiComponent(ScrollView);

export type FilterBarProps = {
  children?: ReactNode;
  trailing?: ReactNode;
};

export function FilterBar({ children, trailing }: FilterBarProps) {
  return (
    <Inline width="100%" justifyContent="space-between">
      <HorizontalScroll horizontal showsHorizontalScrollIndicator={false} flex={1}>
        <Inline paddingVertical="$1" paddingHorizontal="$1">{children}</Inline>
      </HorizontalScroll>
      {trailing}
    </Inline>
  );
}

export type FilterRailItem = {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
};

export type FilterRailProps = {
  readonly items: readonly FilterRailItem[];
  readonly selectedId: string;
  readonly onChange: (id: string) => void;
};

export function FilterRail({ items, selectedId, onChange }: FilterRailProps) {
  return (
    <FilterBar>
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <Chip
            key={item.id}
            label={item.label}
            icon={item.icon}
            selected={isSelected}
            onPress={() => onChange(item.id)}
          />
        );
      })}
    </FilterBar>
  );
}
