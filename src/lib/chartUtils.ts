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
  if (data.length === 0) return [];

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

  const sortedDates = Array.from(groupedData.keys()).sort();
  if (sortedDates.length === 0) return [];

  const minDateStr = sortedDates[0];
  const maxDateStr = sortedDates[sortedDates.length - 1];

  const minDate = new Date(minDateStr);
  const maxDate = new Date(maxDateStr);
  
  // Calculate gap in days
  const timeDiff = maxDate.getTime() - minDate.getTime();
  const gapDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

  const result: ChartDataPoint[] = [];

  // If the gap is small (<= 15 days), fill missing dates to make a smooth daily chart.
  // Otherwise, just return the actual data points to avoid giant flat lines.
  if (gapDays > 0 && gapDays <= 15) {
    let lastKnownAvg = 0;
    let lastKnownLow = 0;
    let lastKnownHigh = 0;

    // Initialize with the oldest group
    const initialGroup = groupedData.get(minDateStr)!;
    lastKnownAvg = initialGroup.avgPrices.reduce((a, b) => a + b, 0) / initialGroup.avgPrices.length;
    lastKnownLow = Math.min(...initialGroup.lowPrices);
    lastKnownHigh = Math.max(...initialGroup.highPrices);

    // Loop daily from minDate to maxDate
    const tempDate = new Date(minDate);
    while (tempDate <= maxDate) {
      const dateKey = tempDate.toISOString().split("T")[0];
      const displayDate = tempDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

      if (groupedData.has(dateKey)) {
        const group = groupedData.get(dateKey)!;
        lastKnownAvg = group.avgPrices.reduce((a, b) => a + b, 0) / group.avgPrices.length;
        lastKnownLow = Math.min(...group.lowPrices);
        lastKnownHigh = Math.max(...group.highPrices);
      }

      result.push({
        date: displayDate,
        fullDate: dateKey,
        avgPrice: lastKnownAvg,
        lowPrice: lastKnownLow,
        highPrice: lastKnownHigh
      });

      tempDate.setDate(tempDate.getDate() + 1);
    }
  } else {
    // Just return the grouped data points chronologically without filling
    sortedDates.forEach(dateKey => {
      const group = groupedData.get(dateKey)!;
      const avg = group.avgPrices.reduce((a, b) => a + b, 0) / group.avgPrices.length;
      const low = Math.min(...group.lowPrices);
      const high = Math.max(...group.highPrices);
      
      const d = new Date(dateKey);
      const displayDate = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

      result.push({
        date: displayDate,
        fullDate: dateKey,
        avgPrice: avg,
        lowPrice: low,
        highPrice: high
      });
    });
  }

  return result;
}
