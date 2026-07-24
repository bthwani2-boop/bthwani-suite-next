export type CaptainInboxFulfillmentMode = 'bthwani_delivery';

/**
 * Captain assignments are sovereign BThwani-delivery records. Upstream objects
 * may carry unrelated fulfillment fields, but those fields must never reclassify
 * a captain inbox item as partner delivery or client pickup.
 */
export function resolveCaptainInboxFulfillmentMode(
  _assignment: unknown,
): CaptainInboxFulfillmentMode {
  return 'bthwani_delivery';
}
