import React from "react";
import { DatePreset } from "@/hooks/useDateFilter";
import { format } from "date-fns";

interface Props {
  preset: DatePreset;
  startDate: Date;
  endDate: Date;
  applyPreset: (p: DatePreset) => void;
  setStartDate: (d: Date) => void;
  setEndDate: (d: Date) => void;
}

export function DateRangeFilter({
  preset,
  startDate,
  endDate,
  applyPreset,
  setStartDate,
  setEndDate,
}: Props) {
  const presets: { label: string; value: DatePreset }[] = [
    { label: "Last 3 months", value: "3m" },
    { label: "Last 6 months", value: "6m" },
    { label: "Last 12 months", value: "12m" },
    { label: "Custom range", value: "custom" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
      <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => applyPreset(p.value)}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              preset === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <input 
            type="date"
            value={format(startDate, "yyyy-MM-dd")}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-muted-foreground">to</span>
          <input 
            type="date"
            value={format(endDate, "yyyy-MM-dd")}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}
    </div>
  );
}
