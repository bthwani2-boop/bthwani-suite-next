declare module "expo-video" {
  import type React from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export type VideoPlayer = {
    loop: boolean;
    play: () => void;
    pause: () => void;
  };

  export function useVideoPlayer(
    source: { readonly uri: string; readonly useCaching?: boolean },
    setup?: (player: VideoPlayer) => void,
  ): VideoPlayer;

  export const VideoView: React.ComponentType<{
    readonly player: VideoPlayer;
    readonly style?: StyleProp<ViewStyle>;
    readonly nativeControls?: boolean;
    readonly contentFit?: "contain" | "cover" | "fill";
    readonly allowsFullscreen?: boolean;
    readonly fullscreenOptions?: { readonly enable: boolean };
    readonly allowsPictureInPicture?: boolean;
    readonly surfaceType?: "textureView" | "surfaceView";
  }>;
}
