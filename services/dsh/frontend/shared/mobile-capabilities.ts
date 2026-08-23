import React from "react";
import { configureSecureRandomUuidProvider } from "./_kernel/secure-random";

export function configureDshSecureRandomUuidProvider(
  provider: () => string,
): void {
  configureSecureRandomUuidProvider(provider);
}

export class DshNativeCapabilityUnavailable extends Error {
  constructor(capability: string) {
    super(`القدرة الأصلية غير متاحة: ${capability}`);
    this.name = "DshNativeCapabilityUnavailable";
  }
}

export type DshLocationPermission = {
  readonly granted: boolean;
  readonly status?: string;
};

export type DshLocationPosition = {
  readonly coords: {
    readonly latitude: number;
    readonly longitude: number;
    readonly accuracy: number | null;
  };
  readonly timestamp: number;
  readonly mocked?: boolean;
};

export type DshLocationAdapter = {
  readonly hasServicesEnabled: () => Promise<boolean>;
  readonly requestForegroundPermissions: () => Promise<DshLocationPermission>;
  readonly getCurrentPosition: () => Promise<DshLocationPosition>;
};

export type DshImageAsset = {
  readonly uri: string;
  readonly fileName?: string | null;
  readonly mimeType?: string | null;
  readonly fileSize?: number | null;
};

export type DshImagePickerOptions = {
  readonly quality?: number;
  readonly mediaTypes?: readonly string[];
};

export type DshImagePickerResult = {
  readonly canceled: boolean;
  readonly assets: readonly DshImageAsset[];
};

export type DshImagePickerAdapter = {
  readonly requestCameraPermissions: () => Promise<{ readonly granted: boolean }>;
  readonly requestMediaLibraryPermissions: () => Promise<{ readonly granted: boolean }>;
  readonly launchCamera: (options?: DshImagePickerOptions) => Promise<DshImagePickerResult>;
  readonly launchImageLibrary: (options?: DshImagePickerOptions) => Promise<DshImagePickerResult>;
};

export type DshDocumentPickerOptions = {
  readonly type?: string | readonly string[];
  readonly copyToCacheDirectory?: boolean;
  readonly multiple?: boolean;
};

export type DshDocumentAsset = {
  readonly name: string;
  readonly size?: number;
  readonly uri: string;
  readonly mimeType?: string;
};

export type DshDocumentPickerResult = {
  readonly canceled: boolean;
  readonly assets: readonly DshDocumentAsset[];
};

export type DshDocumentPickerAdapter = {
  readonly getDocument: (options?: DshDocumentPickerOptions) => Promise<DshDocumentPickerResult>;
};

export type DshMapCoordinate = {
  readonly latitude: number;
  readonly longitude: number;
};

export type DshMapMarker = DshMapCoordinate & {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
};

export type DshMapProps = {
  readonly selectedCoordinate?: DshMapCoordinate | null;
  readonly markers?: readonly DshMapMarker[];
  readonly onCoordinatePress?: (coordinate: DshMapCoordinate) => void;
  readonly showsUserLocation?: boolean;
  readonly height?: number;
  readonly latitudeDelta?: number;
  readonly longitudeDelta?: number;
};

export type DshMapRenderer = React.ComponentType<DshMapProps>;

export type DshVideoSurfaceProps = {
  readonly uri: string;
  readonly active: boolean;
  readonly style?: unknown;
};

export type DshVideoRenderer = React.ComponentType<DshVideoSurfaceProps>;

export type DshMobileNotificationResponse = {
  readonly actionIdentifier: string;
  readonly actionUrl: string | null;
};

export type DshMobileNotificationSubscription = {
  readonly remove: () => void;
};

export type DshMobileNotificationRuntime = {
  readonly platform: "web" | "ios" | "android";
  readonly defaultActionIdentifier: string;
  readonly initialize: () => void;
  readonly androidNativePushConfigured: () => boolean;
  readonly ensurePermission: () => Promise<boolean>;
  readonly resolveDeviceId: (appKey: string) => Promise<string>;
  readonly getPushToken: () => Promise<string>;
  readonly addPushTokenListener?: (listener: () => void) => DshMobileNotificationSubscription;
  readonly addResponseListener?: (
    listener: (response: DshMobileNotificationResponse) => void,
  ) => DshMobileNotificationSubscription;
  readonly getLastResponse?: () => Promise<DshMobileNotificationResponse | null>;
  readonly clearLastResponse?: () => Promise<void>;
  readonly openUrl: (url: string) => Promise<boolean>;
};

