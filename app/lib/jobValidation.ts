/** Shared validation helpers for job create/update API routes. */

export interface JobValidationError {
  field: string;
  message: string;
}

/**
 * Validates payRate: must be a positive, finite number.
 * Accepts string or number input (API fields may arrive as strings).
 */
export function validatePayRate(value: unknown): JobValidationError | null {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) {
    return { field: "payRate", message: "payRate must be a positive finite number" };
  }
  return null;
}

/**
 * Validates an optional date field.
 * Returns an error if the value is provided but cannot be parsed as a valid date.
 */
export function validateDate(value: unknown, fieldName: string): JobValidationError | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value as string);
  if (isNaN(d.getTime())) {
    return { field: fieldName, message: `${fieldName} must be a valid date` };
  }
  return null;
}

/**
 * Validates that startDate is not after endDate when both are provided and non-null.
 * Assumes individual date validity has already been checked.
 */
export function validateDateRange(
  startDate: unknown,
  endDate: unknown,
): JobValidationError | null {
  if (
    startDate === null || startDate === undefined || startDate === "" ||
    endDate === null || endDate === undefined || endDate === ""
  ) {
    return null;
  }
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    // individual date errors reported separately
    return null;
  }
  if (start > end) {
    return { field: "startDate", message: "startDate must not be after endDate" };
  }
  return null;
}

/**
 * Validates an optional latitude value (must be a finite number in [-90, 90]).
 */
export function validateLat(value: unknown): JobValidationError | null {
  if (value === null || value === undefined || value === "") return null;
  const v = Number(value);
  if (!Number.isFinite(v) || v < -90 || v > 90) {
    return { field: "locationLat", message: "locationLat must be a finite number between -90 and 90" };
  }
  return null;
}

/**
 * Validates an optional longitude value (must be a finite number in [-180, 180]).
 */
export function validateLng(value: unknown): JobValidationError | null {
  if (value === null || value === undefined || value === "") return null;
  const v = Number(value);
  if (!Number.isFinite(v) || v < -180 || v > 180) {
    return { field: "locationLng", message: "locationLng must be a finite number between -180 and 180" };
  }
  return null;
}

/**
 * Validates fcfsTimeoutMinutes: must be a positive integer no larger than 10080 (7 days).
 */
export function validateFcfsTimeout(value: unknown): JobValidationError | null {
  if (value === null || value === undefined) return null;
  const v = Number(value);
  if (!Number.isFinite(v) || !Number.isInteger(v) || v <= 0 || v > 10080) {
    return {
      field: "fcfsTimeoutMinutes",
      message: "fcfsTimeoutMinutes must be a positive integer up to 10080 (7 days)",
    };
  }
  return null;
}

/**
 * Collects all validation errors for job creation fields.
 * All numeric/date/coordinate fields are checked; the first error per field is returned.
 */
export function validateJobCreateFields(body: {
  payRate?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  fcfsTimeoutMinutes?: unknown;
  locationLat?: unknown;
  locationLng?: unknown;
}): JobValidationError[] {
  const errors: JobValidationError[] = [];

  const payRateErr = validatePayRate(body.payRate);
  if (payRateErr) errors.push(payRateErr);

  const startErr = validateDate(body.startDate, "startDate");
  if (startErr) errors.push(startErr);

  const endErr = validateDate(body.endDate, "endDate");
  if (endErr) errors.push(endErr);

  const rangeErr = validateDateRange(body.startDate, body.endDate);
  if (rangeErr) errors.push(rangeErr);

  const timeoutErr = validateFcfsTimeout(body.fcfsTimeoutMinutes);
  if (timeoutErr) errors.push(timeoutErr);

  const latErr = validateLat(body.locationLat);
  if (latErr) errors.push(latErr);

  const lngErr = validateLng(body.locationLng);
  if (lngErr) errors.push(lngErr);

  return errors;
}

/**
 * Collects all validation errors for job update (PATCH) fields.
 * Only validates fields that are explicitly provided (not undefined).
 */
export function validateJobUpdateFields(body: {
  payRate?: unknown;
  startDate?: unknown;
  endDate?: unknown;
}): JobValidationError[] {
  const errors: JobValidationError[] = [];

  if (body.payRate !== undefined) {
    const payRateErr = validatePayRate(body.payRate);
    if (payRateErr) errors.push(payRateErr);
  }

  if (body.startDate !== undefined) {
    const startErr = validateDate(body.startDate, "startDate");
    if (startErr) errors.push(startErr);
  }

  if (body.endDate !== undefined) {
    const endErr = validateDate(body.endDate, "endDate");
    if (endErr) errors.push(endErr);
  }

  if (body.startDate !== undefined || body.endDate !== undefined) {
    const rangeErr = validateDateRange(body.startDate, body.endDate);
    if (rangeErr) errors.push(rangeErr);
  }

  return errors;
}
