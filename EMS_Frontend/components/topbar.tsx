"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { ThemeSelect } from "@/components/theme-select";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth-store";
import { logout } from "@/services/auth.service";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { t } = useI18n();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <Link href="/dashboard" className="font-semibold">
            EMS Admin
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{user?.name || user?.username || "User"}</p>
          <p className="text-xs capitalize text-muted-foreground">{user?.role?.replace("_", " ")}</p>
        </div>
        <LanguageSwitcher />
        <ThemeSelect />
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t("topbar.logout")}</span>
        </Button>
      </div>
    </header>
  );
}
