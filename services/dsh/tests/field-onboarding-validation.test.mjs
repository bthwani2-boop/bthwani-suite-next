import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  FIELD_ONBOARDING_STEPS,
  getDocumentsMissingCount,
  getFieldRequiredMissingItems,
} = await import("../dist/services/dsh/frontend/shared/field-onboarding/field-onboarding.types.js");

const requiredDocumentTypes = ["national_id", "commercial_register"];

const completeForm = {
  legalNameAr: "اسم تجاري تجريبي",
  legalIdentityNumber: "1234567890",
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
  test("documents and branch photos do not block submission", () => {
    assert.equal(getDocumentsMissingCount([], {}), 0);
    assert.equal(canSubmit(completeForm, []), true);
  });

  test("bank account fields block submission when other required fields are complete but bank is missing", () => {
    const { beneficiaryName, bankName, accountNumber, settlementPreference, ...formWithoutBank } = completeForm;
    assert.equal(canSubmit(formWithoutBank, []), false);
  });

  test("all required non-document fields and partner id allow submission", () => {
    assert.equal(getDocumentsMissingCount([], completeForm), 0);
    assert.equal(canSubmit(completeForm, []), true);
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
