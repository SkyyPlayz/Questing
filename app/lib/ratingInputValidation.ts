export type RatingScoreValidationResult =
  | { ok: true; score: number }
  | { ok: false; error: string };

export function validateRatingScore(score: unknown): RatingScoreValidationResult {
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) {
    return { ok: false, error: "score must be an integer from 1 to 5" };
  }

  return { ok: true, score };
}
