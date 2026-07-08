import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EligibilityCheckTransitionProps {
  onComplete: () => void;
}

const CHECKS = [
  "Verifying your identity",
  "Reviewing your application",
  "Calculating your eligible amount",
];

const STEP_DURATION_MS = 900;
const FINAL_DELAY_MS = 500;

export const EligibilityCheckTransition: React.FC<
  EligibilityCheckTransitionProps
> = ({ onComplete }) => {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (completedCount >= CHECKS.length) {
      const finalTimer = setTimeout(onComplete, FINAL_DELAY_MS);
      return () => clearTimeout(finalTimer);
    }
    const timer = setTimeout(
      () => setCompletedCount((c) => c + 1),
      STEP_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [completedCount, onComplete]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-300">
      <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center mb-8 border border-pink-100">
        <Loader2 className="w-9 h-9 text-[#EC1B84] animate-spin" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">
        Reviewing your application
      </h1>
      <p className="text-sm text-gray-500 mb-8 max-w-[260px]">
        This will only take a moment
      </p>

      <div className="w-full max-w-xs space-y-3 text-left">
        {CHECKS.map((label, i) => {
          const done = i < completedCount;
          const active = i === completedCount;
          return (
            <div
              key={label}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                done
                  ? "border-green-100 bg-green-50"
                  : active
                    ? "border-pink-100 bg-pink-50/50"
                    : "border-gray-100 bg-gray-50/50",
              )}
            >
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : active ? (
                <Loader2 className="w-5 h-5 text-[#EC1B84] animate-spin shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  done
                    ? "text-green-700"
                    : active
                      ? "text-gray-900"
                      : "text-gray-400",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
