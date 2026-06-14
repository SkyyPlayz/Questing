type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type JobCreateInput = {
  title: unknown;
  description: unknown;
  category: unknown;
  location: unknown;
  payRate: unknown;
  payUnit?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  publish?: unknown;
};

export type ValidatedJobCreateInput = {
  title: string;
  description: string;
  category: string;
  location: string;
  payRate: number;
  payUnit: string;
  startDate: Date | null;
  endDate: Date | null;
  publish: boolean;
};

export type ValidatedJobUpdateInput = Partial<{
  title: string;
  description: string;
  category: string;
  location: string;
  payRate: number;
  payUnit: string;
  startDate: Date | null;
  endDate: Date | null;
}>;

type ExistingDateRange = {
  startDate: Date | string | null;
  endDate: Date | string | null;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parsePositivePayRate(value: unknown): ValidationResult<number> {
  if (value === undefined || value === null || value === "") {
    return { ok: false, error: "payRate is required" };
  }

  const payRate =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(payRate) || payRate <= 0) {
    return { ok: false, error: "payRate must be a finite positive number" };
  }

  return { ok: true, data: payRate };
}

function parseOptionalDate(value: unknown, fieldName: string): ValidationResult<Date | null> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, data: null };
  }

  if (typeof value !== "string" && !(value instanceof Date)) {
    return { ok: false, error: `${fieldName} must be a valid date` };
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `${fieldName} must be a valid date` };
  }

  return { ok: true, data: date };
}

function validateDateRange(startDate: Date | null, endDate: Date | null): ValidationResult<undefined> {
  if (startDate && endDate && endDate < startDate) {
    return { ok: false, error: "endDate must be on or after startDate" };
  }

  return { ok: true, data: undefined };
}

export function validateJobCreateInput(body: JobCreateInput): ValidationResult<ValidatedJobCreateInput> {
  const title = nonEmptyString(body.title);
  const description = nonEmptyString(body.description);
  const category = nonEmptyString(body.category);
  const location = nonEmptyString(body.location);
  if (!title || !description || !category || !location) {
    return { ok: false, error: "Missing required fields" };
  }

  const payRate = parsePositivePayRate(body.payRate);
  if (payRate.ok === false) return { ok: false, error: payRate.error };

  const startDate = parseOptionalDate(body.startDate, "startDate");
  if (startDate.ok === false) return { ok: false, error: startDate.error };

  const endDate = parseOptionalDate(body.endDate, "endDate");
  if (endDate.ok === false) return { ok: false, error: endDate.error };

  const dateRange = validateDateRange(startDate.data, endDate.data);
  if (dateRange.ok === false) return { ok: false, error: dateRange.error };

  return {
    ok: true,
    data: {
      title,
      description,
      category,
      location,
      payRate: payRate.data,
      payUnit: nonEmptyString(body.payUnit) ?? "hour",
      startDate: startDate.data,
      endDate: endDate.data,
      publish: Boolean(body.publish),
    },
  };
}

export function validateJobUpdateInput(
  body: Record<string, unknown>,
  existingDates: ExistingDateRange,
): ValidationResult<ValidatedJobUpdateInput> {
  const data: ValidatedJobUpdateInput = {};

  for (const field of ["title", "description", "category", "location", "payUnit"] as const) {
    if (body[field] !== undefined) {
      const value = nonEmptyString(body[field]);
      if (value) data[field] = value;
    }
  }

  if (body.payRate !== undefined) {
    const payRate = parsePositivePayRate(body.payRate);
    if (payRate.ok === false) return { ok: false, error: payRate.error };
    data.payRate = payRate.data;
  }

  const startDate =
    body.startDate !== undefined
      ? parseOptionalDate(body.startDate, "startDate")
      : parseOptionalDate(existingDates.startDate, "startDate");
  if (startDate.ok === false) return { ok: false, error: startDate.error };

  const endDate =
    body.endDate !== undefined
      ? parseOptionalDate(body.endDate, "endDate")
      : parseOptionalDate(existingDates.endDate, "endDate");
  if (endDate.ok === false) return { ok: false, error: endDate.error };

  const dateRange = validateDateRange(startDate.data, endDate.data);
  if (dateRange.ok === false) return { ok: false, error: dateRange.error };

  if (body.startDate !== undefined) data.startDate = startDate.data;
  if (body.endDate !== undefined) data.endDate = endDate.data;

  return { ok: true, data };
}
