// DSH Media API Client — stub pending backend binding
// Authority: control-panel/media — partner surface upload only, no approval

export type DshMediaAsset = {
  readonly id: string;
  readonly entity_id: string;
  readonly entity_type: 'product' | 'store' | 'category';
  readonly media_key: string;
  readonly url: string;
  readonly mime_type: string;
  readonly created_at: string;
  readonly purpose?: string;
  readonly public_url?: string;
  readonly status?: string;
  readonly file_size_bytes?: number;
};

export type DshMediaApiError = {
  readonly code: string;
  readonly message: string;
};

export type DshUploadMediaRequest = {
  readonly entity_id: string;
  readonly entity_type: 'product' | 'store' | 'category';
  readonly media_key: string;
  readonly file_uri: string;
  readonly mime_type: string;
};

export type DshMediaApiClient = {
  listAssets: (entityId: string, entityType: string) => Promise<readonly DshMediaAsset[]>;
  uploadAsset: (req: DshUploadMediaRequest) => Promise<DshMediaAsset>;
  deleteAsset: (assetId: string) => Promise<void>;
};
