"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-3 sm:space-x-4 sm:space-y-0",
        month: "space-y-3",
        month_caption:
          "flex justify-center pt-1 relative items-center mb-3 h-8",
        caption_label: "text-sm font-semibold text-gray-900",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white border-gray-200 hover:bg-teal-50 hover:border-teal-300 transition-all duration-150 absolute left-0 top-0 rounded-md p-0"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-white border-gray-200 hover:bg-teal-50 hover:border-teal-300 transition-all duration-150 absolute right-0 top-0 rounded-md p-0"
        ),
        month_grid: "w-full border-collapse mt-2",
        weekdays: "flex",
        weekday:
          "text-gray-600 rounded-md w-10 font-medium text-[0.7rem] uppercase py-1.5",
        week: "flex w-full mt-0.5",
        day: cn(
          "relative h-10 w-10 text-center text-sm p-0 font-normal transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
        ),
        day_button: cn(
          "h-10 w-10 p-0 font-normal rounded-md transition-all duration-150",
          "hover:bg-gray-100 hover:text-gray-900"
        ),
        selected:
          "bg-teal-600 text-white hover:bg-teal-700 hover:text-white focus:bg-teal-700 focus:text-white rounded-md font-semibold",
        today:
          "bg-teal-50 text-teal-900 font-semibold border border-teal-300 rounded-md",
        outside:
          "text-gray-400 opacity-50 hover:text-gray-500 hover:opacity-60",
        disabled:
          "text-gray-300 opacity-30 cursor-not-allowed hover:bg-transparent",
        range_start:
          "bg-teal-600 text-white hover:bg-teal-700 font-semibold !rounded-l-md !rounded-r-none",
        range_end:
          "bg-teal-600 text-white hover:bg-teal-700 font-semibold !rounded-r-md !rounded-l-none",
        range_middle:
          "bg-teal-100 text-teal-900 hover:bg-teal-200 !rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="h-3.5 w-3.5 text-gray-600" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
