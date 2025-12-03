/**
 * Centralized formatting utilities for consistent display across the application
 */

/**
 * Format a number as currency
 * @param amount - The amount to format (can be null/undefined)
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "USD"
): string {
  // Handle null/undefined - return $0.00
  const value = amount ?? 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number with thousand separators
 * @param value - The number to format (can be null/undefined)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string (e.g., "1,234")
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 0
): string {
  const num = value ?? 0;

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a percentage value
 * @param value - The percentage value (can be null/undefined)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "12.5%")
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  const num = value ?? 0;

  return `${num.toFixed(decimals)}%`;
}

