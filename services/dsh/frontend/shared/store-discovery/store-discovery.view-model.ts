import type { DshStoreSummaryDto, DshStoreDetailDto } from "./store-discovery.types.js";

export type DshStoreCardViewModel = {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly cityCode: string;
  readonly serviceAreaCode: string;
  readonly isOpen: boolean;
  readonly isServiceable: boolean;
  readonly ratingLabel: string | null;
  readonly etaLabel: string | null;
  readonly heroImageUrl: string | null;
  readonly logoUrl: string | null;
  readonly statusBadge: string | null;
};

export type DshStoreDetailViewModel = DshStoreCardViewModel & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

export function toCardViewModel(dto: DshStoreSummaryDto): DshStoreCardViewModel {
  const isOpen = dto.status === "active";
  const isServiceable =
    dto.serviceability.status === "serviceable" ||
    dto.serviceability.status === "limited";

  const ratingCount = dto.ratingCount ?? 0;
  const ratingLabel =
    dto.ratingAverage != null && ratingCount > 0
      ? `${dto.ratingAverage.toFixed(1)} (${ratingCount})`
      : null;

  const etaLabel =
    dto.deliveryEtaMin != null && dto.deliveryEtaMax != null
      ? `${dto.deliveryEtaMin}–${dto.deliveryEtaMax} min`
      : null;

  const statusBadge =
    dto.status === "temporarily_closed"
      ? "Temporarily Closed"
      : dto.status === "inactive"
        ? "Unavailable"
        : dto.serviceability.status === "limited"
          ? "Limited Delivery"
          : dto.serviceability.status === "out_of_area"
            ? "Out of Area"
            : null;

  return {
    id: dto.id,
    slug: dto.slug,
    displayName: dto.displayName,
    cityCode: dto.cityCode,
    serviceAreaCode: dto.serviceAreaCode,
    isOpen,
    isServiceable,
    ratingLabel,
    etaLabel,
    heroImageUrl: dto.heroImageUrl ?? null,
    logoUrl: dto.logoUrl ?? null,
    statusBadge,
  };
}

export function toDetailViewModel(dto: DshStoreDetailDto): DshStoreDetailViewModel {
  const card = toCardViewModel(dto);
  return {
    ...card,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
