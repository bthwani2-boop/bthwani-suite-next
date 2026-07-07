/**
 * DSH Fulfillment Surface Visibility
 * Live runtime code — read by routing and surface-gating logic.
 *
 * Defines which DSH surface sees what, for each delivery mode.
 * This is the single source of truth for "does surface X see/do Y when mode is Z?"
 *
 * Use this to:
 *   - filter captain inbox (only bthwani_delivery)
 *   - show/hide partner courier status
 *   - show/hide captain tracking in client order screen
 *   - control CP dispatch queue visibility
 *   - guard PoD requirement per mode
 *
 * Do NOT duplicate delivery mode flags inline across surfaces.
 * Import from here and from dsh-delivery-mode.model.ts.
 */

import {
  getDshDeliveryModeDefinition,
  getDshModeTrackingStageFilter,
  isDshModeDispatchRequired,
  type DshFulfillmentDeliveryMode,
  type DshDeliveryModeTrackingStageFilter,
} from '../delivery/delivery.contract';

// ─── Surface capability per mode ──────────────────────────────────────────────

export type DshSurfaceModeCapability = {
  readonly mode: DshFulfillmentDeliveryMode;

  // ── app-client ──────────────────────────────────────────────────────────────
  readonly client: {
    /** Show captain name, location, ETA in tracking screen */
    readonly showCaptainTracking: boolean;
    /** Show partner courier status card */
    readonly showPartnerCourierStatus: boolean;
    /** Show pickup instructions + store map pin */
    readonly showPickupInstructions: boolean;
    /** Show delivery dropoff address */
    readonly showDropoffAddress: boolean;
    /** Can client request cancellation at checkout for this mode? */
    readonly cancellationAllowedAtCheckout: boolean;
  };

  // ── app-partner ─────────────────────────────────────────────────────────────
  readonly partner: {
    /** Partner receives the order in their inbox */
    readonly receivesOrder: boolean;
    /** Partner must confirm preparation for this mode */
    readonly preparationRequired: boolean;
    /** Partner manages their own courier for this mode */
    readonly manageCourier: boolean;
    /** Partner sees captain status for this order */
    readonly seeCaptainStatus: boolean;
    /** PoD submission is partner's responsibility (not captain's) */
    readonly partnerPod: boolean;
  };

  // ── app-captain ─────────────────────────────────────────────────────────────
  readonly captain: {
    /** Order appears in captain bell / inbox */
    readonly visibleInInbox: boolean;
    /** Captain performs pickup from store */
    readonly performsPickup: boolean;
    /** Captain delivers to customer */
    readonly performsDelivery: boolean;
    /** PoD required from captain */
    readonly podRequired: boolean;
    /** Captain collects COD for this mode */
    readonly collectsCod: boolean;
    /** Why invisible (if not visible) */
    readonly hiddenReason?: string;
  };

  // ── app-field ───────────────────────────────────────────────────────────────
  readonly field: {
    /** Field agent is involved in onboarding related to this mode */
    readonly involvedInOnboarding: boolean;
    /** Field agent monitors store readiness for this mode */
    readonly monitorsStoreReadiness: boolean;
  };

  // ── control-panel ───────────────────────────────────────────────────────────
  readonly controlPanel: {
    /** Order enters captain dispatch assignment queue */
    readonly dispatchQueueEntry: boolean;
    /** CP shows captain assignment card for this order */
    readonly showCaptainAssignment: boolean;
    /** CP shows store-delivery monitoring (not captain dispatch) */
    readonly showStoreDeliveryMonitoring: boolean;
    /** CP shows store pickup readiness */
    readonly showPickupReadiness: boolean;
    /** CP finance: COD appears in WLT settlement list for this mode */
    readonly codInSettlement: boolean;
  };

  // ── Tracking timeline filter ────────────────────────────────────────────────
  readonly trackingFilter: DshDeliveryModeTrackingStageFilter;
};

// ─── Surface visibility table ─────────────────────────────────────────────────

