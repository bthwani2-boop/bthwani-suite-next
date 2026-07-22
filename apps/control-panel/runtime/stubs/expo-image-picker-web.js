// Browser implementation for the subset of expo-image-picker consumed by
// shared DSH surfaces. The control panel must not bundle Expo's native source.

export const MediaTypeOptions = Object.freeze({
  All: "All",
  Images: "Images",
  Videos: "Videos",
});

export const UIImagePickerPresentationStyle = Object.freeze({
  AUTOMATIC: "automatic",
  FULL_SCREEN: "fullScreen",
  PAGE_SHEET: "pageSheet",
  FORM_SHEET: "formSheet",
  CURRENT_CONTEXT: "currentContext",
  OVER_FULL_SCREEN: "overFullScreen",
  OVER_CURRENT_CONTEXT: "overCurrentContext",
  POPOVER: "popover",
  NONE: "none",
});

export const CameraType = Object.freeze({
  back: "back",
  front: "front",
});

export const PermissionStatus = Object.freeze({
  DENIED: "denied",
  GRANTED: "granted",
  UNDETERMINED: "undetermined",
});

const grantedPermission = Object.freeze({
  status: PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: "never",
});

export async function getMediaLibraryPermissionsAsync() {
  return grantedPermission;
}

export async function requestMediaLibraryPermissionsAsync() {
  return grantedPermission;
}

export async function getCameraPermissionsAsync() {
  return grantedPermission;
}

export async function requestCameraPermissionsAsync() {
  return grantedPermission;
}

function resolveAccept(mediaTypes) {
  const values = Array.isArray(mediaTypes) ? mediaTypes : [mediaTypes];
  const normalized = values.filter(Boolean).map((value) => String(value).toLowerCase());

  if (normalized.some((value) => value.includes("all"))) return "image/*,video/*";

  const accepts = [];
  if (normalized.length === 0 || normalized.some((value) => value.includes("image"))) {
    accepts.push("image/*");
  }
  if (normalized.some((value) => value.includes("video"))) accepts.push("video/*");
  return accepts.join(",") || "image/*";
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read selected media."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function pickFromBrowser(options = {}, capture) {
  if (typeof document === "undefined") {
    return Promise.resolve({ canceled: true, assets: null });
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = resolveAccept(options.mediaTypes);
    input.multiple = Boolean(options.allowsMultipleSelection);
    if (capture) input.setAttribute("capture", capture);

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", handleWindowFocus);
      input.remove();
      resolve(result);
    };

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          finish({ canceled: true, assets: null });
        }
      }, 300);
    };

    input.addEventListener("change", async () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) {
        finish({ canceled: true, assets: null });
        return;
      }

      try {
        const assets = await Promise.all(files.map(async (file) => ({
          assetId: null,
          uri: URL.createObjectURL(file),
          width: 0,
          height: 0,
          type: file.type.startsWith("video/") ? "video" : "image",
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || undefined,
          duration: null,
          ...(options.base64 ? { base64: await readBase64(file) } : {}),
        })));
        finish({ canceled: false, assets });
      } catch {
        finish({ canceled: true, assets: null });
      }
    }, { once: true });

    window.addEventListener("focus", handleWindowFocus, { once: true });
    input.click();
  });
}

export function launchImageLibraryAsync(options = {}) {
  return pickFromBrowser(options);
}

export function launchCameraAsync(options = {}) {
  const capture = options.cameraType === CameraType.front ? "user" : "environment";
  return pickFromBrowser(options, capture);
}

export default {
  MediaTypeOptions,
  UIImagePickerPresentationStyle,
  CameraType,
  PermissionStatus,
  getMediaLibraryPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
  getCameraPermissionsAsync,
  requestCameraPermissionsAsync,
  launchImageLibraryAsync,
  launchCameraAsync,
};