export type DshLinkingSubscription = { readonly remove: () => void };
export type DshLinkingAdapter = {
  readonly getInitialUrl: () => Promise<string | null>;
  readonly addUrlListener: (listener: (url: string) => void) => DshLinkingSubscription;
};

const unavailable = (capability: string): never => {
  throw new DshNativeCapabilityUnavailable(capability);
};

let locationAdapter: DshLocationAdapter = {
  hasServicesEnabled: async () => false,
  requestForegroundPermissions: async () => unavailable("location"),
  getCurrentPosition: async () => unavailable("location"),
};

let imagePickerAdapter: DshImagePickerAdapter = {
  requestCameraPermissions: async () => unavailable("imagePicker"),
  requestMediaLibraryPermissions: async () => unavailable("imagePicker"),
  launchCamera: async () => unavailable("imagePicker"),
  launchImageLibrary: async () => unavailable("imagePicker"),
};

let documentPickerAdapter: DshDocumentPickerAdapter = {
  getDocument: async () => unavailable("documentPicker"),
};

let mapRenderer: DshMapRenderer | null = null;
let videoRenderer: DshVideoRenderer | null = null;
let linkingAdapter: DshLinkingAdapter = {
  getInitialUrl: async () => null,
  addUrlListener: () => ({ remove: () => undefined }),
};
let notificationRuntime: DshMobileNotificationRuntime = {
  platform: "web",
  defaultActionIdentifier: "expo.modules.notifications.actions.DEFAULT",
  initialize: () => undefined,
  androidNativePushConfigured: () => false,
  ensurePermission: async () => false,
  resolveDeviceId: async () => unavailable("notifications"),
  getPushToken: async () => unavailable("notifications"),
  openUrl: async () => false,
};

export function configureDshLocationAdapter(adapter: DshLocationAdapter): void {
  locationAdapter = adapter;
}

export function getDshLocationAdapter(): DshLocationAdapter {
  return locationAdapter;
}

export function configureDshImagePickerAdapter(adapter: DshImagePickerAdapter): void {
  imagePickerAdapter = adapter;
}

export function getDshImagePickerAdapter(): DshImagePickerAdapter {
  return imagePickerAdapter;
}

export function configureDshDocumentPickerAdapter(adapter: DshDocumentPickerAdapter): void {
  documentPickerAdapter = adapter;
}

export function getDshDocumentPickerAdapter(): DshDocumentPickerAdapter {
  return documentPickerAdapter;
}

export function configureDshMapRenderer(renderer: DshMapRenderer): void {
  mapRenderer = renderer;
}

export function getDshMapRenderer(): DshMapRenderer | null {
  return mapRenderer;
}

export function configureDshVideoRenderer(renderer: DshVideoRenderer): void {
  videoRenderer = renderer;
}

export function getDshVideoRenderer(): DshVideoRenderer | null {
  return videoRenderer;
}

export function configureDshLinkingAdapter(adapter: DshLinkingAdapter): void {
  linkingAdapter = adapter;
}

export function getDshLinkingAdapter(): DshLinkingAdapter {
  return linkingAdapter;
}

export function configureDshMobileNotificationRuntime(
  runtime: DshMobileNotificationRuntime,
): void {
  notificationRuntime = runtime;
  runtime.initialize();
}

export function getDshMobileNotificationRuntime(): DshMobileNotificationRuntime {
  return notificationRuntime;
}

type ExpoLocationModule = {
  readonly Accuracy: { readonly High: unknown };
  readonly hasServicesEnabledAsync: () => Promise<boolean>;
  readonly requestForegroundPermissionsAsync: () => Promise<{ readonly granted: boolean; readonly status?: string }>;
  readonly getCurrentPositionAsync: (options: { readonly accuracy: unknown }) => Promise<{
    readonly coords: { readonly latitude: number; readonly longitude: number; readonly accuracy: number | null };
    readonly timestamp: number;
    readonly mocked?: boolean;
  }>;
};

