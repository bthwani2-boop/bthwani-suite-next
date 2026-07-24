// Browser implementation for the subset of expo-image-picker consumed by
// shared DSH surfaces. The control panel must not bundle Expo native modules.

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

function permissionResult(status, canAskAgain = status !== PermissionStatus.DENIED) {
  return Object.freeze({
    status,
    granted: status === PermissionStatus.GRANTED,
    canAskAgain,
    expires: "never",
  });
}

const filePickerPermission = permissionResult(PermissionStatus.GRANTED, true);
const undeterminedPermission = permissionResult(PermissionStatus.UNDETERMINED, true);
const deniedPermission = permissionResult(PermissionStatus.DENIED, false);

// Browser file access is explicitly granted by the user for each selected file;
// there is no persistent media-library permission comparable to native Expo.
export async function getMediaLibraryPermissionsAsync() {
  return filePickerPermission;
}

export async function requestMediaLibraryPermissionsAsync() {
  return filePickerPermission;
}

async function queryCameraPermission() {
  if (typeof navigator === "undefined") return undeterminedPermission;
  if (!navigator.mediaDevices?.getUserMedia) return deniedPermission;
  if (!navigator.permissions?.query) return undeterminedPermission;
  try {
    const permission = await navigator.permissions.query({ name: "camera" });
    if (permission.state === "granted") return permissionResult(PermissionStatus.GRANTED, true);
    if (permission.state === "denied") return deniedPermission;
    return undeterminedPermission;
  } catch {
    return undeterminedPermission;
  }
}

export async function getCameraPermissionsAsync() {
  return queryCameraPermission();
}

export async function requestCameraPermissionsAsync() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return deniedPermission;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    for (const track of stream.getTracks()) track.stop();
    return permissionResult(PermissionStatus.GRANTED, true);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") return deniedPermission;
    throw error;
  }
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
  if (typeof document === "undefined" || typeof window === "undefined") {
    return Promise.reject(new Error("IMAGE_PICKER_BROWSER_UNAVAILABLE"));
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = resolveAccept(options.mediaTypes);
    input.multiple = Boolean(options.allowsMultipleSelection);
    if (capture) input.setAttribute("capture", capture);

    let settled = false;
    const cleanup = () => {
      window.removeEventListener("focus", handleWindowFocus);
      input.remove();
    };
    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
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
      } catch (error) {
        fail(error);
      }
    }, { once: true });

    window.addEventListener("focus", handleWindowFocus, { once: true });
    try {
      input.click();
    } catch (error) {
      fail(error);
    }
  });
}

export function launchImageLibraryAsync(options = {}) {
  return pickFromBrowser(options);
}

export async function launchCameraAsync(options = {}) {
  const permission = await getCameraPermissionsAsync();
  if (permission.status === PermissionStatus.DENIED) {
    throw new Error("CAMERA_PERMISSION_DENIED");
  }
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
