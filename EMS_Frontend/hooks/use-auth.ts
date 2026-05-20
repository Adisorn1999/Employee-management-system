"use client";

import { useEffect } from "react";
import { refreshSession } from "@/services/auth.service";
import { useAuthStore } from "@/lib/auth-store";

export function useAuthBootstrap() {
  const setHydrated = useAuthStore((state) => state.setHydrated);

  useEffect(() => {
    let isMounted = true;

    refreshSession()
      .catch(() => {
        useAuthStore.getState().clearSession();
      })
      .finally(() => {
        if (isMounted) {
          setHydrated(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [setHydrated]);
}
