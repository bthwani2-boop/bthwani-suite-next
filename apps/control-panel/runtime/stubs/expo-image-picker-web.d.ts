declare module "expo-image-picker" {
  export type ImagePickerPermissionResponse = Readonly<{
    status: "denied" | "granted" | "undetermined";
    granted: boolean;
    canAskAgain: boolean;
    expires: "never";
  }>;

  export type ImagePickerAsset = Readonly<{
    uri: string;
    width: number;
    height: number;
    assetId?: string | null;
    type?: "image" | "video";
    fileName?: string | null;
    fileSize?: number;
    mimeType?: string;
    duration?: number | null;
    base64?: string | null;
  }>;

  export type ImagePickerResult =
    | Readonly<{ canceled: true; assets: null }>
    | Readonly<{ canceled: false; assets: readonly ImagePickerAsset[] }>;

  export type ImagePickerOptions = Readonly<{
    quality?: number;
    base64?: boolean;
    allowsMultipleSelection?: boolean;
    mediaTypes?: string | readonly string[];
    cameraType?: "back" | "front";
  }>;

  export const MediaTypeOptions: Readonly<{ All: "All"; Images: "Images"; Videos: "Videos" }>;
  export const CameraType: Readonly<{ back: "back"; front: "front" }>;
  export const PermissionStatus: Readonly<{ DENIED: "denied"; GRANTED: "granted"; UNDETERMINED: "undetermined" }>;

  export function getMediaLibraryPermissionsAsync(): Promise<ImagePickerPermissionResponse>;
  export function requestMediaLibraryPermissionsAsync(): Promise<ImagePickerPermissionResponse>;
  export function getCameraPermissionsAsync(): Promise<ImagePickerPermissionResponse>;
  export function requestCameraPermissionsAsync(): Promise<ImagePickerPermissionResponse>;
  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
}
