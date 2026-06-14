import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateJobCreateInput, validateJobUpdateInput } from "../app/lib/jobInputValidation";

const validCreateInput = {
  title: "Build a deck",
  description: "Install framing",
  category: "Construction",
  location: "Denver",
  payRate: "25.50",
  payUnit: "hour",
  startDate: "2026-06-01T09:00:00.000Z",
  endDate: "2026-06-01T17:00:00.000Z",
  publish: true,
};

test("job create validation accepts a valid API payload", () => {
  const result = validateJobCreateInput(validCreateInput);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.payRate, 25.5);
    assert.equal(result.data.startDate?.toISOString(), "2026-06-01T09:00:00.000Z");
    assert.equal(result.data.endDate?.toISOString(), "2026-06-01T17:00:00.000Z");
    assert.equal(result.data.publish, true);
  }
});

test("job create validation rejects invalid pay rates before persistence", () => {
  for (const payRate of ["0", "-1", "NaN", "Infinity", Number.NaN]) {
    const result = validateJobCreateInput({ ...validCreateInput, payRate });

    assert.deepEqual(result, {
      ok: false,
      error: "payRate must be a finite positive number",
    });
  }
});

test("job create validation rejects invalid dates and reversed ranges", () => {
  assert.deepEqual(validateJobCreateInput({ ...validCreateInput, startDate: "not-a-date" }), {
    ok: false,
    error: "startDate must be a valid date",
  });

  assert.deepEqual(
    validateJobCreateInput({
      ...validCreateInput,
      startDate: "2026-06-02T09:00:00.000Z",
      endDate: "2026-06-01T17:00:00.000Z",
    }),
    { ok: false, error: "endDate must be on or after startDate" },
  );
});

test("job update validation rejects invalid pay rates and dates", () => {
  assert.deepEqual(
    validateJobUpdateInput(
      { payRate: "Infinity" },
      { startDate: "2026-06-01T09:00:00.000Z", endDate: "2026-06-01T17:00:00.000Z" },
    ),
    { ok: false, error: "payRate must be a finite positive number" },
  );

  assert.deepEqual(
    validateJobUpdateInput(
      { endDate: "bad-date" },
      { startDate: "2026-06-01T09:00:00.000Z", endDate: "2026-06-01T17:00:00.000Z" },
    ),
    { ok: false, error: "endDate must be a valid date" },
  );
});

test("job update validation checks date ranges against existing dates", () => {
  const result = validateJobUpdateInput(
    { startDate: "2026-06-03T09:00:00.000Z" },
    { startDate: "2026-06-01T09:00:00.000Z", endDate: "2026-06-01T17:00:00.000Z" },
  );

  assert.deepEqual(result, { ok: false, error: "endDate must be on or after startDate" });
});

test("job update validation accepts a valid partial API payload", () => {
  const result = validateJobUpdateInput(
    { payRate: 80, endDate: "2026-06-02T17:00:00.000Z" },
    { startDate: "2026-06-01T09:00:00.000Z", endDate: "2026-06-01T17:00:00.000Z" },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.payRate, 80);
    assert.equal(result.data.endDate?.toISOString(), "2026-06-02T17:00:00.000Z");
  }
});
