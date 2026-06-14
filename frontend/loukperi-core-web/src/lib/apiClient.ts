export type ApiErrorPayload = {
  message?: string;
  error?: string;
  statusCode?: number;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(status: number, message: string, payload: ApiErrorPayload | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type ApiRequestOptions = {
  auth?: boolean;
  headers?: HeadersInit;
  body?: unknown;
  unwrapData?: boolean;
};

export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"
  );
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem("loukperi_access_token");
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem("loukperi_access_token", token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("loukperi_access_token");
}

function buildUrl(path: string) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
}

function shouldSendJsonBody(body: unknown) {
  return body !== undefined && !(body instanceof FormData);
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return response.text();
  }

  return response.json();
}

function unwrapPayload<T>(payload: unknown, unwrapData: boolean): T {
  if (
    unwrapData &&
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

async function apiRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const auth = options.auth ?? true;
  const unwrapData = options.unwrapData ?? true;
  const token = getAccessToken();

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (shouldSendJsonBody(options.body)) {
    headers.set("Content-Type", "application/json");
  }

  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object"
        ? (payload as ApiErrorPayload)
        : null;

    const message =
      errorPayload?.message ??
      errorPayload?.error ??
      `API request failed with status ${response.status}`;

    if (response.status === 401) {
      clearAccessToken();
    }

    throw new ApiError(response.status, message, errorPayload);
  }

  return unwrapPayload<T>(payload, unwrapData);
}

export function apiGet<T>(path: string, options?: ApiRequestOptions) {
  return apiRequest<T>("GET", path, options);
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
) {
  return apiRequest<T>("POST", path, {
    ...options,
    body,
  });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions
) {
  return apiRequest<T>("PATCH", path, {
    ...options,
    body,
  });
}

export function apiDelete<T>(path: string, options?: ApiRequestOptions) {
  return apiRequest<T>("DELETE", path, options);
}