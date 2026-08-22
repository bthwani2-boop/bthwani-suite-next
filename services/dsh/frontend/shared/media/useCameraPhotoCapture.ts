import { useMemo } from "react";
import { getDshImagePickerAdapter } from "../mobile-capabilities";

export type CameraPhotoCaptureResult = {
  readonly uri: string;
};

export function useCameraPhotoCapture() {
  return useMemo(
    () => ({
      captureFromCamera: async (): Promise<CameraPhotoCaptureResult | null> => {
        const picker = getDshImagePickerAdapter();
        const permissionResult = await picker.requestCameraPermissions();

        if (!permissionResult.granted) {
          throw new Error("إذن الوصول إلى الكاميرا مطلوب لالتقاط الصورة.");
        }

        const result = await picker.launchCamera({
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
