import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  FIELD_ONBOARDING_STEPS,
  getRequiredPartnerDocuments,
  getDocumentsMissingCount,
  getFieldRequiredMissingItems,
} = await import("../dist/services/dsh/frontend/shared/field-onboarding/field-onboarding.types.js");

const completeForm = {
  legalNameAr: "اسم متجر تجريبي",
  displayName: "اسم متجر تجريبي",
  legalIdentityType: "commercial_register",
  legalIdentityNumber: "1234567890",
  ownerName: "مالك تجريبي",
  primaryPhone: "770000000",
  city: "sana",
  addressLine: "شارع تجريبي",
  operatingHours: "السبت–الخميس 08:00–23:00",
  deliveryReadiness: "bthwani_couriers",
};

const canCompleteOperationalForm = (form, uploadedDocumentTypes, partnerId = "prt_test") =>
  Boolean(partnerId) && getFieldRequiredMissingItems(form, uploadedDocumentTypes).length === 0;

describe("field onboarding validation", () => {
  test("commercial registration requires registry and owner identity", () => {
    assert.deepEqual(
      getRequiredPartnerDocuments({ legalIdentityType: "commercial_register" }).map((item) => item.documentType),
      ["commercial_register", "national_id"],
    );
    assert.equal(getDocumentsMissingCount([], completeForm), 2);
    assert.equal(getDocumentsMissingCount(["commercial_register", "national_id"], completeForm), 0);
  });

  test("national identity intake does not incorrectly require a commercial registration", () => {
    const form = { ...completeForm, legalIdentityType: "national_id" };
    assert.deepEqual(
      getRequiredPartnerDocuments(form).map((item) => item.documentType),
      ["national_id"],
    );
    assert.equal(canCompleteOperationalForm(form, ["national_id"]), true);
  });

  test("freelancer intake requires identity plus the current governed other-document slot", () => {
    const form = { ...completeForm, legalIdentityType: "freelancer_certificate" };
    assert.deepEqual(
      getRequiredPartnerDocuments(form).map((item) => item.documentType),
      ["national_id", "other"],
    );
    assert.equal(canCompleteOperationalForm(form, ["national_id", "other"]), true);
  });

  test("field form validates operational onboarding only", () => {
    assert.equal(canCompleteOperationalForm(completeForm, ["commercial_register", "national_id"]), true);
    assert.equal("bankName" in completeForm, false);
    assert.equal("accountNumber" in completeForm, false);
    assert.equal("settlementPreference" in completeForm, false);
  });

  test("missing governed evidence still blocks operational form completion", () => {
    assert.equal(canCompleteOperationalForm(completeForm, []), false);
    assert.deepEqual(
      getFieldRequiredMissingItems(completeForm, []),
      ["السجل التجاري", "الهوية الوطنية للمالك"],
    );
  });

  test("wizard includes catalog setup without embedding a payout-destination form", () => {
    assert.deepEqual([...FIELD_ONBOARDING_STEPS], [
      "basics_profile",
      "location_media",
      "evidence",
      "catalog_setup",
      "agreement_review",
    ]);
  });
});
