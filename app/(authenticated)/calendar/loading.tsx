import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 text-center">
              <Skeleton className="h-4 w-10 mx-auto" />
            </div>
          ))}
        </div>
        {/* Calendar Days */}
        {Array.from({ length: 5 }).map((_, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="min-h-[120px] p-2 border-r last:border-r-0"
              >
                <Skeleton className="h-6 w-6 rounded-full mb-2" />
                {Math.random() > 0.5 && (
                  <Skeleton className="h-6 w-full rounded mb-1" />
                )}
                {Math.random() > 0.7 && (
                  <Skeleton className="h-6 w-3/4 rounded" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

