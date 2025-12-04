/**
 * Geographic Types for Country-Region-Territory Reporting
 */

export interface Region {
  id: string;
  code: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Territory {
  id: string;
  code: string;
  name: string;
  region_id?: string;
  region?: Region;
  countries: string[];
  description?: string;
  display_order: number;
  is_active: boolean;
  brand_id?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TerritoryWithMetrics extends Territory {
  region_name?: string;
  region_code?: string;
  total_revenue: number;
  distributor_count: number;
  order_count: number;
}

export interface SalesByTerritory {
  territory: string;
  territory_id?: string;
  region_name?: string;
  region_id?: string;
  revenue: number;
  revenue_display: string;
  previous_revenue: number;
  revenue_growth_percentage: number;
  revenue_growth_display: string;
  country_count: number;
  countries: string;
}

export interface SalesByRegion {
  region: string;
  region_id?: string;
  region_code?: string;
  revenue: number;
  revenue_display: string;
  previous_revenue: number;
  revenue_growth_percentage: number;
  revenue_growth_display: string;
  territory_count: number;
  country_count: number;
}

/**
 * ISO 3166-1 alpha-2 country codes commonly used in the system
 */
export const COUNTRY_CODES = {
  // GCC
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  KW: "Kuwait",
  QA: "Qatar",
  BH: "Bahrain",
  OM: "Oman",
  // Levant
  JO: "Jordan",
  LB: "Lebanon",
  IQ: "Iraq",
  SY: "Syria",
  PS: "Palestine",
  // MENA
  EG: "Egypt",
  MA: "Morocco",
  TN: "Tunisia",
  DZ: "Algeria",
  // Europe
  GB: "United Kingdom",
  UK: "United Kingdom",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  BE: "Belgium",
  LU: "Luxembourg",
  ES: "Spain",
  IT: "Italy",
  PT: "Portugal",
  GR: "Greece",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IS: "Iceland",
  // North America
  US: "United States",
  CA: "Canada",
  // APAC
  AU: "Australia",
  NZ: "New Zealand",
  CN: "China",
  JP: "Japan",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  ID: "Indonesia",
  PH: "Philippines",
  VN: "Vietnam",
  IN: "India",
} as const;

export type CountryCode = keyof typeof COUNTRY_CODES;

/**
 * Get country name from ISO code
 */
export function getCountryName(code: string): string {
  const upperCode = code.toUpperCase() as CountryCode;
  return COUNTRY_CODES[upperCode] || code;
}

