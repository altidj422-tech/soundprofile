// Cover art and labels render during SSR and again on the client. Anything
// non-deterministic here shows up as a hydration mismatch, so determinism is
// the property under test.
import assert from "node:assert/strict";
import test, { describe } from "node:test";

import {
  DIFFICULTY_LABELS,
  SKILL_LABELS,
  avatarGradient,
  coverGradient,
  difficultyLabel,
  initials,
  shortDate,
  skillLabel,
} from "../catalog.ts";

describe("difficultyLabel", () => {
  test("names every rating on the scale", () => {
    assert.equal(difficultyLabel(1), "Easy");
    assert.equal(difficultyLabel(3), "Intermediate");
    assert.equal(difficultyLabel(5), "Expert");
  });

  test("rounds an averaged community rating to the nearest step", () => {
    assert.equal(difficultyLabel(3.4), "Intermediate");
    assert.equal(difficultyLabel(3.6), "Advanced");
  });

  test("says Unrated when nobody has rated the song", () => {
    assert.equal(difficultyLabel(null), "Unrated");
    assert.equal(difficultyLabel(undefined), "Unrated");
  });

  test("falls back to a dash instead of undefined for out-of-range input", () => {
    assert.equal(difficultyLabel(0), "—");
    assert.equal(difficultyLabel(9), "—");
  });
});

describe("skillLabel", () => {
  test("names every skill level", () => {
    for (const n of [1, 2, 3, 4]) {
      assert.equal(skillLabel(n), SKILL_LABELS[n]);
    }
  });

  test("falls back to a dash for an unknown level", () => {
    assert.equal(skillLabel(0), "—");
    assert.equal(skillLabel(7), "—");
  });
});

describe("gradients", () => {
  test("are deterministic for the same hue", () => {
    assert.equal(coverGradient(210), coverGradient(210));
    assert.equal(avatarGradient(40), avatarGradient(40));
  });

  test("wrap hues outside 0–360 instead of emitting an invalid colour", () => {
    assert.equal(coverGradient(370), coverGradient(10));
    assert.equal(coverGradient(-10), coverGradient(350));
    assert.equal(avatarGradient(-1), avatarGradient(359));
  });

  test("only ever produce in-range hue components", () => {
    for (let hue = -400; hue <= 760; hue += 7) {
      for (const css of [coverGradient(hue), avatarGradient(hue)]) {
        const hues = [...css.matchAll(/hsl\((-?[\d.]+)/g)].map((m) => Number(m[1]));
        assert.ok(hues.length > 0, `no hsl() stops in ${css}`);
        for (const h of hues) {
          assert.ok(h >= 0 && h < 360, `hue ${h} out of range for input ${hue}`);
        }
      }
    }
  });

  test("are well-formed CSS gradients with balanced parentheses", () => {
    const cover = coverGradient(0);
    const avatar = avatarGradient(0);
    assert.match(cover, /^linear-gradient\(135deg, hsl\(/);
    assert.match(avatar, /^linear-gradient\(145deg, hsl\(/);
    for (const css of [cover, avatar]) {
      assert.ok(css.endsWith(")"));
      assert.equal((css.match(/\(/g) ?? []).length, (css.match(/\)/g) ?? []).length);
    }
    assert.equal((cover.match(/hsl\(/g) ?? []).length, 3); // three colour stops
    assert.equal((avatar.match(/hsl\(/g) ?? []).length, 2);
  });
});

describe("initials", () => {
  test("uses first and last initial for a full name", () => {
    assert.equal(initials("Jimi Hendrix"), "JH");
    assert.equal(initials("Ella Jane Fitzgerald"), "EF");
  });

  test("uses the first two letters of a single name", () => {
    assert.equal(initials("prince"), "PR");
  });

  test("ignores surrounding and repeated whitespace", () => {
    assert.equal(initials("  Nina   Simone  "), "NS");
  });

  test("never returns more than two characters", () => {
    for (const name of ["x", "Jimi Hendrix", "a b c d e", "  Solo  "]) {
      assert.ok(initials(name).length <= 2, `${name} -> ${initials(name)}`);
    }
  });
});

describe("shortDate", () => {
  test("formats a SQLite datetime without touching the locale", () => {
    assert.equal(shortDate("2026-07-18 14:03:22"), "Jul 18");
    assert.equal(shortDate("2026-01-01"), "Jan 1");
    assert.equal(shortDate("2026-12-09T10:00:00Z"), "Dec 9");
  });

  test("strips the leading zero from the day", () => {
    assert.equal(shortDate("2026-03-05"), "Mar 5");
  });

  test("returns an empty string rather than NaN for unparseable input", () => {
    assert.equal(shortDate(""), "");
    assert.equal(shortDate("yesterday"), "");
    assert.equal(shortDate("18/07/2026"), "");
  });

  test("covers all twelve months", () => {
    const seen = new Set<string>();
    for (let m = 1; m <= 12; m++) {
      const label = shortDate(`2026-${String(m).padStart(2, "0")}-15`);
      assert.match(label, /^[A-Z][a-z]{2} 15$/);
      seen.add(label.slice(0, 3));
    }
    assert.equal(seen.size, 12);
  });
});

describe("label tables", () => {
  test("every label is non-empty", () => {
    for (const table of [DIFFICULTY_LABELS, SKILL_LABELS]) {
      for (const value of Object.values(table)) {
        assert.ok(value.trim().length > 0);
      }
    }
  });
});
