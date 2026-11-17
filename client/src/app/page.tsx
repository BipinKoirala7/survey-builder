"use client";

import { ButtonLink } from "@/components/ui/button";
import { HealthGate } from "@/components/ui/health-gate";

export default function HomePage() {
  return (
    <HealthGate>
      <div className="min-h-screen flex flex-col justify-between bg-canvas text-ink">
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="font-semibold text-lg text-primary tracking-tight">
          Survey Builder
        </span>
        <ButtonLink href="/admin/login" variant="secondary" size="sm">
          Admin login
        </ButtonLink>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center py-16">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-medium border border-primary/10">
            Next-generation Survey Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink">
            Survey Builder
          </h1>

          <p className="text-lg sm:text-xl text-muted max-w-lg mx-auto leading-relaxed">
            Build dynamic surveys, collect responses and see the results.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <ButtonLink href="/admin/login" variant="primary" size="md">
              Admin login
            </ButtonLink>
            <ButtonLink href="/admin/register" variant="secondary" size="md">
              Create account
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
    </HealthGate>
  );
}
