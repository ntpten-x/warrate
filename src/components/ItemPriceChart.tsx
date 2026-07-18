"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#09090b]/95 border border-[#27272a] p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-[#a1a1aa] text-[10px] mb-2 font-mono">{label}</p>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between gap-6">
            <span className="text-[#3b82f6]">ราคาสูงสุด:</span>
            <span className="font-semibold text-white">{data.highPrice?.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-[#10b981]">ราคาเฉลี่ย:</span>
            <span className="font-semibold text-white">{data.avgPrice?.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-[#ef4444]">ราคาต่ำสุด:</span>
            <span className="font-semibold text-white">{data.lowPrice?.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fontFamily: "monospace" }}
          dy={10}
        />
        <YAxis
          stroke="#71717a"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fontFamily: "monospace" }}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="avgPrice"
          name={`ราคาเฉลี่ยต่อ${unitName}`}
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPrice)"
          activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
