import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.ComponentProps<typeof Input> {
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
  labelRight?: ReactNode;
}

/** Premium labeled input for the auth pages — leading icon, generous
 * height, soft inset background that lifts to the card color on focus. */
export function AuthInput({ label, icon, trailing, labelRight, className, id, ...props }: AuthInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-semibold text-foreground/70">{label}</Label>
        {labelRight}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
          {icon}
        </span>
        <Input
          id={id}
          className={cn(
            "h-12 rounded-xl border-border/60 bg-muted/30 pl-11 text-sm shadow-none",
            "transition-all duration-200",
            "focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:ring-offset-0 focus-visible:border-primary/50 focus-visible:bg-background",
            trailing && "pr-11",
            className,
          )}
          {...props}
        />
        {trailing && <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
    </div>
  );
}
