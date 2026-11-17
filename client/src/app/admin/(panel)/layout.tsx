"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth, clearToken } from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { LogoutIcon } from "@/components/ui/icons";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready } = useRequireAuth();
  const router = useRouter();

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas">
        <Spinner size="lg" aria-label="Loading admin dashboard..." />
      </div>
    );
  }

  const handleLogout = () => {
    clearToken();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <header className="bg-surface border-b border-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/admin"
              className="font-semibold text-lg text-primary tracking-tight hover:opacity-90 transition-opacity"
            >
              Survey Builder
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted hover:text-ink gap-1.5"
            >
              <LogoutIcon className="w-4 h-4" />
              <span>Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {children}
      </main>
    </div>
  );
}
