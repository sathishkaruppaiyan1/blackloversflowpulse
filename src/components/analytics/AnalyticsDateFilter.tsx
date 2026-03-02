import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { DateRangePreset } from "@/hooks/useAnalyticsData";
import { useState } from "react";
import { DateRange } from "react-day-picker";

interface AnalyticsDateFilterProps {
  dateRange: DateRangePreset;
  onDateRangeChange: (preset: DateRangePreset) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomDateChange: (start: Date | undefined, end: Date | undefined) => void;
}

const presets: { label: string; value: DateRangePreset }[] = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7days" },
  { label: "30 Days", value: "30days" },
  { label: "90 Days", value: "90days" },
  { label: "All Time", value: "all" },
];

export const AnalyticsDateFilter = ({
  dateRange,
  onDateRangeChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
}: AnalyticsDateFilterProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isCustom = dateRange === "all" && (customStartDate || customEndDate);

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onCustomDateChange(range.from, range.to || range.from);
      onDateRangeChange("all");
      if (range.to) {
        setCalendarOpen(false);
      }
    }
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    onDateRangeChange(preset);
    onCustomDateChange(undefined, undefined);
  };

  const formatCustomRange = () => {
    if (!customStartDate) return "Custom Range";
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!customEndDate || customStartDate.toDateString() === customEndDate.toDateString()) {
      return fmt(customStartDate);
    }
    return `${fmt(customStartDate)} - ${fmt(customEndDate)}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.value}
          variant={dateRange === p.value && !isCustom ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick(p.value)}
        >
          {p.label}
        </Button>
      ))}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isCustom ? "default" : "outline"}
            size="sm"
            className="gap-1"
          >
            <CalendarIcon className="h-4 w-4" />
            {isCustom ? formatCustomRange() : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={
              customStartDate
                ? { from: customStartDate, to: customEndDate }
                : undefined
            }
            onSelect={handleSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
