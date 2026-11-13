import { test } from "node:test";
import assert from "node:assert/strict";
import { fundLogoFile } from "../src/lib/fundLogo.ts";

test("fund logo files are lowercase symbols, with + spelled out", () => {
  assert.equal(fundLogoFile("ACRED"), "acred.svg");
  assert.equal(fundLogoFile("ACREDd"), "acred.svg");
  assert.equal(fundLogoFile("CASH+"), "cash-plus.svg");
  assert.equal(fundLogoFile("Treasury+"), "treasury-plus.svg");
});