export function createDshExpoLocationAdapter(module: unknown): DshLocationAdapter {
  const location = module as ExpoLocationModule;
  return {
    hasServicesEnabled: () => location.hasServicesEnabledAsync(),
    requestForegroundPermissions: () => location.requestForegroundPermissionsAsync(),
    getCurrentPosition: async () => {
      const position = await location.getCurrentPositionAsync({ accuracy: location.Accuracy.High });
      return {
        coords: position.coords,
        timestamp: position.timestamp,
        ...(typeof position.mocked === "boolean" ? { mocked: position.mocked } : {}),
      };
    },
  };
}

export function createDshBrowserLocationAdapter(): DshLocationAdapter {
  return {
    hasServicesEnabled: async () => typeof navigator !== "undefined" && Boolean(navigator.geolocation),
    requestForegroundPermissions: async () => ({ granted: typeof navigator !== "undefined" && Boolean(navigator.geolocation) }),
    getCurrentPosition: () => new Promise<DshLocationPosition>((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new DshNativeCapabilityUnavailable("location"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          timestamp: position.timestamp,
        }),
        () => reject(new Error("تعذر قراءة الموقع الحالي. تحقق من صلاحية الموقع وحاول مجددًا.")),
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 10_000 },
      );
    }),
  };
}

type ExpoImagePickerModule = {
  readonly requestCameraPermissionsAsync: () => Promise<{ readonly granted: boolean }>;
  readonly requestMediaLibraryPermissionsAsync: () => Promise<{ readonly granted: boolean }>;
  readonly launchCameraAsync: (options: unknown) => Promise<{ readonly canceled: boolean; readonly assets?: readonly DshImageAsset[] }>;
  readonly launchImageLibraryAsync: (options: unknown) => Promise<{ readonly canceled: boolean; readonly assets?: readonly DshImageAsset[] }>;
};

function normalizeImageResult(result: { readonly canceled: boolean; readonly assets?: readonly DshImageAsset[] }): DshImagePickerResult {
  return { canceled: result.canceled, assets: result.assets ?? [] };
}

export function createDshExpoImagePickerAdapter(module: unknown): DshImagePickerAdapter {
  const picker = module as ExpoImagePickerModule;
  return {
    requestCameraPermissions: () => picker.requestCameraPermissionsAsync(),
    requestMediaLibraryPermissions: () => picker.requestMediaLibraryPermissionsAsync(),
    launchCamera: async (options = {}) => normalizeImageResult(await picker.launchCameraAsync(options)),
    launchImageLibrary: async (options = {}) => normalizeImageResult(await picker.launchImageLibraryAsync(options)),
  };
}

type ExpoDocumentPickerModule = {
  readonly getDocumentAsync: (options: unknown) => Promise<{
    readonly canceled: boolean;
    readonly assets?: readonly DshDocumentAsset[] | null;
  }>;
};

export function createDshExpoDocumentPickerAdapter(module: unknown): DshDocumentPickerAdapter {
  const picker = module as ExpoDocumentPickerModule;
  return {
    getDocument: async (options = {}) => {
      const result = await picker.getDocumentAsync(options);
      return { canceled: result.canceled, assets: result.assets ?? [] };
    },
  };
}

type NotificationPermissionStatus = {
  readonly granted: boolean;
  readonly ios?: { readonly status?: unknown };
};

type NotificationResponse = {
  readonly actionIdentifier: string;
  readonly notification: { readonly request: { readonly content: { readonly data: Record<string, unknown> } } };
};

type ExpoNotificationModule = {
  readonly DEFAULT_ACTION_IDENTIFIER: string;
  readonly IosAuthorizationStatus?: { readonly PROVISIONAL?: unknown };
  readonly AndroidImportance?: { readonly HIGH?: unknown };
  readonly setNotificationHandler: (handler: unknown) => void;
  readonly setNotificationChannelAsync: (channel: string, options: unknown) => Promise<void>;
  readonly getPermissionsAsync: () => Promise<NotificationPermissionStatus>;
  readonly requestPermissionsAsync: (options: unknown) => Promise<NotificationPermissionStatus>;
  readonly getExpoPushTokenAsync: (options?: unknown) => Promise<{ readonly data: string }>;
  readonly addNotificationResponseReceivedListener?: (listener: (response: NotificationResponse) => void) => { readonly remove: () => void };
  readonly getLastNotificationResponseAsync?: () => Promise<NotificationResponse | null>;
  readonly clearLastNotificationResponseAsync?: () => Promise<void>;
  readonly addPushTokenListener?: (listener: () => void) => { readonly remove: () => void };
};

