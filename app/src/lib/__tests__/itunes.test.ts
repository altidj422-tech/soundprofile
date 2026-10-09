// `catalogKey` is computed on the client when a user picks a search result and
// again on the server when the row is matched in D1. If the two ever disagree,
// songs silently duplicate in the catalog — so the normalisation is pinned here.
import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { catalogKey, searchItunes } from "../itunes.ts";

describe("catalogKey", () => {
  test("is case-insensitive", () => {
    assert.equal(catalogKey("Little Wing", "Jimi Hendrix"), catalogKey("little wing", "jimi hendrix"));
    assert.equal(catalogKey("LITTLE WING", "JIMI HENDRIX"), catalogKey("Little Wing", "Jimi Hendrix"));
  });

  test("ignores surrounding whitespace from either side", () => {
    assert.equal(catalogKey("  Little Wing ", "Jimi Hendrix"), catalogKey("Little Wing", "Jimi Hendrix"));
    assert.equal(catalogKey("Little Wing", "\tJimi Hendrix\n"), catalogKey("Little Wing", "Jimi Hendrix"));
  });

  test("keeps title and artist apart", () => {
    assert.notEqual(catalogKey("Little Wing", "Jimi Hendrix"), catalogKey("Jimi Hendrix", "Little Wing"));
  });

  test("cannot be forged by a title containing the separator", () => {
    // The separator is U+241F (unit-separator symbol), not something a user
    // can type, so "A" + sep + "B" as a title must not collide with the pair.
    assert.notEqual(catalogKey("a␟b", ""), catalogKey("a", "b"));
  });

  test("distinguishes different songs and different artists", () => {
    assert.notEqual(catalogKey("Little Wing", "Jimi Hendrix"), catalogKey("Little Wing", "SRV"));
    assert.notEqual(catalogKey("Little Wing", "Jimi Hendrix"), catalogKey("Hey Joe", "Jimi Hendrix"));
  });

  test("preserves non-ascii titles", () => {
    assert.notEqual(catalogKey("Björk", "x"), catalogKey("Bjork", "x"));
  });
});

describe("searchItunes", () => {
  test("resolves empty during SSR instead of throwing on a missing DOM", async () => {
    assert.equal(typeof document, "undefined");
    assert.deepEqual(await searchItunes("little wing"), []);
  });

  test("resolves empty for a query too short to be worth a request", async () => {
    assert.deepEqual(await searchItunes(""), []);
    assert.deepEqual(await searchItunes(" a "), []);
  });
});
