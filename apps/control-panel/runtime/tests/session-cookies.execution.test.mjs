import assert from "node:assert/strict";
import test from "node:test";

const {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} = await import(new URL("../src/server/session-cookies.ts", import.meta.url).href);

function fakeResponse() {
  const calls = [];
  return {
    calls,
    response: {
      cookies: {
        set: (...args) => calls.push(args),
      },
    },
  };
}

test("control-panel session cookies are HttpOnly strict and server-owned", () => {
  const { calls, response } = fakeResponse();
  setSessionCookies(response, { accessToken: "access", refreshToken: "refresh" });
  assert.equal(ACCESS_TOKEN_COOKIE, "dsh_cp_at");
  assert.equal(REFRESH_TOKEN_COOKIE, "dsh_cp_rt");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(([name, value]) => [name, value]), [
    ["dsh_cp_at", "access"],
    ["dsh_cp_rt", "refresh"],
  ]);
  for (const [, , options] of calls) {
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "strict");
    assert.equal(options.path, "/");
    assert.ok(options.maxAge > 0);
  }
});

test("control-panel logout clears both canonical cookies", () => {
  const { calls, response } = fakeResponse();
  clearSessionCookies(response);
  assert.deepEqual(calls.map(([name, value, options]) => [name, value, options.maxAge]), [
    ["dsh_cp_at", "", 0],
    ["dsh_cp_rt", "", 0],
  ]);
});
