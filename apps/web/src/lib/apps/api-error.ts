/** Parse a JSON `{ error }` / `{ issues }` body from our apps APIs. */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      error?: string;
      issues?: { message: string }[];
    };
    if (data.issues?.[0]?.message) return data.issues[0].message;
    if (data.error) return data.error;
  } catch {
    // ignore non-JSON bodies
  }
  return `Request failed (${response.status})`;
}

/** Shared safe JSON error body for API routes. */
export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
