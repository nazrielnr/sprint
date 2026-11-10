// Fetch wrapper for the /api/v1 backend with normalized errors.

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    const message =
      typeof detail === "string"
        ? detail
        : readStringField(detail, "message") ?? `Request failed with status ${status}`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Runtime-narrowed read of a single string field from an unknown object. */
function readStringField(value: unknown, key: string): string | undefined {
  if (value && typeof value === "object" && key in value) {
    const field = (value as Record<string, unknown>)[key];
    if (typeof field === "string") {
      return field;
    }
  }
  return undefined;
}

export type QueryParams = Record<string, string | number | null | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`/api/v1${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + (url.search || "");
}

async function request<T>(
  method: string,
  path: string,
  options?: { params?: QueryParams; body?: unknown },
): Promise<T> {
  const url = buildUrl(path, options?.params);
  const init: RequestInit = { method };
  const headers: Record<string, string> = {};

  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  init.headers = headers;

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(0, "Network error: could not reach the API");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, readField(payload, "detail"));
  }

  return payload as T;
}

/** Runtime-narrowed read of a single field from an unknown JSON payload. */
function readField(value: unknown, key: string): unknown {
  if (value && typeof value === "object" && key in value) {
    return (value as Record<string, unknown>)[key];
  }
  return value;
}

/**
 * Fire-and-forget DELETE that survives page unload. Used to flush an issue
 * deletion that is still inside its "Undo" window when the tab closes.
 */
export function deleteOnUnload(path: string): void {
  try {
    void fetch(buildUrl(path), { method: "DELETE", keepalive: true });
  } catch {
    // nothing else we can do while unloading
  }
}

export const api = {
  get<T>(path: string, params?: QueryParams) {
    return request<T>("GET", path, { params });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>("POST", path, { body });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>("PATCH", path, { body });
  },
  del<T = void>(path: string) {
    return request<T>("DELETE", path);
  },
};
