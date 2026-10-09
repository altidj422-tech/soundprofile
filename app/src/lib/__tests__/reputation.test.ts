// Reputation decides who can overwrite other people's technique tags and
// remove comments, so the boundaries are worth pinning to the exact value.
import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { BAN_THRESHOLD, MOD_MIN_REP, isModerator } from "../reputation.ts";

describe("isModerator", () => {
  test("is true at the threshold and above", () => {
    assert.equal(isModerator(MOD_MIN_REP), true);
    assert.equal(isModerator(MOD_MIN_REP + 1), true);
    assert.equal(isModerator(1_000), true);
  });

  test("is false one point below the threshold", () => {
    assert.equal(isModerator(MOD_MIN_REP - 1), false);
  });

  test("is false for new and negative accounts", () => {
    assert.equal(isModerator(0), false);
    assert.equal(isModerator(-1), false);
    assert.equal(isModerator(BAN_THRESHOLD), false);
  });

  test("is monotonic — gaining reputation never removes moderator status", () => {
    let seenTrue = false;
    for (let rep = -20; rep <= 40; rep++) {
      const mod = isModerator(rep);
      if (mod) seenTrue = true;
      assert.equal(mod, seenTrue, `reputation ${rep} flipped back to non-moderator`);
    }
  });
});

describe("thresholds", () => {
  test("ban threshold sits below the moderator threshold", () => {
    assert.ok(BAN_THRESHOLD < 0);
    assert.ok(BAN_THRESHOLD < MOD_MIN_REP);
  });

  test("no reputation can be both bannable and moderator", () => {
    for (let rep = -20; rep <= 40; rep++) {
      assert.equal(rep <= BAN_THRESHOLD && isModerator(rep), false);
    }
  });
});
