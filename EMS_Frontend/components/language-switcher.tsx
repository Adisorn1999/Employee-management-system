"use client";

import { Button } from "@/components/ui/button";
import { useI18n, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const languages: Array<{ value: Language; label: string }> = [
  { value: "th", label: "TH" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className="flex h-9 items-center rounded-md border bg-background p-0.5"
      role="group"
      aria-label={t("topbar.language")}
    >
      {languages.map((item) => (
        <Button
          key={item.value}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs",
            language === item.value && "bg-secondary text-foreground hover:bg-secondary"
          )}
          aria-pressed={language === item.value}
          onClick={() => setLanguage(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