export const DSH_SURFACE_MODE_CAPABILITIES: readonly DshSurfaceModeCapability[] = [

  // ── bthwani_delivery ────────────────────────────────────────────────────────
  {
    mode: 'bthwani_delivery',
    client: {
      showCaptainTracking: true,
      showPartnerCourierStatus: false,
      showPickupInstructions: false,
      showDropoffAddress: true,
      cancellationAllowedAtCheckout: true,
    },
    partner: {
      receivesOrder: true,
      preparationRequired: true,
      manageCourier: false,
      seeCaptainStatus: true,
      partnerPod: false,
    },
    captain: {
      visibleInInbox: true,
      performsPickup: true,
      performsDelivery: true,
      podRequired: true,
      collectsCod: true,
    },
    field: {
      involvedInOnboarding: true,
      monitorsStoreReadiness: true,
    },
    controlPanel: {
      dispatchQueueEntry: true,
      showCaptainAssignment: true,
      showStoreDeliveryMonitoring: false,
      showPickupReadiness: false,
      codInSettlement: true,
    },
    trackingFilter: getDshModeTrackingStageFilter('bthwani_delivery'),
  },

  // ── partner_delivery ────────────────────────────────────────────────────────
  {
    mode: 'partner_delivery',
    client: {
      showCaptainTracking: false,
      showPartnerCourierStatus: true,
      showPickupInstructions: false,
      showDropoffAddress: true,
      cancellationAllowedAtCheckout: true,
    },
    partner: {
      receivesOrder: true,
      preparationRequired: true,
      manageCourier: true,
      seeCaptainStatus: false,
      partnerPod: true,
    },
    captain: {
      visibleInInbox: false,
      performsPickup: false,
      performsDelivery: false,
      podRequired: false,
      collectsCod: false,
      hiddenReason: 'توصيل المتجر — لا دور للكابتن في هذا النوع',
    },
    field: {
      involvedInOnboarding: true,
      monitorsStoreReadiness: true,
    },
    controlPanel: {
      dispatchQueueEntry: false,
      showCaptainAssignment: false,
      showStoreDeliveryMonitoring: true,
      showPickupReadiness: false,
      codInSettlement: false,
    },
    trackingFilter: getDshModeTrackingStageFilter('partner_delivery'),
  },

  // ── pickup ───────────────────────────────────────────────────────────────────
  {
    mode: 'pickup',
    client: {
      showCaptainTracking: false,
      showPartnerCourierStatus: false,
      showPickupInstructions: true,
      showDropoffAddress: false,
      cancellationAllowedAtCheckout: true,
    },
    partner: {
      receivesOrder: true,
      preparationRequired: true,
      manageCourier: false,
      seeCaptainStatus: false,
      partnerPod: false,
    },
    captain: {
      visibleInInbox: false,
      performsPickup: false,
      performsDelivery: false,
      podRequired: false,
      collectsCod: false,
      hiddenReason: 'استلام ذاتي — لا دور للكابتن',
    },
    field: {
      involvedInOnboarding: true,
      monitorsStoreReadiness: true,
    },
    controlPanel: {
      dispatchQueueEntry: false,
      showCaptainAssignment: false,
      showStoreDeliveryMonitoring: false,
      showPickupReadiness: true,
      codInSettlement: false,
    },
    trackingFilter: getDshModeTrackingStageFilter('pickup'),
  },
] as const;

// ─── Lookup functions ─────────────────────────────────────────────────────────

export function getSurfaceModeCapability(
  mode: DshFulfillmentDeliveryMode,
): DshSurfaceModeCapability {
  return (
    DSH_SURFACE_MODE_CAPABILITIES.find((c) => c.mode === mode)
    ?? DSH_SURFACE_MODE_CAPABILITIES[0]!
  );
}

// ── Client helpers ─────────────────────────────────────────────────────────

function shouldShowCaptainTrackingForClient(mode: DshFulfillmentDeliveryMode): boolean {
  return getSurfaceModeCapability(mode).client.showCaptainTracking;
}

function shouldShowDropoffAddressForClient(mode: DshFulfillmentDeliveryMode): boolean {
  return getSurfaceModeCapability(mode).client.showDropoffAddress;
}

// ── Captain helpers ────────────────────────────────────────────────────────

function isModeVisibleInCaptainInbox(mode: DshFulfillmentDeliveryMode): boolean {
  return getSurfaceModeCapability(mode).captain.visibleInInbox;
}

export function isCaptainPodRequiredForMode(mode: DshFulfillmentDeliveryMode): boolean {
  return getSurfaceModeCapability(mode).captain.podRequired;
}

export function isCaptainCodCollectorForMode(mode: DshFulfillmentDeliveryMode): boolean {
  return getSurfaceModeCapability(mode).captain.collectsCod;
}

// ── Partner helpers ────────────────────────────────────────────────────────

function isPartnerCourierManagedByPartner(mode: DshFulfillmentDeliveryMode): boolean {
  return getSurfaceModeCapability(mode).partner.manageCourier;
}

// ── Control-panel helpers ──────────────────────────────────────────────────

export function shouldEnterDispatchQueueForMode(mode: DshFulfillmentDeliveryMode): boolean {
  return isDshModeDispatchRequired(mode);
}

export function shouldShowCaptainAssignmentInCP(mode: DshFulfillmentDeliveryMode): boolean {
  return getSurfaceModeCapability(mode).controlPanel.showCaptainAssignment;
}

// ── Summary label for a surface's role per mode ────────────────────────────

export function getSurfaceRoleSummaryForMode(
  surfaceId: 'app-client' | 'app-partner' | 'app-captain' | 'app-field' | 'control-panel',
  mode: DshFulfillmentDeliveryMode,
): string {
  const def = getDshDeliveryModeDefinition(mode);
  const cap = getSurfaceModeCapability(mode);

  switch (surfaceId) {
    case 'app-client':
      return cap.client.showCaptainTracking
        ? `${def.label} — تتبع الكابتن مفعّل`
        : cap.client.showPartnerCourierStatus
        ? `${def.label} — تتبع موصل المتجر`
        : `${def.label} — استلام ذاتي`;

    case 'app-partner':
      return cap.partner.manageCourier
        ? `${def.label} — الشريك يدير التوصيل`
        : cap.partner.preparationRequired
        ? `${def.label} — تجهيز مطلوب`
        : `${def.label} — قراءة فقط`;

    case 'app-captain':
      return cap.captain.visibleInInbox
        ? `${def.label} — مرئي في قائمة الكابتن`
        : `${def.label} — ${cap.captain.hiddenReason ?? 'لا دور للكابتن'}`;

    case 'app-field':
      return `${def.label} — مراقبة جاهزية المتجر`;

    case 'control-panel':
      return cap.controlPanel.dispatchQueueEntry
        ? `${def.label} — يدخل قائمة الإسناد`
        : cap.controlPanel.showStoreDeliveryMonitoring
        ? `${def.label} — مراقبة توصيل المتجر`
        : `${def.label} — مراقبة الاستلام الذاتي`;
  }
}
