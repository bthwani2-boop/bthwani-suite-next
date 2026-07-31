import type { Component, ComponentType, ReactNode } from "react";

export type DimensionValue = string | number | "auto" | `${number}%`;
export type AppStateStatus = "active" | "background" | "inactive" | "unknown" | "extension";

export interface ViewStyle {
  readonly [property: string]: unknown;
}

export type StyleProp<T> =
  | T
  | null
  | undefined
  | false
  | readonly StyleProp<T>[];

export interface ViewProps {
  readonly children?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly [property: string]: unknown;
}

export interface TextInputProps extends ViewProps {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly placeholder?: string;
  readonly editable?: boolean;
  readonly multiline?: boolean;
  readonly onChangeText?: (text: string) => void;
}

export interface PressableStateCallbackType {
  readonly pressed: boolean;
  readonly hovered: boolean;
  readonly focused: boolean;
}

export interface PressableProps extends ViewProps {
  readonly disabled?: boolean;
  readonly onPress?: () => void;
  readonly style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
}

export interface ScrollViewProps extends ViewProps {
  readonly horizontal?: boolean;
  readonly showsHorizontalScrollIndicator?: boolean;
  readonly contentContainerStyle?: StyleProp<ViewStyle>;
}

export class View extends Component<ViewProps> {}
export class TextInput extends Component<TextInputProps> {}
export class ScrollView extends Component<ScrollViewProps> {}
export const Pressable: ComponentType<PressableProps>;

export const StyleSheet: Readonly<{
  create<T extends Readonly<Record<string, ViewStyle>>>(styles: T): T;
  flatten<T extends ViewStyle>(style: StyleProp<T>): T | undefined;
}>;

export const I18nManager: Readonly<{
  isRTL: boolean;
}>;

export const Platform: Readonly<{
  OS: "web" | "ios" | "android" | "windows" | "macos";
  select<T>(values: Readonly<Partial<Record<"web" | "ios" | "android" | "windows" | "macos" | "default", T>>>): T | undefined;
}>;

export const Linking: Readonly<{
  canOpenURL(url: string): Promise<boolean>;
  openURL(url: string): Promise<unknown>;
}>;

export const AppState: Readonly<{
  currentState: AppStateStatus;
  addEventListener(type: "change", listener: (state: AppStateStatus) => void): Readonly<{ remove(): void }>;
}>;
