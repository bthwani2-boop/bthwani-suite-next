import type { ReactNode } from "react";
import { ScrollView } from "tamagui";
import { Inline } from "../_shared";

const HorizontalScroll = ScrollView as any;

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
