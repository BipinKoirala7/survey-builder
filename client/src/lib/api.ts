import { clearToken, getToken } from "./auth";
import type { ApiValidationIssue } from "./types";

export class ApiError extends Error {
  status: number;
  issues?: ApiValidationIssue[];

  constructor(status: number, message: string, issues?: ApiValidationIssue[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

export interface ApiFetchOptions {
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

  const headers = new Headers(init?.headers);

  if (options?.auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    if (options?.auth && response.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/admin/login";
      }
    }

    let errorMessage =
      response.statusText || `Request failed with status ${response.status}`;
    let issues: ApiValidationIssue[] | undefined;

    try {
      const errorData = await response.json();
      if (errorData) {
        if (typeof errorData.error === "string") {
          errorMessage = errorData.error;
        } else if (typeof errorData.message === "string") {
          errorMessage = errorData.message;
        }
        if (Array.isArray(errorData.issues)) {
          issues = errorData.issues;
        }
      }
    } catch {
      // response is not JSON
    }

    throw new ApiError(response.status, errorMessage, issues);
  }

  const data = await response.json();
  return data as T;
}

export function apiGet<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  return apiFetch<T>(path, { method: "GET" }, options);
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: ApiFetchOptions
): Promise<T> {
  return apiFetch<T>(
    path,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    options
  );
}

export function apiPut<T>(
  path: string,
  body?: unknown,
  options?: ApiFetchOptions
): Promise<T> {
  return apiFetch<T>(
    path,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    options
  );
}

export function apiDelete<T = void>(
  path: string,
  options?: ApiFetchOptions
): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" }, options);
}
