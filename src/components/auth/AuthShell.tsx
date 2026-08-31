import type { ReactNode } from "react";
import { FinanceIllustration } from "./FinanceIllustration";

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
