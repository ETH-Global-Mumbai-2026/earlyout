import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtCut } from "../src/lib/format.ts";

test("fmtCut marks a deduction with a minus sign", () => {
  assert.equal(fmtCut(398), "−3.98%");
});

test("fmtCut shows a zero deduction without a minus sign", () => {
  assert.equal(fmtCut(0), "0.00%");
});
