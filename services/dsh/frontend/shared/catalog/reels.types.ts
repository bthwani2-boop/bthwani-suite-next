export type ReelTargetType = "master_product" | "store" | "offer";
export type ReelStatus = "pending_review" | "approved" | "rejected" | "archived";

export type GovernedReel = {
  readonly id: string;
  readonly assetId: string;
  readonly posterAssetId: string | null;
  readonly titleAr: string;
  readonly titleEn: string;
  readonly subtitleAr: string;
  readonly subtitleEn: string;
  readonly highlightAr: string;
  readonly highlightEn: string;
  readonly ctaLabelAr: string;
  readonly ctaLabelEn: string;
  readonly targetType: ReelTargetType;
  readonly targetId: string;
  readonly status: ReelStatus;
  readonly sortOrder: number;
  readonly submittedBy: string;
  readonly submittedByRole: string;
  readonly sourceStoreId: string | null;
  readonly reviewedBy: string | null;
  readonly reviewNote: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type GovernedPublicReel = {
  readonly id: string;
  readonly titleAr: string;
  readonly titleEn: string;
  readonly subtitleAr: string;
  readonly subtitleEn: string;
  readonly highlightAr: string;
  readonly highlightEn: string;
  readonly ctaLabelAr: string;
  readonly ctaLabelEn: string;
  readonly videoUrl: string;
  readonly posterUrl: string;
  readonly targetType: ReelTargetType;
  readonly targetId: string;
  readonly sortOrder: number;
};

export type GovernedReelSubmissionInput = {
  readonly assetId: string;
  readonly posterAssetId?: string;
  readonly titleAr?: string;
  readonly titleEn?: string;
  readonly subtitleAr?: string;
  readonly subtitleEn?: string;
  readonly highlightAr?: string;
  readonly highlightEn?: string;
  readonly ctaLabelAr?: string;
  readonly ctaLabelEn?: string;
  readonly targetType: ReelTargetType;
  readonly targetId: string;
  readonly sortOrder?: number;
  readonly sourceStoreId?: string;
};

export type GovernedReelReviewInput = {
  readonly decision: "approved" | "rejected" | "archived";
  readonly reviewNote?: string;
  readonly posterAssetId?: string;
  readonly titleAr?: string;
  readonly titleEn?: string;
  readonly subtitleAr?: string;
  readonly subtitleEn?: string;
  readonly highlightAr?: string;
  readonly highlightEn?: string;
  readonly ctaLabelAr?: string;
  readonly ctaLabelEn?: string;
  readonly targetType?: ReelTargetType;
  readonly targetId?: string;
  readonly sortOrder?: number;
};
