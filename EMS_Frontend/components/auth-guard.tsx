"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !accessToken) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [accessToken, hasHydrated, pathname, router]);

  if (!hasHydrated) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading workspace...</div>;
  }

  if (!accessToken) {
    return null;
  }

  return <>{children}</>;
}
