import type { UploadFileSource } from "./catalog-media.controller-core";

export type CatalogMobileFileKind = "video" | "image";
export type CatalogMobileFilePicker = (kind: CatalogMobileFileKind) => Promise<UploadFileSource | null>;

let configuredPicker: CatalogMobileFilePicker | null = null;

/**
 * Runtime-owned bridge for native document selection.
 *
 * Shared DSH frontend code must not import Expo packages directly because it is
 * also typechecked by web/control-panel projects. The app runtime configures
 * this bridge with its installed Expo SDK implementation during bootstrap.
 */
export function configureCatalogMobileFilePicker(picker: CatalogMobileFilePicker): void {
  configuredPicker = picker;
}

export async function pickCatalogMobileFile(kind: CatalogMobileFileKind): Promise<UploadFileSource> {
  if (!configuredPicker) {
    throw new Error("CATALOG_MOBILE_FILE_PICKER_NOT_CONFIGURED");
  }
  const selected = await configuredPicker(kind);
  if (!selected) {
    throw new Error("CATALOG_MOBILE_FILE_PICKER_CANCELLED");
  }
  return selected;
}
