import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  FIELD_ONBOARDING_STEPS,
  getDocumentsMissingCount,
  getFieldRequiredMissingItems,
} = await import("../dist/services/dsh/frontend/shared/field-onboarding/field-onboarding.types.js");

const requiredDocumentTypes = ["national_id", "commercial_register"];

const completeForm = {
  ownerName: "مالك تجريبي",
  primaryPhone: "770000000",
  city: "sana",
  addressLine: "شارع تجريبي",
  storefrontPhotoRef: "media://storefront",
  interiorPhotoRef: "media://interior",
  signagePhotoRef: "media://signage",
  operatingHours: "9-5",
  deliveryReadiness: "جاهز",
  beneficiaryName: "مالك تجريبي",
  bankName: "بنك تجريبي",
  accountNumber: "123456789",
  settlementPreference: "bank_transfer",
};

const canSubmit = (form, uploadedDocumentTypes, partnerId = "prt_test") =>
  Boolean(partnerId) && getFieldRequiredMissingItems(form, uploadedDocumentTypes).length === 0;

describe("field onboarding validation", () => {
  test("documents and branch photos block submission", () => {
    assert.equal(getDocumentsMissingCount([], {}), 5);
    assert.equal(canSubmit(completeForm, []), false);
  });

  test("bank account fields block submission after documents and photos are complete", () => {
    const { beneficiaryName, bankName, accountNumber, settlementPreference, ...formWithoutBank } = completeForm;
    assert.equal(canSubmit(formWithoutBank, requiredDocumentTypes), false);
  });

  test("all required documents, photos, bank data, and partner id allow submission", () => {
    assert.equal(getDocumentsMissingCount(requiredDocumentTypes, completeForm), 0);
    assert.equal(canSubmit(completeForm, requiredDocumentTypes), true);
  });

  test("controller step order matches the visible wizard groups", () => {
    assert.deepEqual([...FIELD_ONBOARDING_STEPS], [
      "basics_profile",
      "location_media",
      "evidence",
      "bank_account",
      "agreement_review",
    ]);
  });
});
