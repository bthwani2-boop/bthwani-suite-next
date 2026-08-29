import React, { createContext, useContext } from "react";
import { View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { secureRandomId } from "../shared/_kernel/secure-random.ts";

export type DshClientRemoteImageProps = {
  readonly uri: string;
  readonly style: StyleProp<ImageStyle>;
  readonly contentFit?: "cover" | "contain";
  readonly accessibilityLabel?: string;
  readonly onError?: () => void;
};

export type DshClientShareTextDocumentInput = {
  readonly fileNamePrefix: string;
  readonly contents: string;
  readonly dialogTitle: string;
};

export type DshClientPlatform = {
  readonly RemoteImage: React.ComponentType<DshClientRemoteImageProps>;
  readonly createEphemeralId: (prefix: string) => string;
  readonly selectionHaptic: () => Promise<void>;
  readonly openExternalUrl: (url: string) => Promise<boolean>;
  readonly shareTextDocument: (input: DshClientShareTextDocumentInput) => Promise<boolean>;
};

function UnavailableRemoteImage({ style, accessibilityLabel }: DshClientRemoteImageProps) {
  return <View style={style as StyleProp<ViewStyle>} accessible accessibilityLabel={accessibilityLabel ?? "صورة غير متاحة"} />;
}

const defaultPlatform: DshClientPlatform = {
  RemoteImage: UnavailableRemoteImage,
  createEphemeralId: (prefix) => `${prefix}.${secureRandomId()}`,
  selectionHaptic: async () => undefined,
  openExternalUrl: async () => false,
  shareTextDocument: async () => false,
};

const DshClientPlatformContext = createContext<DshClientPlatform>(defaultPlatform);

export function DshClientPlatformProvider({
  platform,
  children,
}: {
  readonly platform: DshClientPlatform;
  readonly children: React.ReactNode;
}) {
  return <DshClientPlatformContext.Provider value={platform}>{children}</DshClientPlatformContext.Provider>;
}

export function useDshClientPlatform(): DshClientPlatform {
  return useContext(DshClientPlatformContext);
}
