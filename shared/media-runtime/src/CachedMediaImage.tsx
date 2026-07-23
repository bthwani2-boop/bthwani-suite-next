import React from "react";
import { Image, type ImageProps } from "expo-image";

export type CachedMediaImageProps = Omit<ImageProps, "cachePolicy" | "transition"> & {
  readonly transitionMs?: number;
};

export function CachedMediaImage({ transitionMs = 150, ...props }: CachedMediaImageProps) {
  return React.createElement(Image, {
    ...props,
    cachePolicy: "memory-disk",
    transition: transitionMs,
    recyclingKey: typeof props.source === "string" ? props.source : undefined,
  });
}
