// Auth is the highest-risk logic in the app: a regression here either locks
// every user out or lets anyone in. These tests run against the real Web
// Crypto implementation, the same primitive the Workers runtime provides.
import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { hashPassword, verifyPassword } from "../password.server.ts";

describe("hashPassword", () => {
  test("returns a base64 hash and salt, never the password itself", async () => {
    const { hash, salt } = await hashPassword("correct horse battery staple");
    assert.match(hash, /^[A-Za-z0-9+/]+=*$/);
    assert.match(salt, /^[A-Za-z0-9+/]+=*$/);
    assert.equal(atob(hash).length, 32); // 256-bit derived key
    assert.equal(atob(salt).length, 16); // 128-bit salt
    assert.ok(!hash.includes("correct"));
  });

  test("salts every hash, so identical passwords never collide", async () => {
    const a = await hashPassword("hunter2");
    const b = await hashPassword("hunter2");
    assert.notEqual(a.salt, b.salt);
    assert.notEqual(a.hash, b.hash);
  });
});

describe("verifyPassword", () => {
  test("accepts the password it was derived from", async () => {
    const { hash, salt } = await hashPassword("s3cret-passphrase");
    assert.equal(await verifyPassword("s3cret-passphrase", hash, salt), true);
  });

  test("rejects a wrong password", async () => {
    const { hash, salt } = await hashPassword("s3cret-passphrase");
    assert.equal(await verifyPassword("s3cret-passphras", hash, salt), false);
    assert.equal(await verifyPassword("S3cret-passphrase", hash, salt), false);
    assert.equal(await verifyPassword("", hash, salt), false);
  });

  test("rejects the right password against another user's salt", async () => {
    const a = await hashPassword("shared-password");
    const b = await hashPassword("shared-password");
    assert.equal(await verifyPassword("shared-password", a.hash, b.salt), false);
  });

  test("rejects when the stored hash or salt is missing", async () => {
    // Rows written before a column existed, or a half-finished signup, must
    // not authenticate — least of all against an empty password.
    assert.equal(await verifyPassword("anything", "", ""), false);
    assert.equal(await verifyPassword("", "", ""), false);
    const { hash, salt } = await hashPassword("pw");
    assert.equal(await verifyPassword("pw", "", salt), false);
    assert.equal(await verifyPassword("pw", hash, ""), false);
  });

  test("handles unicode and long passphrases byte-exactly", async () => {
    const pw = "пароль🎸 Düsseldorf — " + "x".repeat(300);
    const { hash, salt } = await hashPassword(pw);
    assert.equal(await verifyPassword(pw, hash, salt), true);
    assert.equal(await verifyPassword(pw.slice(0, -1), hash, salt), false);
  });

  test("is deterministic for a fixed salt", async () => {
    const { hash, salt } = await hashPassword("repeatable");
    for (let i = 0; i < 3; i++) {
      assert.equal(await verifyPassword("repeatable", hash, salt), true);
    }
  });
});
