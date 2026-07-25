declare module "react-native-maps" {
  import * as React from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  export type LatLng = {
    readonly latitude: number;
    readonly longitude: number;
  };

  export type Region = LatLng & {
    readonly latitudeDelta: number;
    readonly longitudeDelta: number;
  };

  export type MapPressEvent = {
    readonly nativeEvent: {
      readonly coordinate: LatLng;
    };
  };

  export type MapViewProps = {
    readonly provider?: string;
    readonly initialRegion?: Region;
    readonly onPress?: (event: MapPressEvent) => void;
    readonly showsUserLocation?: boolean;
    readonly showsMyLocationButton?: boolean;
    readonly showsCompass?: boolean;
    readonly toolbarEnabled?: boolean;
    readonly loadingEnabled?: boolean;
    readonly style?: StyleProp<ViewStyle>;
    readonly children?: React.ReactNode;
  };

  export type MarkerProps = {
    readonly coordinate: LatLng;
    readonly title?: string;
    readonly description?: string;
    readonly pinColor?: string;
  };

  export default class MapView extends React.Component<MapViewProps> {
    animateToRegion(region: Region, duration?: number): void;
  }

  export const Marker: React.ComponentType<MarkerProps>;
  export const PROVIDER_GOOGLE: string;
}
