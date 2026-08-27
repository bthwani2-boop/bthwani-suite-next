// DSH media compatibility DTO.
// Runtime ownership lives in the canonical central catalog asset API and partner-product client.

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
