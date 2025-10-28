"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateFilterProps {
  onDateChange: (filters: { year: number; month?: number }) => void;
  className?: string;
}

export function GlobalDateFilter({ onDateChange, className }: DateFilterProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number | null>(null);

  // Apply filters on initial mount to trigger API calls
  useEffect(() => {
    onDateChange({
      year,
      month: month ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }).map((_, idx) => currentYear - idx);
  }, [currentYear]);

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleApplyFilters = () => {
    onDateChange({
      year,
      month: month ?? undefined,
    });
  };

  const handleClearFilters = () => {
    setMonth(null);
    onDateChange({
      year: currentYear,
    });
  };

  return (
    <div
      className={cn(
        "w-full border border-gray-200 rounded-xl shadow-lg bg-white p-6",
        className
      )}
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-2 rounded-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Date Filters</h3>
              <p className="text-sm text-gray-600">Filter all charts by date</p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Year
            </label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-full bg-white border-gray-300">
                <Calendar className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Month (Optional)
            </label>
            <Select
              value={month ? String(month) : "all"}
              onValueChange={(v) => setMonth(v === "all" ? null : Number(v))}
            >
              <SelectTrigger className="w-full bg-white border-gray-300">
                <Calendar className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleApplyFilters}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-lg w-full sm:w-auto"
            >
              Apply
            </Button>
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold w-full sm:w-auto"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
