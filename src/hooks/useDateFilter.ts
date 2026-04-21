import { useState } from "react";
import { subMonths } from "date-fns";

export type DatePreset = "3m" | "6m" | "12m" | "custom";

export function useDateFilter() {
  const [preset, setPreset]       = useState<DatePreset>("6m");
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 6));
  const [endDate, setEndDate]     = useState<Date>(new Date());

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    if (p !== "custom") {
      const months = p === "3m" ? 3 : p === "6m" ? 6 : 12;
      setStartDate(subMonths(new Date(), months));
      setEndDate(new Date());
    }
  };

  return { preset, startDate, endDate, applyPreset, setStartDate, setEndDate };
}
