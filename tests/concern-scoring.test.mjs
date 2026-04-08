/**
 * PEDI-GROWTH — Concern Scoring Tests
 * Tests the concern level threshold mapping.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Inline concern threshold logic matching src/lib/policy/concern-thresholds.ts
function getConcernLevel(value, thresholds) {
  if (value >= thresholds.significant) return "significant";
  if (value >= thresholds.moderate) return "moderate";
  if (value >= thresholds.mild) return "mild";
  return "none";
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const thresholdPath = path.resolve(__dirname, "../src/lib/policy/concern-thresholds.json");
const thresholdData = JSON.parse(fs.readFileSync(thresholdPath, "utf8"));

const ASYMMETRY_THRESHOLDS = thresholdData.concernThresholds.asymmetry;
const LATERAL_INSTABILITY_THRESHOLDS = thresholdData.concernThresholds.lateralInstability;

describe("Concern Scoring", () => {
  describe("Asymmetry", () => {
    it("returns 'none' for normal symmetry", () => {
      assert.equal(getConcernLevel(0.03, ASYMMETRY_THRESHOLDS), "none");
      assert.equal(getConcernLevel(0.0, ASYMMETRY_THRESHOLDS), "none");
    });

    it("returns 'mild' for subtle asymmetry", () => {
      assert.equal(getConcernLevel(0.12, ASYMMETRY_THRESHOLDS), "mild");
      assert.equal(getConcernLevel(0.18, ASYMMETRY_THRESHOLDS), "mild");
    });

    it("returns 'moderate' for notable asymmetry", () => {
      assert.equal(getConcernLevel(0.22, ASYMMETRY_THRESHOLDS), "moderate");
      assert.equal(getConcernLevel(0.3, ASYMMETRY_THRESHOLDS), "moderate");
    });

    it("returns 'significant' for severe asymmetry", () => {
      assert.equal(getConcernLevel(0.35, ASYMMETRY_THRESHOLDS), "significant");
      assert.equal(getConcernLevel(0.50, ASYMMETRY_THRESHOLDS), "significant");
    });
  });

  describe("Lateral Instability", () => {
    it("classifies lateral instability correctly across thresholds", () => {
      assert.equal(getConcernLevel(0.05, LATERAL_INSTABILITY_THRESHOLDS), "none");
      assert.equal(getConcernLevel(0.08, LATERAL_INSTABILITY_THRESHOLDS), "mild");
      assert.equal(getConcernLevel(0.15, LATERAL_INSTABILITY_THRESHOLDS), "moderate");
      assert.equal(getConcernLevel(0.3, LATERAL_INSTABILITY_THRESHOLDS), "significant");
    });
  });

  describe("Edge Cases", () => {
    it("handles exactly at threshold boundaries", () => {
      assert.equal(getConcernLevel(0.12, ASYMMETRY_THRESHOLDS), "mild");
      assert.equal(getConcernLevel(0.1199, ASYMMETRY_THRESHOLDS), "none");
    });

    it("handles negative values", () => {
      assert.equal(getConcernLevel(-1, ASYMMETRY_THRESHOLDS), "none");
    });
  });
});
