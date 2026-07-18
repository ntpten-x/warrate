export interface RawPriceData {
  recordedAt: string | Date;
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
  unitQuantity?: number;
  showUnitPrice?: boolean;
}

export interface ChartDataPoint {
  date: string;       // Formatted date e.g., "18 ก.ค."
  fullDate: string;   // YYYY-MM-DD
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
}

/**
 * Groups price data by day, averages multiple entries per day, and fills missing dates.
 * @param data Array of raw price records
 * @param days Number of days to look back (default 7)
 * @param normalizeToUnit If true, prices are divided by unitQuantity
 * @returns Array of ChartDataPoint with continuous dates
 */
export function fillMissingDatesAndGroup(
  data: RawPriceData[],
  days: number = 7,
  normalizeToUnit: boolean = true
): ChartDataPoint[] {
  const result: ChartDataPoint[] = [];
  const today = new Date();
  
  // Create a map to group data by YYYY-MM-DD
  const groupedData = new Map<string, { avgPrices: number[], lowPrices: number[], highPrices: number[] }>();

  data.forEach(record => {
    const d = new Date(record.recordedAt);
    const dateKey = d.toISOString().split("T")[0]; // YYYY-MM-DD
    
    let avg = record.avgPrice;
    let low = record.lowPrice;
    let high = record.highPrice;

    if (normalizeToUnit) {
      const qty = record.unitQuantity || 1;
      // If showUnitPrice is explicitly false and we are normalizing, we still use the raw price 
      // depending on the business logic. But usually normalizeToUnit means we want the per-unit price.
      if (record.showUnitPrice !== false) {
        avg = avg / qty;
        low = low / qty;
        high = high / qty;
      }
    }

    if (!groupedData.has(dateKey)) {
      groupedData.set(dateKey, { avgPrices: [], lowPrices: [], highPrices: [] });
    }
    const group = groupedData.get(dateKey)!;
    group.avgPrices.push(avg);
    group.lowPrices.push(low);
    group.highPrices.push(high);
  });

  // Keep track of the last known prices to forward-fill if a day has no data
  let lastKnownAvg = 0;
  let lastKnownLow = 0;
  let lastKnownHigh = 0;

  // Find the earliest known price before the 7-day window to use as initial fill value
  const pastDates = Array.from(groupedData.keys()).sort();
  if (pastDates.length > 0) {
    const oldestKey = pastDates[0];
    const group = groupedData.get(oldestKey)!;
    lastKnownAvg = group.avgPrices.reduce((a, b) => a + b, 0) / group.avgPrices.length;
    lastKnownLow = Math.min(...group.lowPrices);
    lastKnownHigh = Math.max(...group.highPrices);
  }

  // Generate continuous dates from (today - days + 1) to today
  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i);
    const dateKey = targetDate.toISOString().split("T")[0];
    const displayDate = targetDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

    if (groupedData.has(dateKey)) {
      const group = groupedData.get(dateKey)!;
      // Average the avgPrices
      lastKnownAvg = group.avgPrices.reduce((a, b) => a + b, 0) / group.avgPrices.length;
      // Min of lowPrices
      lastKnownLow = Math.min(...group.lowPrices);
      // Max of highPrices
      lastKnownHigh = Math.max(...group.highPrices);
    }
    
    // If we have no data at all yet (even before the window), we'll push 0.
    // In a real app, you might want to skip pushing until the first non-zero, or just push 0.
    result.push({
      date: displayDate,
      fullDate: dateKey,
      avgPrice: lastKnownAvg,
      lowPrice: lastKnownLow,
      highPrice: lastKnownHigh
    });
  }

  return result;
}
