// Fetch JSON that tolerates 500 HTML error pages. Returns { ok, data, error }.
// Never throws so the caller can render a friendly error state.
export async function safeJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  try {
    const res = await fetch(input, init);
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* HTML error page */ }
    if (!res.ok) {
      const err = parsed?.error ?? `HTTP ${res.status}${res.statusText ? ` — ${res.statusText}` : ''}. The server likely isn't set up — run setup.bat once, then restart.`;
      return { ok: false, data: null, error: String(err) };
    }
    return { ok: true, data: parsed as T, error: null };
  } catch (e: any) {
    return { ok: false, data: null, error: e?.message ?? 'Network error' };
  }
}
