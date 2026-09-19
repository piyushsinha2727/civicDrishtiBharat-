/**
 * Centralized API URL helper with auto-detection for Vercel vs local development.
 * On Vercel: uses origin-relative "/api" (no env var needed).
 * On local: uses VITE_API_URL or defaults to "http://localhost:5000/api".
 */
export const getApiUrl = (path: string): string => {
  let baseUrl: string;

  const envUrl = import.meta.env.VITE_API_URL;

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Production (Vercel): use origin-relative URL
    baseUrl = `${window.location.origin}/api`;
  } else if (envUrl && envUrl !== "undefined" && !envUrl.includes("undefined")) {
    // Local dev with env var set
    baseUrl = envUrl.replace(/\/$/, "");
    if (!baseUrl.endsWith("/api")) {
      baseUrl = `${baseUrl}/api`;
    }
  } else {
    // Local dev fallback
    baseUrl = "http://localhost:5000/api";
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Returns the base server URL (without /api suffix).
 * Used for static file URLs like document downloads.
 */
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== "undefined" && !envUrl.includes("undefined")) {
    return envUrl.replace(/\/api\/?$/, "");
  }
  return "http://localhost:5000";
};

/**
 * Safe fetch + JSON parse. Never crashes on non-JSON responses.
 * Returns { ok, status, data?, error? }.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      return {
        ok: false,
        status: res.status,
        error: `Server returned non-JSON response (HTTP ${res.status}).`
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: data.error || data.message || `Server returned status ${res.status}`
      };
    }
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || "Network error. Please check backend connection."
    };
  }
}
