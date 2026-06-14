const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export const TOKEN_STORAGE_KEY = "loukperi_access_token";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || data?.error || `Request failed with ${response.status}`,
      response.status,
      data
    );
  }

  return data as TResponse;
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: "GET",
  });
}

export async function apiPost<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  return apiRequest<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiGetFirstAvailable<TResponse>(
  paths: string[]
): Promise<{ path: string; data: TResponse }> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const data = await apiGet<TResponse>(path);
      return { path, data };
    } catch (error) {
      lastError = error;

      if (error instanceof ApiError) {
        const message = String(error.message || "").toLowerCase();

        const isRouteCandidateMiss =
          error.status === 404 ||
          (error.status === 400 && message.includes("must be a valid uuid"));

        if (isRouteCandidateMiss) {
          console.warn(`Skipping dashboard candidate ${path}:`, error.message);
          continue;
        }

        throw error;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No dashboard endpoint responded successfully");
}