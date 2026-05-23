type CheckoutJobPricing = {
  payRate: number;
  payUnit: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function toValidDate(value: Date | string | null, fieldName: string): Date {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return date;
}

function requirePositivePayRate(payRate: number): void {
  if (!Number.isFinite(payRate) || payRate <= 0) {
    throw new Error("payRate must be greater than zero");
  }
}

function requireDateRange(job: CheckoutJobPricing): { start: Date; end: Date } {
  if (!job.startDate || !job.endDate) {
    throw new Error("startDate and endDate are required for hourly and daily jobs");
  }

  const start = toValidDate(job.startDate, "startDate");
  const end = toValidDate(job.endDate, "endDate");
  if (end < start) {
    throw new Error("endDate must be on or after startDate");
  }

  return { start, end };
}

export function calculateCheckoutAmountCents(job: CheckoutJobPricing): number {
  requirePositivePayRate(job.payRate);

  let quantity: number;
  switch (job.payUnit) {
    case "job":
      quantity = 1;
      break;
    case "day": {
      const { start, end } = requireDateRange(job);
      quantity = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
      break;
    }
    case "hour": {
      const { start, end } = requireDateRange(job);
      if (end.getTime() <= start.getTime()) {
        throw new Error("endDate must be after startDate for hourly jobs");
      }
      quantity = Math.ceil((end.getTime() - start.getTime()) / MS_PER_HOUR);
      break;
    }
    default:
      throw new Error(`Unsupported payUnit: ${job.payUnit}`);
  }

  const amountCents = Math.round(job.payRate * quantity * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
    throw new Error("checkout amount must be at least one cent");
  }

  return amountCents;
}
