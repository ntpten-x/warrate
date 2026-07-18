"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export interface ItemPriceChartProps {
  data: {
    date: string;
    avgPrice: number;
    lowPrice: number;
    highPrice: number;
  }[];
  unitName?: string;
}

export function ItemPriceChart({ data, unitName = "ชิ้น" }: ItemPriceChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 font-gaming">
        ไม่พบข้อมูลความเคลื่อนไหวราคาประวัติเพียงพอในการคำนวณกราฟเส้น
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#121212" />
        <XAxis
          dataKey="date"
          stroke="#4b5563"
          style={{ fontSize: "10px", fontFamily: "monospace" }}
        />
        <YAxis
          stroke="#4b5563"
          style={{ fontSize: "10px", fontFamily: "monospace" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#09090b",
            borderColor: "#18181b",
            color: "#ffffff",
            fontSize: "11px",
            fontFamily: "monospace"
          }}
        />
        <Line
          type="monotone"
          dataKey="highPrice"
          name={`ราคาสูงสุด`}
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={{ r: 2 }}
        />
        <Area
          type="monotone"
          dataKey="avgPrice"
          name={`ราคาเฉลี่ยต่อ${unitName}`}
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPrice)"
        />
        <Line
          type="monotone"
          dataKey="lowPrice"
          name={`ราคาต่ำสุด`}
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={{ r: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
