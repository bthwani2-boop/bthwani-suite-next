import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  EMPTY_HOME_ADMIN_INPUT,
  classifyAdminError,
  describeAdminMutationError,
} = await import("../dist/services/dsh/frontend/shared/home-discovery/home-discovery-admin.js");

describe("home discovery admin shared brain", () => {
  test("opens new content as an unpublished draft", () => {
    assert.deepEqual(EMPTY_HOME_ADMIN_INPUT, {
      title: "",
      subtitle: "",
      badgeLabel: "",
      imageUrl: "",
      actionType: "none",
      actionTarget: "",
      sortOrder: 0,
      isActive: false,
      publicationStatus: "draft",
    });
  });

  test("maps auth and network failures to stable UI states", () => {
    assert.deepEqual(classifyAdminError({ kind: "http", status: 403 }), {
      kind: "permission_denied",
    });
    assert.deepEqual(classifyAdminError({ kind: "network", message: "down" }), {
      kind: "error",
      message: "خدمة إدارة محتوى الصفحة الرئيسية غير متاحة.",
    });
  });

  test("explains optimistic concurrency conflicts", () => {
    assert.equal(
      describeAdminMutationError({ kind: "http", status: 409 }),
      "تم تعديل العنصر من مستخدم آخر. حدّث القائمة ثم أعد المحاولة.",
    );
  });
});
