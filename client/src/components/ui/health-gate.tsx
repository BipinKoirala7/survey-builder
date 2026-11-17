"use client";

import { useEffect, useState } from "react";

interface HealthGateProps {
  children: React.ReactNode;
  healthEndpoint?: string;
  retryInterval?: number;
}

export function HealthGate({
  children,
  healthEndpoint,
  retryInterval = 3000,
}: HealthGateProps) {
  const [status, setStatus] = useState<"checking" | "ok" | "degraded">("checking");
  const [attempt, setAttempt] = useState(0);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const endpoint = healthEndpoint ?? `${baseUrl.replace(/\/+$/, "")}/api/health`;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        const res = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok") {
            setStatus("ok");
            return;
          }
        }
        setStatus("degraded");
      } catch {
        if (!cancelled) setStatus("degraded");
      }
    };

    check();
    timer = setInterval(() => {
      setAttempt((a) => a + 1);
      check();
    }, retryInterval);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [endpoint, retryInterval]);

  if (status === "ok") {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas">
      <div className="w-full max-w-sm mx-auto px-6 text-center space-y-6">
        {/* Spinner */}
        <div className="flex justify-center">
          <div
            role="status"
            aria-label="Checking server health"
            className="inline-block w-10 h-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"
          >
            <span className="sr-only">Checking server health</span>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">
            {status === "checking" ? "Loading..." : "Server unavailable"}
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            {status === "checking"
              ? "Getting everything ready. Please wait…"
              : "The server is currently unavailable. We are checking back automatically…"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
            style={{
              width: "60%",
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Attempt counter */}
        {status === "degraded" && attempt > 0 && (
          <p className="text-xs text-muted">
            Retry attempt {attempt}
          </p>
        )}
      </div>

      {/* Inline keyframe animation for the shimmer effect */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
