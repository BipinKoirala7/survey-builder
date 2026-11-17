"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const TOKEN_KEY = "sb_token";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore local storage errors
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore local storage errors
  }
}

export function useRequireAuth(): { ready: boolean; token: string | null } {
  const router = useRouter();
  const [ready, setReady] = useState<boolean>(false);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const currentToken = getToken();
    if (!currentToken) {
      router.replace("/admin/login");
      return;
    }

    const timer = setTimeout(() => {
      setTokenState(currentToken);
      setReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  return { ready, token };
}
