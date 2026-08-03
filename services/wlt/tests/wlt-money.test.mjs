import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "@typescript/typescript6";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.resolve(testDirectory, "../frontend/shared/dsh/finance/wlt-money.ts"),
  "utf8",
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const money = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);

test("currency fraction digits follow ISO metadata", () => {
  assert.equal(money.resolveWltCurrencyFractionDigits("YER"), 0);
  assert.equal(money.resolveWltCurrencyFractionDigits("USD"), 2);
  assert.equal(money.resolveWltCurrencyFractionDigits("SAR"), 2);
  assert.equal(money.resolveWltCurrencyFractionDigits("KWD"), 3);
  assert.throws(() => money.resolveWltCurrencyFractionDigits("not-a-currency"), { code: "INVALID_CURRENCY" });
});

test("minor and major unit inputs round trip exactly", () => {
  for (const [minorUnits, currency, expectedInput] of [
    [1234, "YER", "1234"],
    [1234, "USD", "12.34"],
    [1234, "KWD", "1.234"],
    [-50, "USD", "-0.50"],
  ]) {
    assert.equal(money.minorUnitsToWltMajorInput(minorUnits, currency), expectedInput);
    assert.deepEqual(money.parseWltMajorInputToMinorUnits(expectedInput, currency), { ok: true, minorUnits });
  }
});

test("major input rejects excess precision and unsafe values", () => {
  assert.deepEqual(money.parseWltMajorInputToMinorUnits("1.01", "YER"), { ok: false, code: "FRACTION_DIGITS_EXCEEDED" });
  assert.deepEqual(money.parseWltMajorInputToMinorUnits("1.234", "USD"), { ok: false, code: "FRACTION_DIGITS_EXCEEDED" });
  assert.deepEqual(money.parseWltMajorInputToMinorUnits("1e3", "USD"), { ok: false, code: "INVALID_AMOUNT" });
  assert.deepEqual(money.parseWltMajorInputToMinorUnits("9007199254740992", "YER"), { ok: false, code: "UNSAFE_AMOUNT" });
  assert.deepEqual(money.parseWltMajorInputToMinorUnits("1", "???"), { ok: false, code: "INVALID_CURRENCY" });
});

test("formatting rejects fabricated or unsafe financial values", () => {
  assert.match(money.formatWltMoney(1234, "YER", "en-US"), /1,234/);
  assert.match(money.formatWltMoney(1234, "USD", "en-US"), /12\.34/);
  assert.match(money.formatWltMoney(1234, "KWD", "en-US"), /1\.234/);
  assert.throws(() => money.formatWltMoney(Number.NaN, "USD"), { code: "UNSAFE_AMOUNT" });
});
