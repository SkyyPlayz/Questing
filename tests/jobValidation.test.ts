import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  validatePayRate,
  validateDate,
  validateDateRange,
  validateLat,
  validateLng,
  validateFcfsTimeout,
  validateJobCreateFields,
  validateJobUpdateFields,
} from "../app/lib/jobValidation";

// ---------------------------------------------------------------------------
// validatePayRate
// ---------------------------------------------------------------------------

test("validatePayRate accepts a positive number", () => {
  assert.equal(validatePayRate(25), null);
  assert.equal(validatePayRate("12.50"), null);
  assert.equal(validatePayRate(0.01), null);
});

test("validatePayRate rejects negative pay", () => {
  const err = validatePayRate(-5);
  assert.ok(err);
  assert.equal(err.field, "payRate");
});

test("validatePayRate rejects zero pay", () => {
  assert.ok(validatePayRate(0));
});

test("validatePayRate rejects NaN", () => {
  assert.ok(validatePayRate(NaN));
  assert.ok(validatePayRate("not-a-number"));
});

test("validatePayRate rejects Infinity", () => {
  assert.ok(validatePayRate(Infinity));
  assert.ok(validatePayRate(-Infinity));
});

// ---------------------------------------------------------------------------
// validateDate
// ---------------------------------------------------------------------------

test("validateDate accepts a valid ISO date string", () => {
  assert.equal(validateDate("2026-06-01", "startDate"), null);
  assert.equal(validateDate("2026-06-01T12:00:00.000Z", "startDate"), null);
});

test("validateDate accepts null/undefined/empty (optional field)", () => {
  assert.equal(validateDate(null, "startDate"), null);
  assert.equal(validateDate(undefined, "startDate"), null);
  assert.equal(validateDate("", "startDate"), null);
});

test("validateDate rejects an invalid date string", () => {
  const err = validateDate("not-a-date", "startDate");
  assert.ok(err);
  assert.equal(err.field, "startDate");
});

test("validateDate rejects nonsensical date strings", () => {
  assert.ok(validateDate("9999-99-99", "endDate"));
});

// ---------------------------------------------------------------------------
// validateDateRange
// ---------------------------------------------------------------------------

test("validateDateRange accepts startDate before endDate", () => {
  assert.equal(validateDateRange("2026-01-01", "2026-12-31"), null);
});

test("validateDateRange accepts equal startDate and endDate", () => {
  assert.equal(validateDateRange("2026-06-01", "2026-06-01"), null);
});

test("validateDateRange rejects startDate after endDate", () => {
  const err = validateDateRange("2026-12-31", "2026-01-01");
  assert.ok(err);
  assert.equal(err.field, "startDate");
  assert.match(err.message, /not be after/);
});

test("validateDateRange allows missing dates (range skipped)", () => {
  assert.equal(validateDateRange(null, "2026-01-01"), null);
  assert.equal(validateDateRange("2026-01-01", null), null);
  assert.equal(validateDateRange(null, null), null);
});

// ---------------------------------------------------------------------------
// validateLat
// ---------------------------------------------------------------------------

test("validateLat accepts valid latitudes", () => {
  assert.equal(validateLat(0), null);
  assert.equal(validateLat(90), null);
  assert.equal(validateLat(-90), null);
  assert.equal(validateLat(45.123), null);
});

test("validateLat accepts null/undefined/empty (optional field)", () => {
  assert.equal(validateLat(null), null);
  assert.equal(validateLat(undefined), null);
  assert.equal(validateLat(""), null);
});

test("validateLat rejects latitude > 90", () => {
  const err = validateLat(91);
  assert.ok(err);
  assert.equal(err.field, "locationLat");
});

test("validateLat rejects latitude < -90", () => {
  assert.ok(validateLat(-91));
});

test("validateLat rejects non-numeric latitude", () => {
  assert.ok(validateLat("abc"));
  assert.ok(validateLat(NaN));
});

// ---------------------------------------------------------------------------
// validateLng
// ---------------------------------------------------------------------------

test("validateLng accepts valid longitudes", () => {
  assert.equal(validateLng(0), null);
  assert.equal(validateLng(180), null);
  assert.equal(validateLng(-180), null);
  assert.equal(validateLng(-73.9857), null);
});

test("validateLng accepts null/undefined/empty (optional field)", () => {
  assert.equal(validateLng(null), null);
  assert.equal(validateLng(undefined), null);
  assert.equal(validateLng(""), null);
});

