import { useMemo } from "react";
import * as ImagePicker from "expo-image-picker";

export type CameraPhotoCaptureResult = {
  readonly uri: string;
};

export function useCameraPhotoCapture() {
  return useMemo(
    () => ({
      captureFromCamera: async (): Promise<CameraPhotoCaptureResult | null> => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (!permissionResult.granted) {
          throw new Error("إذن الوصول إلى الكاميرا مطلوب لالتقاط الصورة.");
        }

        const result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
        });
        const asset = result.assets?.[0];

        if (!result.canceled && asset) {
          return { uri: asset.uri };
        }

        return null;
      },
    }),
    []
  );
}
