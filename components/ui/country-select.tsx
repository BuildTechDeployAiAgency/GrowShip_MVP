"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
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

/**
 * ISO 3166-1 alpha-2 country codes with names
 * Organized by region for better UX
 */
export const COUNTRIES = [
  // GCC
  { code: "AE", name: "United Arab Emirates", region: "GCC" },
  { code: "SA", name: "Saudi Arabia", region: "GCC" },
  { code: "KW", name: "Kuwait", region: "GCC" },
  { code: "QA", name: "Qatar", region: "GCC" },
  { code: "BH", name: "Bahrain", region: "GCC" },
  { code: "OM", name: "Oman", region: "GCC" },
  // Levant
  { code: "JO", name: "Jordan", region: "Levant" },
  { code: "LB", name: "Lebanon", region: "Levant" },
  { code: "IQ", name: "Iraq", region: "Levant" },
  { code: "SY", name: "Syria", region: "Levant" },
  { code: "PS", name: "Palestine", region: "Levant" },
  // MENA
  { code: "EG", name: "Egypt", region: "MENA" },
  { code: "MA", name: "Morocco", region: "MENA" },
  { code: "TN", name: "Tunisia", region: "MENA" },
  { code: "DZ", name: "Algeria", region: "MENA" },
  { code: "LY", name: "Libya", region: "MENA" },
  { code: "SD", name: "Sudan", region: "MENA" },
  // Europe
  { code: "GB", name: "United Kingdom", region: "Europe" },
  { code: "DE", name: "Germany", region: "Europe" },
  { code: "FR", name: "France", region: "Europe" },
  { code: "IT", name: "Italy", region: "Europe" },
  { code: "ES", name: "Spain", region: "Europe" },
  { code: "PT", name: "Portugal", region: "Europe" },
  { code: "NL", name: "Netherlands", region: "Europe" },
  { code: "BE", name: "Belgium", region: "Europe" },
  { code: "LU", name: "Luxembourg", region: "Europe" },
  { code: "CH", name: "Switzerland", region: "Europe" },
  { code: "AT", name: "Austria", region: "Europe" },
  { code: "SE", name: "Sweden", region: "Europe" },
  { code: "NO", name: "Norway", region: "Europe" },
  { code: "DK", name: "Denmark", region: "Europe" },
  { code: "FI", name: "Finland", region: "Europe" },
  { code: "IS", name: "Iceland", region: "Europe" },
  { code: "IE", name: "Ireland", region: "Europe" },
  { code: "GR", name: "Greece", region: "Europe" },
  { code: "PL", name: "Poland", region: "Europe" },
  { code: "CZ", name: "Czech Republic", region: "Europe" },
  { code: "HU", name: "Hungary", region: "Europe" },
  { code: "RO", name: "Romania", region: "Europe" },
  { code: "BG", name: "Bulgaria", region: "Europe" },
  { code: "HR", name: "Croatia", region: "Europe" },
  { code: "SK", name: "Slovakia", region: "Europe" },
  { code: "SI", name: "Slovenia", region: "Europe" },
  // North America
  { code: "US", name: "United States", region: "North America" },
  { code: "CA", name: "Canada", region: "North America" },
  { code: "MX", name: "Mexico", region: "North America" },
  // Central America & Caribbean
  { code: "PA", name: "Panama", region: "Central America" },
  { code: "CR", name: "Costa Rica", region: "Central America" },
  { code: "GT", name: "Guatemala", region: "Central America" },
  { code: "PR", name: "Puerto Rico", region: "Central America" },
  { code: "JM", name: "Jamaica", region: "Central America" },
  // South America
  { code: "BR", name: "Brazil", region: "South America" },
  { code: "AR", name: "Argentina", region: "South America" },
  { code: "CL", name: "Chile", region: "South America" },
  { code: "CO", name: "Colombia", region: "South America" },
  { code: "PE", name: "Peru", region: "South America" },
  { code: "VE", name: "Venezuela", region: "South America" },
  { code: "EC", name: "Ecuador", region: "South America" },
  { code: "UY", name: "Uruguay", region: "South America" },
  // Asia Pacific
  { code: "CN", name: "China", region: "Asia Pacific" },
  { code: "JP", name: "Japan", region: "Asia Pacific" },
  { code: "KR", name: "South Korea", region: "Asia Pacific" },
  { code: "IN", name: "India", region: "Asia Pacific" },
  { code: "SG", name: "Singapore", region: "Asia Pacific" },
  { code: "MY", name: "Malaysia", region: "Asia Pacific" },
  { code: "TH", name: "Thailand", region: "Asia Pacific" },
  { code: "ID", name: "Indonesia", region: "Asia Pacific" },
  { code: "PH", name: "Philippines", region: "Asia Pacific" },
  { code: "VN", name: "Vietnam", region: "Asia Pacific" },
  { code: "TW", name: "Taiwan", region: "Asia Pacific" },
  { code: "HK", name: "Hong Kong", region: "Asia Pacific" },
  { code: "AU", name: "Australia", region: "Asia Pacific" },
  { code: "NZ", name: "New Zealand", region: "Asia Pacific" },
  { code: "PK", name: "Pakistan", region: "Asia Pacific" },
  { code: "BD", name: "Bangladesh", region: "Asia Pacific" },
  { code: "LK", name: "Sri Lanka", region: "Asia Pacific" },
  // Africa
  { code: "ZA", name: "South Africa", region: "Africa" },
  { code: "NG", name: "Nigeria", region: "Africa" },
  { code: "KE", name: "Kenya", region: "Africa" },
  { code: "GH", name: "Ghana", region: "Africa" },
  { code: "ET", name: "Ethiopia", region: "Africa" },
  { code: "TZ", name: "Tanzania", region: "Africa" },
  { code: "UG", name: "Uganda", region: "Africa" },
  { code: "RW", name: "Rwanda", region: "Africa" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

interface CountrySelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country...",
  disabled = false,
  className,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.code === value);

  // Group countries by region
  const groupedCountries = React.useMemo(() => {
    const groups: Record<string, typeof COUNTRIES[number][]> = {};
    COUNTRIES.forEach((country) => {
      if (!groups[country.region]) {
        groups[country.region] = [];
      }
      groups[country.region].push(country);
    });
    return groups;
  }, []);

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
            <Globe className="h-4 w-4 shrink-0 opacity-50" />
            {selectedCountry
              ? `${selectedCountry.name} (${selectedCountry.code})`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            {Object.entries(groupedCountries).map(([region, countries]) => (
              <CommandGroup key={region} heading={region}>
                {countries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.code}`}
                    onSelect={() => {
                      onChange(country.code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1">{country.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {country.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Get country name from ISO code
 */
export function getCountryName(code: string): string {
  const country = COUNTRIES.find((c) => c.code === code.toUpperCase());
  return country?.name || code;
}

/**
 * Get country by code
 */
export function getCountryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

