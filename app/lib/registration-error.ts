export const REGISTRATION_ERROR_FALLBACK = "Registration failed. Please try again.";

export async function getRegistrationErrorMessage(
  response: Response,
  fallback = REGISTRATION_ERROR_FALLBACK,
) {
  try {
    const body = await response.text();
    if (!body.trim()) return fallback;

    const data = JSON.parse(body) as { error?: unknown };
    return typeof data.error === "string" && data.error.trim() ? data.error : fallback;
  } catch {
    return fallback;
  }
}
