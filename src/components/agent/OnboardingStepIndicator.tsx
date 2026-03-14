import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Step {
  number: number;
  title: string;
  icon: LucideIcon;
}

interface Props {
  steps: Step[];
  currentStep: number;
}

export function OnboardingStepIndicator({ steps, currentStep }: Props) {
  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, index) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const Icon = step.icon;

        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1 gap-1.5">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300",
                  isCompleted && "bg-emerald-500 text-white",
                  isActive && "bg-gradient-pink text-primary-foreground shadow-pink",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium text-center leading-tight",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-[2px] flex-1 mx-1 rounded-full transition-colors duration-300",
                  currentStep > step.number ? "bg-emerald-500" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
