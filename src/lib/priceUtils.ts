/**
 * Utility functions for Estimated Price Range and Popular Selling Price logic.
 */

export interface PriceRangeDisplayOptions {
  lowPrice: number;
  highPrice: number;
  avgPrice: number;
  unitName?: string;
  unitQuantity?: number;
}

/**
 * Format estimated price range string (e.g. "ประมาณ 10 - 13 บาท" or "12 บาท")
 */
export function formatPriceRangeText(low: number, high: number, unitName: string = "บาท"): string {
  if (low === high || (low === 0 && high === 0)) {
    return `${high.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitName}`;
  }
  return `ประมาณ ${low.toLocaleString(undefined, { maximumFractionDigits: 2 })} - ${high.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unitName}`;
}

/**
 * Parse range string inputs such as "10-13", "10 - 13", "10, 12, 13" or "12"
 */
export function parsePriceRangeString(input: string): { low: number; avg: number; high: number } | null {
  if (!input || !input.trim()) return null;

  // Replace common delimiters
  const cleaned = input.replace(/[-]/g, " ").trim();
  const numbers = cleaned
    .split(/[,\s]+/)
    .map((n) => n.trim())
    .filter((n) => n !== "" && !isNaN(Number(n)))
    .map(Number);

  if (numbers.length === 0) return null;

  if (numbers.length === 1) {
    const single = numbers[0];
    return { low: single, avg: single, high: single };
  }

  if (numbers.length === 2) {
    const low = Math.min(...numbers);
    const high = Math.max(...numbers);
    const avg = Number(((low + high) / 2).toFixed(2));
    return { low, avg, high };
  }

  const low = Math.min(...numbers);
  const high = Math.max(...numbers);
  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = Number((sum / numbers.length).toFixed(2));

  return { low, avg, high };
}
