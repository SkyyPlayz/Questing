import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculateRiskLevel } from "../app/lib/riskScore";

test("risk scoring keeps empty resolved incident history low", () => {
  assert.equal(calculateRiskLevel([]), "LOW");
});

test("risk scoring maps a single low severity incident to medium", () => {
  assert.equal(calculateRiskLevel([{ severity: "LOW" }]), "MEDIUM");
});

test("risk scoring maps a single medium severity incident to medium", () => {
  assert.equal(calculateRiskLevel([{ severity: "MEDIUM" }]), "MEDIUM");
});

test("risk scoring maps a single high severity incident to high", () => {
  assert.equal(calculateRiskLevel([{ severity: "HIGH" }]), "HIGH");
});

test("risk scoring maps a single critical severity incident to high", () => {
  assert.equal(calculateRiskLevel([{ severity: "CRITICAL" }]), "HIGH");
});

test("risk scoring escalates three lower-severity incidents to high", () => {
  assert.equal(
    calculateRiskLevel([{ severity: "LOW" }, { severity: "MEDIUM" }, { severity: "LOW" }]),
    "HIGH",
  );
});
