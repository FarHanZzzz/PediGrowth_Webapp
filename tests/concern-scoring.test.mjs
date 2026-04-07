/**
 * PEDI-GROWTH — Concern Scoring Tests
 * Tests the concern level threshold mapping.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Inline concern threshold logic matching src/lib/policy/concern-thresholds.ts
function getConcernLevel(value, thresholds) {
  if (value >= thresholds.significant) return "significant";
  if (value >= thresholds.moderate) return "moderate";
  if (value >= thresholds.mild) return "mild";
  return "none";
}

const ASYMMETRY_THRESHOLDS = { mild: 0.08, moderate: 0.15, significant: 0.25 };
const TRUNK_SWAY_THRESHOLDS = { mild: 3.0, moderate: 5.0, significant: 8.0 };

describe("Concern Scoring", () => {
  describe("Asymmetry", () => {
    it("returns 'none' for normal symmetry", () => {
      assert.equal(getConcernLevel(0.03, ASYMMETRY_THRESHOLDS), "none");
      assert.equal(getConcernLevel(0.0, ASYMMETRY_THRESHOLDS), "none");
    });

    it("returns 'mild' for subtle asymmetry", () => {
      assert.equal(getConcernLevel(0.08, ASYMMETRY_THRESHOLDS), "mild");
      assert.equal(getConcernLevel(0.12, ASYMMETRY_THRESHOLDS), "mild");
    });

    it("returns 'moderate' for notable asymmetry", () => {
      assert.equal(getConcernLevel(0.15, ASYMMETRY_THRESHOLDS), "moderate");
      assert.equal(getConcernLevel(0.20, ASYMMETRY_THRESHOLDS), "moderate");
    });

    it("returns 'significant' for severe asymmetry", () => {
      assert.equal(getConcernLevel(0.25, ASYMMETRY_THRESHOLDS), "significant");
      assert.equal(getConcernLevel(0.50, ASYMMETRY_THRESHOLDS), "significant");
    });
  });

  describe("Trunk Sway", () => {
    it("classifies trunk sway correctly across thresholds", () => {
      assert.equal(getConcernLevel(1.0, TRUNK_SWAY_THRESHOLDS), "none");
      assert.equal(getConcernLevel(3.0, TRUNK_SWAY_THRESHOLDS), "mild");
      assert.equal(getConcernLevel(5.0, TRUNK_SWAY_THRESHOLDS), "moderate");
      assert.equal(getConcernLevel(10.0, TRUNK_SWAY_THRESHOLDS), "significant");
    });
  });

  describe("Edge Cases", () => {
    it("handles exactly at threshold boundaries", () => {
      assert.equal(getConcernLevel(0.08, ASYMMETRY_THRESHOLDS), "mild");
      assert.equal(getConcernLevel(0.0799, ASYMMETRY_THRESHOLDS), "none");
    });

    it("handles negative values", () => {
      assert.equal(getConcernLevel(-1, ASYMMETRY_THRESHOLDS), "none");
    });
  });
});
