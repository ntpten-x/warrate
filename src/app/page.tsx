"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ItemPriceChart } from "@/components/ItemPriceChart";
import {
  Skull,
  Search,
  Loader2,
  AlertTriangle,
  X,
  FileText,
  TrendingUp,
  Package,
  Eye,
  Flame
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
}

interface OverviewItem {
  id: string;
  name: string;
  image_url: string;
  category: {
    id: string;
    name: string;
    unit?: {
      id: string;
      name: string;
    } | null;
  };
  // Bulk attributes
  isBulk: boolean;
  unitQuantity: number;
  showUnitPrice: boolean;

  // Total Prices (lump sum package price)
  totalAvgPrice: number;
  totalLowPrice: number;
  totalHighPrice: number;

  // Unit Prices (calculated per unit)
  avgPrice: number;
  lowPrice: number;
  highPrice: number;

  note: string;
  trend: number;
  views: number;
  sparkline: number[];
  history: Array<{
    date: string;
    avgPrice: number;
    lowPrice: number;
    highPrice: number;
  }>;
}

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return <span className="text-zinc-700 text-xs font-semibold">-</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 110;
  const height = 36;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = 3 + height - 6 - ((val - min) / range) * (height - 6);
    return `${x},${y}`;
  }).join(" ");

  const isUp = data[data.length - 1] >= data[0];
  const strokeColor = isUp ? "#10b981" : "#ef4444";

  return (
    <div className="flex items-center justify-center">
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  // Overview items lists
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trending items states
  const [trendingItems, setTrendingItems] = useState<OverviewItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // Pagination and filter states
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"latest" | "trending">("trending");

  // Selected item modal details state
  const [selectedItem, setSelectedItem] = useState<OverviewItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Search input debounce handler
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchTerm.trim());
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch categories
  useEffect(() => {
    fetch("/api/categories?activeOnly=true")
      .then(res => res.ok ? res.json() : [])
      .then(data => setCategoriesList(data))
      .catch(err => console.error("Error loading categories:", err));
  }, []);

  // Fetch items overview market data
  const fetchOverviewData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const queryCat = category !== "all" ? `&category=${category}` : "";
      const querySearch = search ? `&search=${encodeURIComponent(search)}` : "";

      const res = await fetch(`/api/overview?page=${page}&limit=${limit}${queryCat}${querySearch}&sortBy=${sortBy}`, {
        signal
      });
      if (!res.ok) throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลภาพรวมตลาด");
      const data = await res.json();
      setItems(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
      setError(err.message || "ล้มเหลวในการดึงข้อมูลจากหลังบ้าน");
    } finally {
      // Only set loading false if this isn't an aborted fetch
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  // Fetch top trending items
  const fetchTrendingData = async () => {
    try {
      setTrendingLoading(true);
      const res = await fetch("/api/trending");
      if (res.ok) {
        const data = await res.json();
        setTrendingItems(data.data || []);
      }
    } catch (err) {
      console.error("Error loading trending items:", err);
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchOverviewData(abortController.signal);
    return () => abortController.abort();
  }, [page, category, search, sortBy]);

  useEffect(() => {
    fetchTrendingData();
  }, []);



  // Row details selection handler with Redis click tracking
  const handleRowClick = async (item: OverviewItem) => {
    // 1. Open modal immediately
    setSelectedItem(item);
    setModalOpen(true);

    // 2. Track click asynchronously
    try {
      const res = await fetch("/api/trending/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.views === "number") {
          // Increment views dynamically in the client state
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, views: data.views } : i))
          );
          setTrendingItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, views: data.views } : i))
          );
          setSelectedItem((prev) =>
            prev && prev.id === item.id ? { ...prev, views: data.views } : prev
          );
        }
      }
    } catch (err) {
      console.error("Failed to register click view:", err);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left w-full max-w-full overflow-hidden">
      {/* Spacer to push content down from header */}
      <div className="h-4 md:h-1 w-full" />

      {/* Welcome Title */}
      <div className="flex justify-center items-center text-center border-b border-zinc-800/60 pb-6 w-full">
        <div className="relative">
          <h2 className="font-gaming font-extrabold text-2xl tracking-widest uppercase text-white">
            อัตราการซื้อขายไอเทม
          </h2>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-game-red rounded-full shadow-[0_0_10px_rgba(198,40,40,0.8)]" />
        </div>
      </div>

      {/* Facebook Reference Source Disclaimer */}
      <div className="flex items-center gap-3 bg-neutral-950/60 border border-zinc-900/80 p-3.5 rounded-lg w-full backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative overflow-hidden group/ref">
        <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-600 transition-all duration-300 group-hover/ref:bg-blue-500" />
        <div className="w-9 h-9 rounded bg-blue-900/10 border border-blue-900/30 flex items-center justify-center text-blue-500 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.15)] group-hover/ref:scale-105 transition-transform duration-300">
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
          </svg>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold font-gaming">อ้างอิงข้อมูล</span>
          <span className="text-xs text-zinc-300 font-semibold mt-0.5 leading-normal">
            <a href="https://www.facebook.com/groups/thehof.warzth" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-extrabold hover:underline">กลุ่ม Facebook Community WarzTH</a>
          </span>
        </div>
      </div>

      {/* TRENDING ITEMS SECTION */}
      <div className="flex flex-col gap-3 w-full bg-neutral-950/20 border border-zinc-900/40 p-4 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-zinc-900/50 pb-2">
          <Flame className="w-5 h-5 text-game-red animate-pulse" />
          <h3 className="font-gaming font-extrabold text-sm tracking-wider uppercase text-zinc-155">
            ไอเทมยอดนิยม
          </h3>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-neutral-950/40 border border-zinc-900/60 rounded-lg animate-pulse flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
              </div>
            ))}
          </div>
        ) : trendingItems.length === 0 ? (
          <div className="py-6 text-center text-zinc-500 text-xs bg-neutral-950/10 border border-dashed border-zinc-900 rounded-lg">
            ยังไม่มีสถิติความเคลื่อนไหวไอเทมในขณะนี้
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingItems.slice(0, 3).map((item, idx) => {
              const rank = idx + 1;
              const rankColors =
                rank === 1
                  ? "border-amber-400 text-amber-400 bg-amber-950/40 shadow-[0_0_10px_rgba(251,191,36,0.25)]"
                  : rank === 2
                    ? "border-slate-350 text-slate-300 bg-slate-900/40 shadow-[0_0_8px_rgba(203,213,225,0.15)]"
                    : "border-amber-700 text-amber-600 bg-amber-950/20";

              return (
                <div
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="bg-neutral-950/70 border border-zinc-900/80 p-4 rounded-lg backdrop-blur-sm relative overflow-hidden group hover:border-game-red/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-300 cursor-pointer flex items-center gap-4 text-left"
                >
                  {/* Glowing rank badge */}
                  <div className={`absolute top-0 right-0 px-2.5 py-0.5 text-[9px] font-mono font-extrabold uppercase border-b border-l rounded-bl-md tracking-wider ${rankColors}`}>
                    Rank #{rank}
                  </div>

                  {/* Item Image */}
                  <div className="w-16 h-16 rounded bg-black/60 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-game-red transition-colors p-1 relative">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill sizes="64px" className="object-contain p-1" />
                    ) : (
                      <Skull className="w-4 h-4 text-zinc-700" />
                    )}
                  </div>

                  {/* Item info */}
                  <div className="flex-1 min-w-0 pr-12">
                    <h4 className="font-gaming text-zinc-150 font-extrabold text-sm tracking-wide truncate group-hover:text-game-red transition-colors">
                      {item.name}
                    </h4>

                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-[8px] uppercase font-bold text-zinc-500">
                        {item.category?.name || "ไม่ระบุหมวดหมู่"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 font-mono text-[11px]">
                      <span className="font-semibold text-emerald-400">
                        {item.showUnitPrice !== false
                          ? (item.avgPrice > 0 ? `${item.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} บ.` : "-")
                          : (item.totalAvgPrice > 0 ? `${item.totalAvgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} บ.` : "-")}
                      </span>
                      {item.showUnitPrice !== false && item.avgPrice > 0 && (
                        <span className={`text-[10px] font-bold ${item.trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {item.trend >= 0 ? `▲ +${item.trend.toFixed(1)}%` : `▼ ${item.trend.toFixed(1)}%`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-400 font-medium">
                      <Flame className="w-3.5 h-3.5 text-game-red animate-pulse shrink-0" />
                      <span className="font-mono text-zinc-300 font-semibold">{item.views.toLocaleString()}</span>
                      <span>ยอดดูรายละเอียด</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEARCH AND FILTERS CONTROLS */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-neutral-950/70 border border-zinc-900/60 p-4 rounded-lg backdrop-blur-sm w-full">
        {/* Search & Sort Panel */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full lg:max-w-xl">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="ค้นหาไอเทมตลาด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border-zinc-800/80 text-xs focus:border-game-red h-9"
              style={{ paddingLeft: "2.25rem" }}
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-black/35 border border-zinc-800/60 p-1.5 rounded-md h-9 shrink-0">
            <span className="text-[10px] text-zinc-500 font-gaming uppercase tracking-wider font-bold px-1.5">เรียงตาม:</span>
            <div className="flex gap-1">
              <button
                onClick={() => { setSortBy("trending"); setPage(1); }}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${sortBy === "trending"
                  ? "bg-game-red text-white border border-game-red font-bold shadow-[0_0_8px_rgba(198,40,40,0.4)]"
                  : "text-zinc-400 hover:text-white"
                  }`}
              >
                <Flame className="w-3.5 h-3.5 text-white shrink-0" />
                <span>ยอดนิยม</span>
              </button>
              <button
                onClick={() => { setSortBy("latest"); setPage(1); }}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${sortBy === "latest"
                  ? "bg-zinc-850 border border-zinc-700/60 text-white font-bold"
                  : "text-zinc-400 hover:text-white"
                  }`}
              >
                ล่าสุด
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Category Filters buttons */}
        <div className="flex gap-1 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
          <button
            onClick={() => { setCategory("all"); setPage(1); }}
            className={`px-3 py-1.5 rounded text-[11px] font-semibold border transition-all ${category === "all"
              ? "bg-game-red border-game-red text-white"
              : "bg-black/30 border-zinc-800/60 text-zinc-400 hover:text-white hover:border-game-red"
              }`}
          >
            ทั้งหมด
          </button>
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setPage(1); }}
              className={`px-3 py-1.5 rounded text-[11px] font-semibold border transition-all ${category === cat.id
                ? "bg-game-red border-game-red text-white"
                : "bg-black/30 border-zinc-800/60 text-zinc-400 hover:text-white hover:border-game-red"
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* MARKET DATA SUMMARY TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-game-red" />
          <span className="font-gaming text-sm">กำลังโหลดข้อมูลดัชนีราคาตลาด...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-400 bg-red-950/10 border border-red-900/20 rounded-lg">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <span className="font-gaming text-sm font-semibold">{error}</span>
          <Button onClick={() => fetchOverviewData()} size="sm" className="bg-zinc-900 hover:bg-game-red">ดึงข้อมูลใหม่</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 bg-neutral-950/20 border border-dashed border-zinc-900 rounded-lg">
          <TrendingUp className="w-10 h-10 text-zinc-700" />
          <span className="font-gaming text-sm mt-3">ไม่มีรายการความเคลื่อนไหวราคาในขณะนี้</span>
        </div>
      ) : (
        <>
          {/* Desktop/Tablet Table */}
          <Card className="hidden md:block bg-neutral-950/80 border-zinc-800/80 text-white shadow-lg backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[12px] text-zinc-500 uppercase font-bold bg-neutral-900/40 border-b border-zinc-900/40">
                  <tr>
                    <th className="px-6 py-4 w-12">#</th>
                    <th className="px-6 py-4">ไอเทม</th>
                    <th className="px-6 py-4 text-center">จำนวน</th>
                    <th className="px-6 py-4 text-center text-emerald-400">ราคาขาย</th>
                    <th className="px-6 py-4 text-center">ราคาเฉลี่ยชิ้นละ</th>
                    <th className="px-6 py-4 text-center">24h Trend</th>
                    <th className="px-6 py-4 text-center">7D Chart</th>
                    <th className="px-6 py-4 text-center w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 font-medium">
                  {items.map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className="hover:bg-zinc-900/40 cursor-pointer transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="px-6 py-6 font-mono text-xs text-zinc-500 font-bold">{(page - 1) * limit + idx + 1}</td>

                      {/* Image and Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-18 rounded bg-black/60 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-game-red transition-colors p-1.5 relative">
                            {item.image_url ? (
                              <Image src={item.image_url} alt={item.name} fill sizes="96px" className="object-contain p-1.5" />
                            ) : (
                              <Skull className="w-4 h-4 text-zinc-700" />
                            )}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-gaming text-zinc-100 font-extrabold text-base tracking-wide group-hover:text-game-red transition-colors">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-game-red animate-pulse" />
                              <span>ยอดเข้าชม {item.views.toLocaleString()} ครั้ง</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-6 text-center font-mono text-zinc-300">
                        {item.totalAvgPrice > 0 ? (
                          <span>{item.isBulk ? item.unitQuantity : 1} {item.category?.unit?.name || "ชิ้น"}</span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="px-6 py-6 text-center font-mono font-black text-base text-emerald-400 bg-emerald-500/5">
                        {item.totalAvgPrice > 0 ? (
                          <span>{item.totalAvgPrice.toLocaleString()} บาท</span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>

                      {/* Avg Price per Piece */}
                      <td className="px-6 py-6 text-center font-mono">
                        {item.showUnitPrice !== false && item.avgPrice > 0 ? (
                          <span className="text-amber-100 font-semibold">{item.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} บาท</span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>

                      {/* 24h Trend */}
                      <td className="px-6 py-6 text-center font-mono text-sm">
                        {item.showUnitPrice === false || item.avgPrice === 0 ? (
                          <span className="text-zinc-500">-</span>
                        ) : item.trend > 0 ? (
                          <span className="text-emerald-400 font-extrabold flex items-center justify-center gap-1">
                            ▲ +{item.trend.toFixed(1)}%
                          </span>
                        ) : item.trend < 0 ? (
                          <span className="text-red-400 font-extrabold flex items-center justify-center gap-1">
                            ▼ {item.trend.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-extrabold flex items-center justify-center gap-1">
                            ■ 0.0%
                          </span>
                        )}
                      </td>

                      {/* Sparkline (7D Chart) */}
                      <td className="px-6 py-4 text-center">
                        <Sparkline data={item.sparkline} />
                      </td>

                      {/* Eye Action Indicator */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center text-zinc-650 group-hover:text-game-red transition-all duration-200">
                          <Eye className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col gap-3 w-full px-3 pr-5">
            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => handleRowClick(item)}
                className="w-full overflow-hidden bg-neutral-950/70 border border-zinc-900/60 p-4 pr-5 rounded-lg flex flex-col gap-3 active:bg-zinc-900/40 transition-colors cursor-pointer text-left"
              >
                {/* Top section: image, name, rank index */}
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-500 font-bold shrink-0">
                    {(page - 1) * limit + idx + 1}
                  </div>
                  <div className="w-14 h-11 rounded bg-black/60 border border-zinc-850 flex items-center justify-center overflow-hidden p-1 shrink-0 relative">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill sizes="56px" className="object-contain p-1" />
                    ) : (
                      <Skull className="w-3.5 h-3.5 text-zinc-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="font-gaming text-zinc-100 font-extrabold text-sm tracking-wide block truncate">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 truncate">
                        {item.category?.name || "ไม่ระบุหมวดหมู่"}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400 flex items-center gap-0.5 shrink-0 bg-neutral-900/60 px-1.5 py-0.2 rounded border border-zinc-800/40">
                        <Flame className="w-3 h-3 text-game-red" />
                        <span>{item.views}</span>
                      </span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-zinc-600 shrink-0 mr-3" />
                </div>

                {/* Middle section: prices grid */}
                <div className="grid grid-cols-3 gap-2 border-t border-zinc-900/60 pt-2.5 text-center">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold truncate">จำนวน</span>
                    <span className="font-mono text-xs text-zinc-350 truncate">
                      {item.totalAvgPrice > 0 ? `${item.isBulk ? item.unitQuantity : 1} ${item.category?.unit?.name || "ชิ้น"}` : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-emerald-500/5 rounded py-0.5 min-w-0">
                    <span className="text-[9px] text-emerald-500 uppercase font-semibold truncate">ราคาขาย</span>
                    <span className="font-mono text-xs font-black text-emerald-400 truncate">
                      {item.totalAvgPrice > 0 ? `${item.totalAvgPrice.toLocaleString()} บ.` : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold truncate">เฉลี่ย/หน่วย</span>
                    <span className="font-mono text-xs font-semibold text-amber-100 truncate">
                      {item.showUnitPrice !== false && item.avgPrice > 0 ? `${item.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} บ.` : "-"}
                    </span>
                  </div>
                </div>

                {/* Bottom section: 24h Trend */}
                {item.showUnitPrice !== false && item.avgPrice > 0 && (
                  <div className="flex justify-between items-center bg-black/40 border border-zinc-900/30 px-3 py-1.5 rounded text-[10px] font-mono">
                    <span className="text-zinc-500 uppercase font-semibold font-gaming truncate">เทรนด์ 24h</span>
                    {item.trend > 0 ? (
                      <span className="text-emerald-400 font-bold pr-2 shrink-0">▲ +{item.trend.toFixed(1)}%</span>
                    ) : item.trend < 0 ? (
                      <span className="text-red-400 font-bold pr-2 shrink-0">▼ {item.trend.toFixed(1)}%</span>
                    ) : (
                      <span className="text-zinc-400 font-bold pr-2 shrink-0">■ 0.0%</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination component */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={limit}
      />

      {/* Spacer to separate pagination from footer */}
      <div className="h-10 md:h-16 w-full shrink-0" />

      {/* DETAIL MODAL WITH RECHARTS GRAPHS */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-neutral-950 border border-zinc-800 shadow-2xl rounded-lg overflow-hidden animate-[pulse-glow-red_4s_infinite] relative">
            <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-game-red to-transparent" />

            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-950 flex justify-between items-center text-left">
              <div className="flex items-center gap-3">
                <div className="w-20 h-16 rounded bg-black/80 border border-zinc-800 flex items-center justify-center overflow-hidden p-1 shrink-0 relative">
                  {selectedItem.image_url ? (
                    <Image src={selectedItem.image_url} alt={selectedItem.name} fill sizes="80px" className="object-contain p-1" />
                  ) : (
                    <Skull className="w-4 h-4 text-zinc-700" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-gaming font-extrabold text-md tracking-wider text-white">
                    {selectedItem.name}
                  </h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {selectedItem.category?.name || "ไม่ระบุหมวดหมู่"}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/30 text-zinc-350 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-game-red animate-pulse" />
                      <span>{selectedItem.views.toLocaleString()} views</span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-6 text-left">

              {/* Wholesale Alert banner if it is a bulk package */}
              {selectedItem.isBulk && (
                <div className="bg-amber-950/20 border border-amber-900/30 rounded p-3 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center text-amber-400 font-semibold gap-2 w-full">
                  <span className="flex items-center gap-1.5 font-gaming uppercase tracking-wider shrink-0">
                    <Package className="w-4 h-4" /> เรทการซื้อขาย
                  </span>
                  <span className="font-mono text-center sm:text-right w-full sm:w-auto">
                    จำนวน : {selectedItem.unitQuantity} {selectedItem.category?.unit?.name || "ชิ้น"}{selectedItem.showUnitPrice !== false && ` | เฉลี่ยตก${selectedItem.category?.unit?.name || "ชิ้น"}ละ: ${selectedItem.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} บาท`}
                  </span>
                </div>
              )}

              {/* Three column prices stats block (Unit Prices or Total Package Prices) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                <div className="bg-black/40 border border-zinc-900/60 rounded p-2 sm:p-3 flex flex-col gap-0.5 sm:gap-1 justify-center min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-gaming font-semibold truncate">
                    {selectedItem.showUnitPrice !== false ? `ราคาต่อ${selectedItem.category?.unit?.name || "ชิ้น"}` : "ราคาขาย"}
                  </span>
                  <span className="font-mono text-xs sm:text-base md:text-lg font-extrabold text-emerald-400 truncate">
                    {selectedItem.showUnitPrice !== false
                      ? (selectedItem.avgPrice > 0 ? `${selectedItem.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} บ.` : "-")
                      : (selectedItem.totalAvgPrice > 0 ? `${selectedItem.totalAvgPrice.toLocaleString()} บ.` : "-")}
                  </span>
                  {selectedItem.showUnitPrice !== false && selectedItem.avgPrice > 0 && (
                    <span className={`text-[9px] sm:text-[10px] font-bold ${selectedItem.trend >= 0 ? "text-emerald-400" : "text-red-400"} truncate`}>
                      {selectedItem.trend >= 0 ? `▲ +${selectedItem.trend.toFixed(1)}%` : `▼ ${selectedItem.trend.toFixed(1)}%`}
                    </span>
                  )}
                </div>
                <div className="bg-black/40 border border-zinc-900/60 rounded p-2 sm:p-3 flex flex-col gap-0.5 sm:gap-1 justify-center min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-gaming font-semibold truncate">
                    {selectedItem.showUnitPrice !== false ? `ราคาสูงสุดต่อ${selectedItem.category?.unit?.name || "ชิ้น"}` : "ราคาสูงสุด"}
                  </span>
                  <span className="font-mono text-xs sm:text-base md:text-lg font-extrabold text-blue-400 truncate">
                    {selectedItem.showUnitPrice !== false
                      ? (selectedItem.highPrice > 0 ? `${selectedItem.highPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} บ.` : "-")
                      : (selectedItem.totalHighPrice > 0 ? `${selectedItem.totalHighPrice.toLocaleString()} บ.` : "-")}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-zinc-500 truncate">สูงสุดที่พบ</span>
                </div>
                <div className="bg-black/40 border border-zinc-900/60 rounded p-2 sm:p-3 flex flex-col gap-0.5 sm:gap-1 justify-center min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-gaming font-semibold truncate">
                    {selectedItem.showUnitPrice !== false ? `ราคาต่ำสุดต่อ${selectedItem.category?.unit?.name || "ชิ้น"}` : "ราคาต่ำสุด"}
                  </span>
                  <span className="font-mono text-xs sm:text-base md:text-lg font-extrabold text-red-400 truncate">
                    {selectedItem.showUnitPrice !== false
                      ? (selectedItem.lowPrice > 0 ? `${selectedItem.lowPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} บ.` : "-")
                      : (selectedItem.totalLowPrice > 0 ? `${selectedItem.totalLowPrice.toLocaleString()} บ.` : "-")}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-zinc-500 truncate">ต่ำสุดที่พบ</span>
                </div>
              </div>

              {/* Recharts dynamic line area chart */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-zinc-400 font-gaming uppercase font-semibold tracking-wider">
                  กราฟแสดงราคาเรทการซื้อขาย
                </span>
                <div className="w-full h-[220px] bg-black/60 border border-zinc-900/80 rounded p-3 relative">
                  {selectedItem.history.length < 2 ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 font-gaming">
                      ไม่พบข้อมูลความเคลื่อนไหวราคาประวัติเพียงพอในการคำนวณกราฟเส้น
                    </div>
                  ) : (
                    <ItemPriceChart
                      data={selectedItem.history}
                      unitName={selectedItem.category?.unit?.name || "ชิ้น"}
                    />
                  )}
                </div>
              </div>

              {/* Note Memo */}
              <div className="bg-black/30 border border-zinc-900/60 rounded p-3 text-xs flex flex-col gap-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-gaming font-semibold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-game-red" /> Note / บันทึกเพิ่มเติม:
                </span>
                <span className="text-zinc-300 italic">
                  {selectedItem.note ? `"${selectedItem.note}"` : "ไม่มีบันทึกข้อมูลเพิ่มเติมจากแอดมิน"}
                </span>
              </div>

              {/* Action Close Panel */}
              <div className="flex justify-end border-t border-zinc-900/60 pt-4">
                <Button
                  onClick={() => setModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs px-4"
                >
                  ปิดหน้าต่าง
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
