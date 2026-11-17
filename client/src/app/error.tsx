"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas text-ink">
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="font-semibold text-lg text-primary tracking-tight">
          Survey Builder
        </span>
        <ButtonLink href="/" variant="secondary" size="sm">
          Home
        </ButtonLink>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center py-16">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-danger/10 text-danger text-3xl font-bold border border-danger/20">
            !
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            Something went wrong
          </h1>

          <p className="text-lg text-muted max-w-md mx-auto leading-relaxed">
            An unexpected error occurred. You can try reloading the page or return to the home page.
          </p>

          {error.digest && (
            <p className="text-xs text-muted font-mono bg-surface border border-line rounded-lg px-3 py-2">
              Error digest: {error.digest}
            </p>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="md" onClick={() => reset()}>
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary" size="md">
              Go back home
            </ButtonLink>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-line py-6 text-center text-xs text-muted">
        <div className="max-w-6xl mx-auto px-4">
          Survey Builder
        </div>
      </footer>
    </div>
  );
}