type ExpoConstantsModule = {
  readonly expoConfig?: { readonly extra?: { readonly notifications?: { readonly androidNativeConfigured?: unknown }; readonly eas?: { readonly projectId?: unknown } } };
  readonly easConfig?: { readonly projectId?: unknown };
};

type ExpoSecureStoreModule = {
  readonly getItemAsync: (key: string) => Promise<string | null>;
  readonly setItemAsync: (key: string, value: string) => Promise<void>;
};

type ExpoCryptoModule = { readonly randomUUID?: () => string };
type ExpoLinkingModule = { readonly canOpenURL: (url: string) => Promise<boolean>; readonly openURL: (url: string) => Promise<void> };

export function createDshExpoNotificationRuntime(modules: {
  readonly platform: "web" | "ios" | "android";
  readonly notifications: unknown;
  readonly constants: unknown;
  readonly secureStore: unknown;
  readonly crypto: unknown;
  readonly linking: unknown;
}): DshMobileNotificationRuntime {
  const notifications = modules.notifications as ExpoNotificationModule;
  const constants = modules.constants as ExpoConstantsModule;
  const secureStore = modules.secureStore as ExpoSecureStoreModule;
  const crypto = modules.crypto as ExpoCryptoModule;
  const linking = modules.linking as ExpoLinkingModule;
  const deviceKeyPrefix = "bthwani-dsh-push-device";

  const toResponse = (response: NotificationResponse): DshMobileNotificationResponse => {
    const data = response.notification.request.content.data;
    return {
      actionIdentifier: response.actionIdentifier,
      actionUrl: typeof data.actionUrl === "string" ? data.actionUrl : null,
    };
  };

  return {
    platform: modules.platform,
    defaultActionIdentifier: notifications.DEFAULT_ACTION_IDENTIFIER,
    initialize: () => {
      if (modules.platform === "web") return;
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    },
    androidNativePushConfigured: () => (
      (constants.expoConfig?.extra?.notifications?.androidNativeConfigured === true)
    ),
    ensurePermission: async () => {
      if (modules.platform === "web") return false;
      if (modules.platform === "android") {
        await notifications.setNotificationChannelAsync("bthwani-operational", {
          name: "إشعارات بثواني التشغيلية",
          importance: notifications.AndroidImportance?.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
      const isGranted = (status: NotificationPermissionStatus) => (
        status.granted
        || (modules.platform === "ios"
          && status.ios?.status === notifications.IosAuthorizationStatus?.PROVISIONAL)
      );
      const existing = await notifications.getPermissionsAsync();
      if (isGranted(existing)) return true;
      return isGranted(await notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      }));
    },
    resolveDeviceId: async (appKey: string) => {
      const storageKey = `${deviceKeyPrefix}-${appKey}`;
      const existing = await secureStore.getItemAsync(storageKey);
      if (existing) return existing;
      if (typeof crypto.randomUUID !== "function") {
        throw new DshNativeCapabilityUnavailable("secure random UUID");
      }
      const unique = crypto.randomUUID();
      const generated = `${appKey}-${unique}`;
      await secureStore.setItemAsync(storageKey, generated);
      return generated;
    },
    getPushToken: async () => {
      const projectId = constants.expoConfig?.extra?.eas?.projectId || constants.easConfig?.projectId;
      return (await notifications.getExpoPushTokenAsync(
        typeof projectId === "string" ? { projectId } : undefined,
      )).data;
    },
    ...(notifications.addPushTokenListener
      ? { addPushTokenListener: (listener: () => void) => notifications.addPushTokenListener!(listener) }
      : {}),
    ...(notifications.addNotificationResponseReceivedListener
      ? {
          addResponseListener: (listener: (response: DshMobileNotificationResponse) => void) => (
            notifications.addNotificationResponseReceivedListener!((response) => listener(toResponse(response)))
          ),
        }
      : {}),
    ...(notifications.getLastNotificationResponseAsync
      ? { getLastResponse: async () => {
          const response = await notifications.getLastNotificationResponseAsync!();
          return response ? toResponse(response) : null;
        } }
      : {}),
    ...(notifications.clearLastNotificationResponseAsync
      ? { clearLastResponse: () => notifications.clearLastNotificationResponseAsync!() }
      : {}),
    openUrl: async (url: string) => {
      if (!(await linking.canOpenURL(url))) return false;
      await linking.openURL(url);
      return true;
    },
  };
}
