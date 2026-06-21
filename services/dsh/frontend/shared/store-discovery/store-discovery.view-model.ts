import type { DshStoreSummaryDto, DshStoreDetailDto } from "./store-discovery.types";

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
};

export type DshStoreDetailViewModel = DshStoreCardViewModel & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

function resolveImageSource(raw: string | null | undefined): { uri: string } | null {
  if (raw == null || raw.trim() === "" || !raw.startsWith("http")) return null;
  let url = raw;
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    const apiBaseURL = process.env.EXPO_PUBLIC_DSH_API_BASE_URL;
    if (apiBaseURL) {
      try {
        const api = new URL(apiBaseURL);
        const media = new URL(url);
        media.hostname = api.hostname;
        url = media.toString();
      } catch {
        return null;
      }
    }
  }
  return { uri: url };
}

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

const DELIVERY_MODE_LABELS = {
  delivery: "توصيل",
  pickup: "استلام",
  express: "⚡ ثواني",
} as const;

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
    locationLabel: `${AREA_NAMES[dto.serviceAreaCode] ?? dto.serviceAreaCode} • ${CITY_NAMES[dto.cityCode] ?? dto.cityCode}`,
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
    heroImageSource: resolveImageSource(dto.heroImageUrl),
    logoImageSource: resolveImageSource(dto.logoUrl),
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
    deliveryModeLabels: dto.deliveryModes.map((mode) => DELIVERY_MODE_LABELS[mode]),
    distanceLabel: dto.distanceKm == null ? null : `${dto.distanceKm.toFixed(1)} كم`,
    distanceKm: dto.distanceKm ?? null,
    followerCountLabel: formatFollowerCount(dto.followerCount),
    hasProBadge: dto.hasProBadge,
    hasCouponBadge: dto.hasCouponBadge,
    pointsMultiplier: dto.pointsMultiplier ?? null,
    isPopular: dto.isPopular,
  };
}

export function toDetailViewModel(dto: DshStoreDetailDto): DshStoreDetailViewModel {
  return {
    ...toCardViewModel(dto),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
