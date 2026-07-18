import { fail, lineNumber, read } from "../_guard-utils.mjs";

const guardId = "captain-surface-truth-gate";
const violations = [];

const checks = [
  {
    file: "services/dsh/frontend/shared/delivery/captain-availability.model.ts",
    forbidden: [
      [/useState<CaptainAvailabilityStatus>\(["']available["']\)/g, "DEFAULT_CAPTAIN_AVAILABLE_FORBIDDEN"],
      [/toggleCaptainAvailability/g, "LOCAL_AVAILABILITY_TOGGLE_FORBIDDEN"],
      [/setCaptainAvailabilityStatus/g, "LOCAL_AVAILABILITY_SETTER_FORBIDDEN"],
    ],
    required: [
      'useState<CaptainAvailabilityStatus>("unavailable")',
      "availabilityMutationReady: false",
    ],
  },
  {
    file: "services/dsh/frontend/shared/delivery/captain-gps.model.ts",
    forbidden: [
      [/useState<CaptainGpsStatus>\(["']limited["']\)/g, "DEFAULT_GPS_LIMITED_FORBIDDEN"],
      [/useState<CaptainGpsStatus>\(["']ready["']\)/g, "DEFAULT_GPS_READY_FORBIDDEN"],
    ],
    required: ['useState<CaptainGpsStatus>("disabled")'],
  },
  {
    file: "services/dsh/frontend/app-captain/DshCaptainSurface.tsx",
    forbidden: [
      [/\beval\s*\(/g, "DYNAMIC_SAFE_AREA_REQUIRE_FORBIDDEN"],
      [/Surface\s+as\s+any/g, "UNSAFE_SURFACE_CAST_FORBIDDEN"],
      [/as\s+NonNullable/g, "FORCED_ACTIVE_SUMMARY_FORBIDDEN"],
      [/captainDisplayName=["']["']/g, "EMPTY_CAPTAIN_DISPLAY_NAME_FORBIDDEN"],
      [/badgeLabel:\s*["'](?:مباشر|نشط|جاهز|اليوم|محلي|مفتوح)["']/g, "STATIC_CAPTAIN_STATUS_BADGE_FORBIDDEN"],
      [/accessibilityLabel:\s*["']البحث["'][\s\S]{0,180}support-directory/g, "MISLEADING_SEARCH_ACTION_FORBIDDEN"],
    ],
    required: [
      "useSafeAreaInsets",
      "identity.state.kind !== \"authenticated\"",
      "availabilityMutationReady",
      "activeSummary={derived.activeSummary ?? null}",
      "captainDisplayName={captainId}",
    ],
  },
  {
    file: "services/dsh/frontend/app-captain/DshCaptainRouteRenderer.tsx",
    forbidden: [
      [/rating:\s*["']?4\.9/g, "STATIC_CAPTAIN_RATING_FORBIDDEN"],
      [/المستوى الذهبي|منذ عامين|الوردية الحالية|صنف في الطلب/g, "SEEDED_CAPTAIN_PROFILE_FORBIDDEN"],
      [/itemsCount=\{?3\}?/g, "STATIC_PICKUP_ITEM_COUNT_FORBIDDEN"],
      [/Promise<any>/g, "UNSAFE_LOCATION_PROMISE_ANY_FORBIDDEN"],
      [/return\s+null\s*;/g, "UNKNOWN_CAPTAIN_ROUTE_NULL_FORBIDDEN"],
      [/onRetry=\{\(\)\s*=>\s*\{\s*\}\}/g, "EMPTY_CAPTAIN_RETRY_FORBIDDEN"],
      [/DshCaptainOrderChatScreen/g, "LOCAL_CAPTAIN_CHAT_SCREEN_FORBIDDEN"],
    ],
    required: [
      "MissingAssignment",
      "مراسلات الطلب غير مفعلة",
      "الوثائق والتقييم غير مربوطين",
      "الدوام والإجازات غير مربوطين",
      "مسار كابتن غير معروف",
      "onRetryInbox",
    ],
  },
  {
    file: "services/dsh/frontend/app-captain/useDshCaptainSurfaceModel.ts",
    forbidden: [
      [/toggleCaptainAvailability/g, "MODEL_LOCAL_AVAILABILITY_TOGGLE_FORBIDDEN"],
      [/setCaptainAvailabilityStatus/g, "MODEL_LOCAL_AVAILABILITY_SETTER_FORBIDDEN"],
    ],
    required: ["retryInbox: inbox.refresh", "captainRuntimeId"],
  },
];

for (const check of checks) {
  const content = read(check.file);
  for (const [pattern, message] of check.forbidden) {
    for (const match of content.matchAll(pattern)) {
      violations.push({
        file: check.file,
        line: lineNumber(content, match.index),
        message,
      });
    }
  }
  for (const marker of check.required) {
    if (!content.includes(marker)) {
      violations.push({
        file: check.file,
        line: 0,
        message: `REQUIRED_CAPTAIN_SURFACE_MARKER_MISSING ${marker}`,
      });
    }
  }
}

fail(guardId, violations);
