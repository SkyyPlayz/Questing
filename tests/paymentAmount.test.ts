import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculateCheckoutAmountCents } from "../app/lib/paymentAmount";

test("fixed job checkout charges exactly one fixed job price", () => {
  assert.equal(
    calculateCheckoutAmountCents({ payRate: 125.5, payUnit: "job", startDate: null, endDate: null }),
    12550,
  );
});

test("day checkout charges every inclusive calendar day", () => {
  assert.equal(
    calculateCheckoutAmountCents({
      payRate: 75,
      payUnit: "day",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-03T00:00:00.000Z"),
    }),
    22500,
  );
});

test("hour checkout charges elapsed hours between validated start and end", () => {
  assert.equal(
    calculateCheckoutAmountCents({
      payRate: 20,
      payUnit: "hour",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-03T00:00:00.000Z"),
    }),
    96000,
  );
});

test("time-based checkout rejects missing dates instead of silently charging one unit", () => {
  assert.throws(
    () => calculateCheckoutAmountCents({ payRate: 20, payUnit: "hour", startDate: null, endDate: null }),
    /startDate and endDate are required/,
  );
});

test("hour checkout rejects zero elapsed duration instead of charging a minimum hour", () => {
  assert.throws(
    () =>
      calculateCheckoutAmountCents({
        payRate: 20,
        payUnit: "hour",
        startDate: new Date("2026-01-01T12:00:00.000Z"),
        endDate: new Date("2026-01-01T12:00:00.000Z"),
      }),
    /endDate must be after startDate for hourly jobs/,
  );
});

test("checkout amount rounds to cents and rejects totals that round to zero", () => {
  assert.equal(calculateCheckoutAmountCents({ payRate: 10.235, payUnit: "job", startDate: null, endDate: null }), 1024);

  assert.throws(
    () => calculateCheckoutAmountCents({ payRate: 0.001, payUnit: "job", startDate: null, endDate: null }),
    /checkout amount must be at least one cent/,
  );
});
