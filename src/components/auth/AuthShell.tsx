import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FinanceIllustration } from "./FinanceIllustration";

/** Drop-in replacement for <Card> on auth pages — softer elevated shadow,
 * no harsh border, larger radius. Pass to <Card className={AUTH_CARD_CLASS}>. */
export const AUTH_CARD_CLASS = "rounded-2xl border-border/40 shadow-[0_1px_2px_rgb(0,0,0,0.04),0_24px_48px_-16px_rgb(0,0,0,0.16)]";

/** Premium submit button treatment for auth pages. */
export const AUTH_BUTTON_CLASS = cn(
  "w-full h-12 rounded-xl text-sm font-semibold tracking-wide",
  "bg-gradient-to-r from-primary to-[hsl(322,86%,46%)]",
  "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
  "transition-all duration-200 hover:-translate-y-0.5",
);

/** Shared two-panel layout for every admin-facing auth page (login,
 * forgot/reset password, finance login) — a form panel plus a decorative
 * illustration panel, hidden below `lg` so the form alone fills the
 * screen on mobile. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[hsl(330,70%,18%)] via-[hsl(320,55%,14%)] to-[hsl(222,47%,9%)]">
        <FinanceIllustration />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
