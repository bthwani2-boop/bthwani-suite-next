import { describe, test } from "node:test";
import assert from "node:assert/strict";

const {
  EMPTY_HOME_ADMIN_INPUT,
  classifyAdminError,
} = await import("../dist/services/dsh/frontend/shared/home-discovery/home-discovery-admin.js");

describe("home discovery admin shared brain", () => {
  test("provides a production-shaped empty editor contract", () => {
    assert.deepEqual(EMPTY_HOME_ADMIN_INPUT, {
      title: "",
      subtitle: "",
      badgeLabel: "",
      imageUrl: "",
      actionType: "none",
      actionTarget: "",
      sortOrder: 0,
      isActive: true,
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
});
