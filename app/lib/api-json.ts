export type JsonBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

// Route handlers still validate their own body shape after parsing.
export async function parseJsonBody<T = Record<string, never>>(request: Request): Promise<JsonBodyResult<T>> {
  try {
    return { ok: true, data: (await request.json()) as T };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Malformed JSON request body" },
        { status: 400 },
      ),
    };
  }
}
