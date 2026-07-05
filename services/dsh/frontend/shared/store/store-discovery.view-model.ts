import type { DshStoreSummaryDto, DshStoreDetailDto } from "./store-discovery.types";
import { resolveDshImageSource } from "../_kernel/dsh-media-url";
import {
  formatDeliveryMode,
  formatServiceArea,
} from "./store-discovery.formatters";

type StoreTone = "restaurant" | "grocery" | "pharmacy" | "bakery" | "default";
type PlaceholderTone = "brandAction" | "success" | "info" | "warning" | "default";

export type DshStoreCardViewModel = {
  readonly id: string;
  readonly displayName: string;
  readonly cityCode: string;
  readonly serviceAreaCode: string;
  readonly locationLabel: string;
  readonly isOpen: boolean;
  readonly isServiceable: boolean;
  readonly ratingLabel: string | null;
  readonly ratingAverage: number | null;
  readonly etaLabel: string | null;
  readonly heroImageSource: { uri: string } | null;
  readonly logoImageSource: { uri: string } | null;
  readonly statusBadge: string | null;
  readonly isFreeDelivery: boolean;
  readonly placeholderEmoji: string;
  readonly placeholderTone: PlaceholderTone;
  readonly deliveryModeLabels: readonly string[];
  readonly distanceLabel: string | null;
  readonly distanceKm: number | null;
  readonly followerCountLabel: string | null;
  readonly hasProBadge: boolean;
  readonly hasCouponBadge: boolean;
  readonly pointsMultiplier: number | null;
  readonly isPopular: boolean;
  /** true only when backend confirms partner onboarding_status = 'client_visible' */
  readonly isClientEligible: boolean;
};

export type DshStoreDetailViewModel = DshStoreCardViewModel & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

const CITY_NAMES: Record<string, string> = {
  sana: "صنعاء",
};

const AREA_NAMES: Record<string, string> = {
  haddah: "حي حدة",
  sabeen: "حي السبعين",
  "taiz-st": "شارع تعز",
  zubairi: "شارع الزبيري",
  "old-city": "صنعاء القديمة",
  maeen: "حي معين",
};

const CATEGORY_EMOJI: Record<StoreTone, string> = {
  restaurant: "🍽️",
  grocery: "🏪",
  pharmacy: "💊",
  bakery: "🥖",
  default: "🛍️",
};

const CATEGORY_TONE: Record<StoreTone, PlaceholderTone> = {
  restaurant: "brandAction",
  grocery: "success",
  pharmacy: "info",
  bakery: "warning",
  default: "default",
};

function formatFollowerCount(count: number): string | null {
  if (count <= 0) return null;
  if (count >= 1000) {
    const compact = new Intl.NumberFormat("ar", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(count);
    return compact;
  }
  return new Intl.NumberFormat("ar").format(count);
}

export function toCardViewModel(dto: DshStoreSummaryDto): DshStoreCardViewModel {
  const isOpen = dto.status === "active";
  const isServiceable =
    dto.serviceability.status === "serviceable" ||
    dto.serviceability.status === "limited";
  const ratingCount = dto.ratingCount ?? 0;
  const category = dto.category as StoreTone;

  return {
    id: dto.id,
    displayName: dto.displayName,
    cityCode: dto.cityCode,
    serviceAreaCode: dto.serviceAreaCode,
    locationLabel: formatServiceArea(
      CITY_NAMES[dto.cityCode] ?? dto.cityCode,
      AREA_NAMES[dto.serviceAreaCode] ?? dto.serviceAreaCode,
    ),
    isOpen,
    isServiceable,
    ratingLabel:
      dto.ratingAverage != null && ratingCount > 0
        ? `${dto.ratingAverage.toFixed(1)} (${ratingCount})`
        : null,
    ratingAverage: dto.ratingAverage ?? null,
    etaLabel:
      dto.deliveryEtaMin != null && dto.deliveryEtaMax != null
        ? `${dto.deliveryEtaMin}–${dto.deliveryEtaMax} دقيقة`
        : null,
    heroImageSource: resolveDshImageSource(dto.heroImageUrl),
    logoImageSource: resolveDshImageSource(dto.logoUrl),
    statusBadge:
      dto.status === "temporarily_closed"
        ? "مغلق مؤقتاً"
        : dto.status === "inactive"
          ? "غير متاح"
          : dto.serviceability.status === "limited"
            ? "توصيل محدود"
            : dto.serviceability.status === "out_of_area"
              ? "خارج نطاق التوصيل"
              : null,
    isFreeDelivery: dto.isFreeDelivery,
    placeholderEmoji: CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.default,
    placeholderTone: CATEGORY_TONE[category] ?? CATEGORY_TONE.default,
    deliveryModeLabels: dto.deliveryModes.map(formatDeliveryMode),
    distanceLabel: dto.distanceKm == null ? null : `${dto.distanceKm.toFixed(1)} كم`,
    distanceKm: dto.distanceKm ?? null,
    followerCountLabel: formatFollowerCount(dto.followerCount),
    hasProBadge: dto.hasProBadge,
    hasCouponBadge: dto.hasCouponBadge,
    pointsMultiplier: dto.pointsMultiplier ?? null,
    isPopular: dto.isPopular,
    isClientEligible: (dto as { publicationEligible?: boolean }).publicationEligible ?? false,
  };
}

export function toDetailViewModel(dto: DshStoreDetailDto): DshStoreDetailViewModel {
  return {
    ...toCardViewModel(dto),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
