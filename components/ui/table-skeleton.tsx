"use client";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 6, rows = 8 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse divide-y divide-gray-100 border border-gray-200 rounded-lg">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`skeleton-row-${rowIndex}`}
          className="grid gap-4 px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <div
              key={`skeleton-cell-${rowIndex}-${colIndex}`}
              className="h-4 rounded bg-gray-200"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

