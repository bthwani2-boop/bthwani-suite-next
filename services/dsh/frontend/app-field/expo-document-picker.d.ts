// app-field native runtime capability declaration.
// The concrete module is owned and installed by apps/app-field/runtime; this
// declaration lets sovereign DSH source typecheck from its own workspace root.
declare module "expo-document-picker" {
  export type DocumentPickerAsset = {
    readonly name: string;
    readonly size?: number;
    readonly uri: string;
    readonly mimeType?: string;
    readonly lastModified?: number;
  };

  export type DocumentPickerResult =
    | { readonly canceled: true; readonly assets: null }
    | { readonly canceled: false; readonly assets: readonly DocumentPickerAsset[] };

  export type DocumentPickerOptions = {
    readonly type?: string | readonly string[];
    readonly copyToCacheDirectory?: boolean;
    readonly multiple?: boolean;
  };

  export function getDocumentAsync(options?: DocumentPickerOptions): Promise<DocumentPickerResult>;
}
