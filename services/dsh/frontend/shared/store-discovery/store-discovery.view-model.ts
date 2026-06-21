import type { DshStoreSummaryDto, DshStoreDetailDto } from "./store-discovery.types";

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
  readonly placeholderColor: string;
  readonly deliveryModeLabels: readonly string[];
  readonly distanceLabel: string | null;
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

// Media keys (dsh.store.*) are seed identifiers — not real URLs.
// Convert them to null so the card shows the emoji placeholder instead.
function resolveImageSource(raw: string | null | undefined): { uri: string } | null {
  if (raw == null || raw.trim() === "") return null;
  if (raw.startsWith("dsh.") || !raw.startsWith("http")) return null;

  let urlStr = raw;
  if (urlStr.includes("localhost") || urlStr.includes("127.0.0.1")) {
    const apiBaseUrl = process.env.EXPO_PUBLIC_DSH_API_BASE_URL;
    if (apiBaseUrl) {
      try {
        const apiParsed = new URL(apiBaseUrl);
        const rawParsed = new URL(urlStr);
        // Replace rawParsed host with apiParsed host, but keep MinIO port (59000)
        rawParsed.hostname = apiParsed.hostname;
        urlStr = rawParsed.toString();
      } catch {
        // Fallback to raw if parsing fails
      }
    }
  }

  return { uri: urlStr };
}

type CategoryMeta = { emoji: string; color: string; deliveryModes: string[] };

function resolveCategoryMeta(displayName: string): CategoryMeta {
  const lower = displayName.toLowerCase();
  if (lower.includes("bakery") || lower.includes("مخبز") || lower.includes("خبز") || lower.includes("حطين")) {
    return { emoji: "🥖", color: "#D97706", deliveryModes: ["توصيل", "استلام"] };
  }
  if (lower.includes("market") || lower.includes("grocery") || lower.includes("سوق") || lower.includes("بقالة") || lower.includes("العليا")) {
    return { emoji: "🏪", color: "#059669", deliveryModes: ["توصيل", "استلام", "⚡ ثواني"] };
  }
  if (lower.includes("restaurant") || lower.includes("مطعم") || lower.includes("cafe") || lower.includes("كافيه")) {
    return { emoji: "🍽️", color: "#EA580C", deliveryModes: ["توصيل", "استلام"] };
  }
  if (lower.includes("pharmacy") || lower.includes("صيدلية")) {
    return { emoji: "💊", color: "#7C3AED", deliveryModes: ["توصيل"] };
  }
  return { emoji: "🛍️", color: "#0A2F5C", deliveryModes: ["توصيل", "استلام"] };
}

const CITY_NAMES: Record<string, string> = {
  sana: "صنعاء",
  riyadh: "الرياض",
};

const AREA_NAMES: Record<string, string> = {
  haddah: "حي حدة",
  sabeen: "حي السبعين",
  "taiz-st": "شارع تعز",
  zubairi: "شارع الزبيري",
  "old-city": "صنعاء القديمة",
  maeen: "حي معين",
  olaya: "حي العليا",
  hittin: "حي حطين",
};

const DISPLAY_NAME_MAP: Record<string, string> = {
  "Haddah Central Market": "أسواق العليا الطازجة",
  "Al Sabeen Bakery": "مخبز حطين",
  "Taiz Street Market": "سوق شارع تعز",
  "Al Zubairi Grocery": "بقالة الزبيري",
  "Old City Restaurant": "مطعم المدينة القديمة",
  "Maeen Pharmacy": "صيدلية معين",
};

const STORE_PREMIUM_METADATA: Record<string, {
  readonly distanceLabel: string;
  readonly followerCountLabel: string;
  readonly hasProBadge: boolean;
  readonly hasCouponBadge: boolean;
  readonly pointsMultiplier: number | null;
  readonly isPopular: boolean;
}> = {
  "store-1001": {
    distanceLabel: "2.1 كم",
    followerCountLabel: "3.1 ألف",
    hasProBadge: true,
    hasCouponBadge: false,
    pointsMultiplier: 2,
    isPopular: true,
  },
  "store-1002": {
    distanceLabel: "1.8 كم",
    followerCountLabel: "1.2 ألف",
    hasProBadge: true,
    hasCouponBadge: true,
    pointsMultiplier: null,
    isPopular: false,
  },
  "store-1003": {
    distanceLabel: "3.5 كم",
    followerCountLabel: "850",
    hasProBadge: false,
    hasCouponBadge: false,
    pointsMultiplier: null,
    isPopular: false,
  },
  "store-1004": {
    distanceLabel: "1.2 كم",
    followerCountLabel: "2.4 ألف",
    hasProBadge: true,
    hasCouponBadge: false,
    pointsMultiplier: null,
    isPopular: false,
  },
  "store-1005": {
    distanceLabel: "0.5 كم",
    followerCountLabel: "5.2 ألف",
    hasProBadge: true,
    hasCouponBadge: true,
    pointsMultiplier: 3,
    isPopular: true,
  },
  "store-1006": {
    distanceLabel: "4.1 كم",
    followerCountLabel: "980",
    hasProBadge: false,
    hasCouponBadge: true,
    pointsMultiplier: null,
    isPopular: false,
  },
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
      ? `${dto.deliveryEtaMin}–${dto.deliveryEtaMax} دقيقة`
      : null;

  const statusBadge =
    dto.status === "temporarily_closed"
      ? "مغلق مؤقتاً"
      : dto.status === "inactive"
        ? "غير متاح"
        : dto.serviceability.status === "limited"
          ? "توصيل محدود"
          : dto.serviceability.status === "out_of_area"
            ? "خارج نطاق التوصيل"
            : null;

  const mappedDisplayName = DISPLAY_NAME_MAP[dto.displayName] ?? dto.displayName;
  const city = CITY_NAMES[dto.cityCode] ?? dto.cityCode;
  const area = AREA_NAMES[dto.serviceAreaCode] ?? dto.serviceAreaCode;
  const locationLabel = `${area} • ${city}`;

  const meta = resolveCategoryMeta(mappedDisplayName);

  const isFreeDelivery = isOpen && dto.serviceability.status === "serviceable";

  const premium = STORE_PREMIUM_METADATA[dto.id] ?? {
    distanceLabel: "1.5 كم",
    followerCountLabel: "1.0 ألف",
    hasProBadge: false,
    hasCouponBadge: false,
    pointsMultiplier: null,
    isPopular: false,
  };

  return {
    id: dto.id,
    displayName: mappedDisplayName,
    cityCode: dto.cityCode,
    serviceAreaCode: dto.serviceAreaCode,
    locationLabel,
    isOpen,
    isServiceable,
    ratingLabel,
    ratingAverage: dto.ratingAverage ?? null,
    etaLabel,
    heroImageSource: resolveImageSource(dto.heroImageUrl),
    logoImageSource: resolveImageSource(dto.logoUrl),
    statusBadge,
    isFreeDelivery,
    placeholderEmoji: meta.emoji,
    placeholderColor: meta.color,
    deliveryModeLabels: meta.deliveryModes,
    distanceLabel: premium.distanceLabel,
    followerCountLabel: premium.followerCountLabel,
    hasProBadge: premium.hasProBadge,
    hasCouponBadge: premium.hasCouponBadge,
    pointsMultiplier: premium.pointsMultiplier,
    isPopular: premium.isPopular,
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
