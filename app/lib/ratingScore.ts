export function parseRatingScore(score: unknown): number | null {
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) {
    return null;
  }

  return score;
}