test("validateLng rejects longitude > 180", () => {
  const err = validateLng(181);
  assert.ok(err);
  assert.equal(err.field, "locationLng");
});

test("validateLng rejects longitude < -180", () => {
  assert.ok(validateLng(-181));
});

// ---------------------------------------------------------------------------
// validateFcfsTimeout
// ---------------------------------------------------------------------------

test("validateFcfsTimeout accepts valid positive integer", () => {
  assert.equal(validateFcfsTimeout(30), null);
  assert.equal(validateFcfsTimeout(1), null);
  assert.equal(validateFcfsTimeout(10080), null);
});

test("validateFcfsTimeout accepts null/undefined (optional field)", () => {
  assert.equal(validateFcfsTimeout(null), null);
  assert.equal(validateFcfsTimeout(undefined), null);
});

test("validateFcfsTimeout rejects zero", () => {
  assert.ok(validateFcfsTimeout(0));
});

test("validateFcfsTimeout rejects negative values", () => {
  assert.ok(validateFcfsTimeout(-1));
});

test("validateFcfsTimeout rejects values exceeding 10080 (7 days)", () => {
  const err = validateFcfsTimeout(10081);
  assert.ok(err);
  assert.equal(err.field, "fcfsTimeoutMinutes");
});

test("validateFcfsTimeout rejects non-integer values", () => {
  assert.ok(validateFcfsTimeout(1.5));
  assert.ok(validateFcfsTimeout("abc"));
});

// ---------------------------------------------------------------------------
// validateJobCreateFields (integration)
// ---------------------------------------------------------------------------

test("validateJobCreateFields returns no errors for valid fields", () => {
  const errors = validateJobCreateFields({
    payRate: "25.00",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    fcfsTimeoutMinutes: 30,
    locationLat: "40.7128",
    locationLng: "-74.0060",
  });
  assert.equal(errors.length, 0);
});

test("validateJobCreateFields returns error for negative pay", () => {
  const errors = validateJobCreateFields({ payRate: "-10" });
  assert.ok(errors.some((e) => e.field === "payRate"));
});

test("validateJobCreateFields returns error for reversed date range", () => {
  const errors = validateJobCreateFields({
    payRate: "20",
    startDate: "2026-12-31",
    endDate: "2026-01-01",
  });
  assert.ok(errors.some((e) => e.field === "startDate"));
});

test("validateJobCreateFields returns error for invalid coordinates", () => {
  const errors = validateJobCreateFields({
    payRate: "20",
    locationLat: "200",
    locationLng: "400",
  });
  assert.ok(errors.some((e) => e.field === "locationLat"));
  assert.ok(errors.some((e) => e.field === "locationLng"));
});

test("validateJobCreateFields returns error for out-of-bounds timeout", () => {
  const errors = validateJobCreateFields({ payRate: "20", fcfsTimeoutMinutes: 99999 });
  assert.ok(errors.some((e) => e.field === "fcfsTimeoutMinutes"));
});

// ---------------------------------------------------------------------------
// validateJobUpdateFields (integration)
// ---------------------------------------------------------------------------

test("validateJobUpdateFields returns no errors when no fields provided", () => {
  assert.equal(validateJobUpdateFields({}).length, 0);
});

test("validateJobUpdateFields returns no errors for valid partial update", () => {
  const errors = validateJobUpdateFields({ payRate: "50" });
  assert.equal(errors.length, 0);
});

test("validateJobUpdateFields returns error for non-numeric payRate in update", () => {
  const errors = validateJobUpdateFields({ payRate: "abc" });
  assert.ok(errors.some((e) => e.field === "payRate"));
});

test("validateJobUpdateFields returns error for invalid date in update", () => {
  const errors = validateJobUpdateFields({ startDate: "not-a-date" });
  assert.ok(errors.some((e) => e.field === "startDate"));
});

test("validateJobUpdateFields returns error for reversed date range in update", () => {
  const errors = validateJobUpdateFields({
    startDate: "2026-12-31",
    endDate: "2026-01-01",
  });
  assert.ok(errors.some((e) => e.field === "startDate"));
});

test("validateJobUpdateFields skips payRate validation when not in body", () => {
  // Only startDate provided — should not generate payRate errors
  const errors = validateJobUpdateFields({ startDate: "2026-06-01" });
  assert.ok(!errors.some((e) => e.field === "payRate"));
});
