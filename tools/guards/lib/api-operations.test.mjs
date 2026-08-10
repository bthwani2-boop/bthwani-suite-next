import assert from "node:assert";
import test from "node:test";
import { MUTATION_METHODS, extractApiCallSites, pathsAreCompatible } from "./api-operations.mjs";

const extract = (source, options) => extractApiCallSites("sample.ts", source, options);

test("pathsAreCompatible matches parameter positions but not different shapes", () => {
  assert.ok(pathsAreCompatible("/dsh/a/{param}/b", "/dsh/a/{id}/b"));
  assert.ok(pathsAreCompatible("/dsh/a/123/b", "/dsh/a/{id}/b"));
  assert.ok(!pathsAreCompatible("/dsh/a/b", "/dsh/a/{id}/b"));
  assert.ok(!pathsAreCompatible("/dsh/a/{param}/c", "/dsh/a/{id}/b"));
});

test("a literal mutation is reported with its method and path", () => {
  const sites = extract(`request("/dsh/finance/x", { method: "POST" });`);
  assert.deepStrictEqual(
    sites.map((s) => [s.method, s.path, s.methodSource]),
    [["POST", "/dsh/finance/x", "literal"]],
  );
});

// tryGet(path, mapper) passes a function, not an options object. Treating that
// as an unprovable method would flag every read helper in the boundary layer.
test("a call with no options object is not mistaken for a dynamic method", () => {
  const sites = extract(`tryGet("/dsh/finance/x", (body) => body);`);
  assert.strictEqual(sites.length, 1);
  assert.strictEqual(sites[0].methodSource, "absent");
  assert.ok(!MUTATION_METHODS.has(sites[0].method));
});

test("a computed method stays unprovable", () => {
  const sites = extract(`request("/dsh/finance/x", { method: chosenMethod });`);
  assert.strictEqual(sites[0].methodSource, "dynamic");
  assert.strictEqual(sites[0].method, null);
});

test("a path taken from a const map resolves to every declared route", () => {
  const sites = extract(`
    const pathByActor = {
      partner: "/dsh/partner/me/finance/payout-destination",
      captain: "/dsh/captain/me/finance/payout-destination",
    };
    request(pathByActor[actorType], { method: "PUT" });
  `);
  assert.deepStrictEqual(sites.map((s) => s.path).sort(), [
    "/dsh/captain/me/finance/payout-destination",
    "/dsh/partner/me/finance/payout-destination",
  ]);
});

test("a path built by a local function resolves to every returned route", () => {
  const sites = extract(`
    function actionPath(id, action) {
      switch (action) {
        case "adjust": return \`/dsh/finance/commissions/\${id}/adjust\`;
        case "settle": return \`/dsh/finance/commissions/\${id}/settle\`;
      }
    }
    request(actionPath(id, action), { method: "POST" });
  `);
  assert.deepStrictEqual(sites.map((s) => s.path).sort(), [
    "/dsh/finance/commissions/{param}/adjust",
    "/dsh/finance/commissions/{param}/settle",
  ]);
});

// The blanket .wlt-mutation-approved file used to hide exactly this: a mutation
// whose path cannot be resolved is unprovable and must surface, not be skipped.
test("an unresolvable mutation path is reported when requested", () => {
  const source = `request(buildPathSomehow(x), { method: "DELETE" });`;
  assert.deepStrictEqual(extract(source), []);

  const reported = extract(source, { reportUnresolvedMutationPaths: true });
  assert.strictEqual(reported.length, 1);
  assert.strictEqual(reported[0].path, null);
  assert.strictEqual(reported[0].method, "DELETE");
});

test("an unresolvable read is not reported", () => {
  const sites = extract(`request(buildPathSomehow(x));`, { reportUnresolvedMutationPaths: true });
  assert.deepStrictEqual(sites, []);
});
