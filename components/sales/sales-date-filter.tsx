"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Hook to detect screen size
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

type DateRange = {
  from: Date;
  to: Date;
};

type PresetOption = {
  label: string;
  getValue: () => DateRange;
};

const presetOptions: PresetOption[] = [
  {
    label: "Last 7 Days",
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 Days",
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: "This Month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "This Quarter",
    getValue: () => ({
      from: startOfQuarter(new Date()),
      to: endOfQuarter(new Date()),
    }),
  },
  {
    label: "This Year",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
];

interface SalesDateFilterProps {
  onDateChange?: (dateRange: DateRange) => void;
}

export function SalesDateFilter({ onDateChange }: SalesDateFilterProps) {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = React.useState<DateRange>(() =>
    presetOptions[1].getValue()
  );
  const [tempDateRange, setTempDateRange] =
    React.useState<DateRange>(dateRange);
  const [selectedPreset, setSelectedPreset] =
    React.useState<string>("Last 30 Days");
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetClick = (preset: PresetOption) => {
    const newRange = preset.getValue();
    setTempDateRange(newRange);
    setSelectedPreset(preset.label);
  };

  const handleApply = () => {
    setDateRange(tempDateRange);
    setIsOpen(false);
    onDateChange?.(tempDateRange);
  };

  const handleCancel = () => {
    setTempDateRange(dateRange);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal h-9 px-3 bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 transition-all",
            !dateRange && "text-gray-500",
            "w-full sm:w-auto sm:min-w-[260px]"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
          {dateRange?.from ? (
            dateRange.to ? (
              <span className="text-sm text-gray-900 truncate">
                {format(dateRange.from, isMobile ? "MMM dd" : "MMM dd, yyyy")} -{" "}
                {format(dateRange.to, isMobile ? "MMM dd" : "MMM dd, yyyy")}
              </span>
            ) : (
              <span className="text-sm text-gray-900">
                {format(dateRange.from, isMobile ? "MMM dd" : "MMM dd, yyyy")}
              </span>
            )
          ) : (
            <span className="text-sm">Pick a date range</span>
          )}
          <ChevronDown className="ml-auto h-3.5 w-3.5 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 shadow-lg border-gray-200 rounded-lg overflow-hidden"
        align={isMobile ? "center" : "start"}
        sideOffset={4}
      >
        <div
          className={cn(
            "flex divide-gray-200 bg-white",
            isMobile ? "flex-col" : "divide-x"
          )}
        >
          {/* Quick Select Panel */}
          <div
            className={cn(
              "bg-white border-b md:border-b-0 border-gray-200",
              isMobile ? "p-2.5" : "p-2.5 min-w-[135px]"
            )}
          >
            <div className="text-[0.6rem] font-bold text-gray-600 uppercase tracking-wide mb-1.5 px-1">
              Presets
            </div>
            <div
              className={cn(
                "space-y-0.5",
                isMobile && "grid grid-cols-2 gap-1 space-y-0"
              )}
            >
              {presetOptions.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "justify-start text-[0.7rem] font-medium transition-all rounded h-7 leading-tight",
                    isMobile ? "px-1.5" : "w-full px-2",
                    selectedPreset === preset.label
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar Section */}
          <div className={cn("bg-gray-50", isMobile ? "p-3" : "p-3")}>
            <Calendar
              mode="range"
              defaultMonth={tempDateRange?.from}
              selected={{
                from: tempDateRange?.from,
                to: tempDateRange?.to,
              }}
              onSelect={(range) => {
                if (range?.from) {
                  setTempDateRange({
                    from: range.from,
                    to: range.to || range.from,
                  });
                  setSelectedPreset("Custom Range");
                }
              }}
              numberOfMonths={isMobile ? 1 : 2}
              className="rounded-md border-0"
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="font-medium hover:bg-gray-100 h-8 px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium h-8 px-5"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
