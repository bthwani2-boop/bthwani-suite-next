import {
  configureDshDocumentPickerAdapter,
  configureDshImagePickerAdapter,
  configureDshLocationAdapter,
  configureDshMapRenderer,
  configureDshMobileNotificationRuntime,
  configureDshSecureRandomUuidProvider,
  configureDshVideoRenderer,
  createDshBrowserLocationAdapter,
  createDshExpoDocumentPickerAdapter,
  createDshExpoImagePickerAdapter,
  createDshExpoLocationAdapter,
  createDshExpoNotificationRuntime,
  createDshExpoSecureRandomUuidProvider,
  type DshMapCoordinate,
  type DshMapProps,
  type DshMapRenderer,
  type DshVideoRenderer,
  type DshVideoSurfaceProps,
} from "./mobile-capabilities";

type ReactRuntime = {
  readonly useEffect: (effect: () => void | (() => void), dependencies: readonly unknown[]) => void;
  readonly useRef: <T>(initialValue: T) => { current: T };
  readonly createElement: (...args: any[]) => any;
};

type MapRuntime = {
  readonly React: ReactRuntime;
  readonly MapView: any;
  readonly Marker: any;
  readonly providerGoogle: any;
  readonly infoColor: string;
};

export type DshMobileCapabilityModules = {
  readonly platform: "web" | "ios" | "android";
  readonly constants: unknown;
  readonly crypto: unknown;
  readonly documentPicker: unknown;
  readonly imagePicker: unknown;
  readonly linking: unknown;
  readonly location: unknown;
  readonly map: MapRuntime;
  readonly notifications: unknown;
  readonly secureStore: unknown;
  readonly video?: DshVideoRenderer;
};

const DEFAULT_CENTER: DshMapCoordinate = { latitude: 15.3694, longitude: 44.191 };

function isFiniteCoordinate(value: DshMapCoordinate | null | undefined): value is DshMapCoordinate {
  return Boolean(
    value
      && Number.isFinite(value.latitude)
      && Number.isFinite(value.longitude)
      && value.latitude >= -90
      && value.latitude <= 90
      && value.longitude >= -180
      && value.longitude <= 180,
  );
}

function mapRegion(coordinate: DshMapCoordinate, latitudeDelta: number, longitudeDelta: number) {
  return { latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta, longitudeDelta };
}

function createDshRuntimeMap(runtime: MapRuntime): DshMapRenderer {
  function DshRuntimeMap({
    selectedCoordinate,
    markers = [],
    onCoordinatePress,
    showsUserLocation = false,
    height = 260,
    latitudeDelta = 0.025,
    longitudeDelta = 0.025,
  }: DshMapProps) {
    const mapRef = runtime.React.useRef<{ animateToRegion: (region: unknown, duration: number) => void } | null>(null);
    const firstMarker = markers.find(isFiniteCoordinate);
    const center = isFiniteCoordinate(selectedCoordinate) ? selectedCoordinate : firstMarker ?? DEFAULT_CENTER;
    const selected = isFiniteCoordinate(selectedCoordinate) ? selectedCoordinate : null;
    const validMarkers = markers.filter(isFiniteCoordinate);

    runtime.React.useEffect(() => {
      if (!selected) return;
      mapRef.current?.animateToRegion(mapRegion(selected, latitudeDelta, longitudeDelta), 300);
    }, [latitudeDelta, longitudeDelta, selected]);

    const handlePress = (event: { nativeEvent: { coordinate: DshMapCoordinate } }) => {
      const coordinate = event.nativeEvent.coordinate;
      if (onCoordinatePress && isFiniteCoordinate(coordinate)) onCoordinatePress(coordinate);
    };

    return runtime.React.createElement(
      runtime.MapView,
      {
        ref: mapRef,
        provider: runtime.providerGoogle,
        initialRegion: mapRegion(center, latitudeDelta, longitudeDelta),
        onPress: handlePress,
        showsUserLocation,
        showsMyLocationButton: showsUserLocation,
        showsCompass: true,
        toolbarEnabled: false,
        loadingEnabled: true,
        style: { width: "100%", height },
      },
      ...validMarkers.map((marker) => runtime.React.createElement(runtime.Marker, {
        key: marker.id,
        coordinate: { latitude: marker.latitude, longitude: marker.longitude },
        title: marker.title,
        ...(marker.description ? { description: marker.description } : {}),
      })),
      selected
        ? runtime.React.createElement(runtime.Marker, {
            coordinate: selected,
            title: "الموقع المحدد",
            pinColor: runtime.infoColor,
          })
        : null,
    );
  }

  return DshRuntimeMap as DshMapRenderer;
}

export function configureDshMobileCapabilities(modules: DshMobileCapabilityModules): void {
  if (modules.platform !== "web") {
    configureDshSecureRandomUuidProvider(createDshExpoSecureRandomUuidProvider(modules.crypto));
  }

  configureDshLocationAdapter(
    modules.platform === "web"
      ? createDshBrowserLocationAdapter()
      : createDshExpoLocationAdapter(modules.location),
  );
  configureDshImagePickerAdapter(createDshExpoImagePickerAdapter(modules.imagePicker));
  configureDshDocumentPickerAdapter(createDshExpoDocumentPickerAdapter(modules.documentPicker));
  configureDshMobileNotificationRuntime(createDshExpoNotificationRuntime({
    platform: modules.platform,
    notifications: modules.notifications,
    constants: modules.constants,
    secureStore: modules.secureStore,
    crypto: modules.crypto,
    linking: modules.linking,
  }));
  configureDshMapRenderer(createDshRuntimeMap(modules.map));
  if (modules.video) configureDshVideoRenderer(modules.video);
}
