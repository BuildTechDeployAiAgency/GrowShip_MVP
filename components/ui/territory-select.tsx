"use client";

import * as React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTerritoryOptions } from "@/hooks/use-territories";
import { Skeleton } from "@/components/ui/skeleton";

interface TerritorySelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  brandId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  showAutoAssignOption?: boolean;
}

export function TerritorySelect({
  value,
  onChange,
  brandId,
  placeholder = "Select territory...",
  disabled = false,
  className,
  allowClear = true,
  showAutoAssignOption = true,
}: TerritorySelectProps) {
  const [open, setOpen] = React.useState(false);
  const { groupedTerritories, territoryOptions, loading, error } =
    useTerritoryOptions(brandId);

  const selectedTerritory = territoryOptions.find((t) => t.value === value);

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("w-full justify-between text-destructive", className)}
      >
        Error loading territories
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            {selectedTerritory
              ? `${selectedTerritory.label} (${selectedTerritory.regionName || ""})`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search territory..." />
          <CommandList>
            <CommandEmpty>No territory found.</CommandEmpty>
            
            {/* Auto-assign option */}
            {showAutoAssignOption && (
              <CommandGroup heading="Default">
                <CommandItem
                  value="auto-assign"
                  onSelect={() => {
                    onChange(undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 italic text-muted-foreground">
                    Auto-assign from country
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            
            {/* Grouped territories by region */}
            {groupedTerritories.map((group) => (
              group.options.length > 0 && (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.options.map((territory) => (
                    <CommandItem
                      key={territory.value}
                      value={`${territory.label} ${territory.code}`}
                      onSelect={() => {
                        onChange(territory.value);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === territory.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{territory.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {territory.code}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface RegionSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  brandId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RegionSelect({
  value,
  onChange,
  brandId,
  placeholder = "Select region...",
  disabled = false,
  className,
}: RegionSelectProps) {
  const [open, setOpen] = React.useState(false);
  const { regionOptions, loading, error } = useTerritoryOptions(brandId);

  const selectedRegion = regionOptions.find((r) => r.value === value);

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn("w-full justify-between text-destructive", className)}
      >
        Error loading regions
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            {selectedRegion ? selectedRegion.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search region..." />
          <CommandList>
            <CommandEmpty>No region found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all-regions"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="italic text-muted-foreground">All Regions</span>
              </CommandItem>
              {regionOptions.map((region) => (
                <CommandItem
                  key={region.value}
                  value={`${region.label} ${region.code}`}
                  onSelect={() => {
                    onChange(region.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === region.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">{region.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {region.code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

