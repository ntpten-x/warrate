"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { parseClientError } from "@/lib/error";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  TrendingUp,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Copy,
  Calendar,
  FileText,
  DollarSign
} from "lucide-react";

interface Item {
  id: string;
  name: string;
  image_url?: string;
  category?: {
    id: string;
    name: string;
    unit?: {
      id: string;
      name: string;
    } | null;
  };
}

interface PriceRecord {
  id: string;
  item: Item;
  lowPrice: number;
  highPrice: number;
  avgPrice: number;
  source: string;
  note?: string;
  recordedAt: string;
  createdAt: string;
  unitQuantity?: number;
  isBulk?: boolean;
}

function PricesContent() {
  const searchParams = useSearchParams();
  const addItemId = searchParams.get("addItemId");

  // Lists
  const [items, setItems] = useState<Item[]>([]);
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterItemId, setFilterItemId] = useState<string>("all");

  // Selected item's entire price history for the SVG line chart
  const [historyPrices, setHistoryPrices] = useState<PriceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceRecord | null>(null);
  const [formItemId, setFormItemId] = useState("");
  const [formLowPrice, setFormLowPrice] = useState("");
  const [formHighPrice, setFormHighPrice] = useState("");
  const [formAvgPrice, setFormAvgPrice] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formRecordedAt, setFormRecordedAt] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Price warning state (if price deviates > 50% from previous entry)
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // Latest price record cache for deviation checking & template copy
  const [latestCachedPrice, setLatestCachedPrice] = useState<PriceRecord | null>(null);

  const [formUnitQuantity, setFormUnitQuantity] = useState("1");
  const [formIsBulk, setFormIsBulk] = useState(false);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch registered items for select dropdowns
  const fetchItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const res = await fetch("/api/manage-items?limit=100", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching items list:", err);
    }
  };

  // Fetch paginated price logs
  const fetchPrices = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryItem = filterItemId !== "all" ? `&itemId=${filterItemId}` : "";
      const res = await fetch(`/api/prices?page=${page}&limit=${limit}${queryItem}`);
      if (!res.ok) throw res;

      const data = await res.json();
      setPrices(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (err: any) {
      console.error("Fetch Prices Error:", err);
      const msg = await parseClientError(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full history of selected item for trend SVG plotting
  const fetchItemHistory = async (itemId: string) => {
    if (!itemId || itemId === "all") {
      setHistoryPrices([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/prices?limit=50&itemId=${itemId}`);
      if (res.ok) {
        const data = await res.json();
        // Reverse array to render chronologically (oldest to newest)
        const records = (data.data || []).reverse();
        setHistoryPrices(records);
      }
    } catch (err) {
      console.error("Error fetching item price history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Pre-open add price form modal if addItemId query parameter is provided
  useEffect(() => {
    if (addItemId && items.length > 0) {
      const matched = items.find(it => it.id === addItemId);
      if (matched) {
        setFormItemId(addItemId);
        setFilterItemId(addItemId);
        setEditingPrice(null);
        setFormLowPrice("");
        setFormHighPrice("");
        setFormAvgPrice("");
        setFormSource("");
        setFormNote("");
        const localNow = new Date();
        const formattedDate = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setFormRecordedAt(formattedDate);
        setFormError(null);
        setShowDeviationWarning(false);
        setModalOpen(true);
      }
    }
  }, [addItemId, items]);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    fetchPrices();
    if (filterItemId !== "all") {
      fetchItemHistory(filterItemId);
    } else {
      setHistoryPrices([]);
    }
  }, [page, filterItemId]);

  // Load latest price record for copy template / validation on item select inside form
  useEffect(() => {
    if (!formItemId) {
      setLatestCachedPrice(null);
      return;
    }
    fetch(`/api/prices?latest=true&itemId=${formItemId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setLatestCachedPrice(data);
      })
      .catch((err) => console.error("Error getting latest price:", err));
  }, [formItemId]);

  // Copy Template Handler
  const handleCopyLatest = () => {
    if (!latestCachedPrice) {
      toast.error("ไม่พบประวัติราคาก่อนหน้าของไอเทมนี้ให้คัดลอก");
      return;
    }
    setFormLowPrice(String(latestCachedPrice.lowPrice));
    setFormHighPrice(String(latestCachedPrice.highPrice));
    setFormAvgPrice(String(latestCachedPrice.avgPrice));
    setFormSource(latestCachedPrice.source);
    setFormNote(latestCachedPrice.note || "");
    setFormUnitQuantity(String(latestCachedPrice.unitQuantity || 1));
    setFormIsBulk(!!latestCachedPrice.isBulk);
    toast.success("คัดลอกราคาและแหล่งอ้างอิงล่าสุดเรียบร้อย!");
  };

  // Trigger form state for Create
  const handleOpenAdd = () => {
    setEditingPrice(null);
    setFormItemId(items[0]?.id || "");
    setFormLowPrice("");
    setFormHighPrice("");
    setFormAvgPrice("");
    setFormSource("");
    setFormNote("");
    setFormUnitQuantity("1");
    setFormIsBulk(false);
    // Set default recorded datetime to local timezone string format
    const localNow = new Date();
    const formattedDate = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormRecordedAt(formattedDate);
    setFormError(null);
    setShowDeviationWarning(false);
    setModalOpen(true);
  };

  // Trigger form state for Edit
  const handleOpenEdit = (record: PriceRecord) => {
    setEditingPrice(record);
    setFormItemId(record.item.id);
    setFormLowPrice(String(record.lowPrice));
    setFormHighPrice(String(record.highPrice));
    setFormAvgPrice(String(record.avgPrice));
    setFormSource(record.source);
    setFormNote(record.note || "");
    setFormUnitQuantity(String(record.unitQuantity || 1));
    setFormIsBulk(!!record.isBulk);

    const recordDate = new Date(record.recordedAt);
    const formattedDate = new Date(recordDate.getTime() - recordDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormRecordedAt(formattedDate);

    setFormError(null);
    setShowDeviationWarning(false);
    setModalOpen(true);
  };

  // Check price deviation before submitting
  const checkPriceDeviation = () => {
    if (!formAvgPrice || !latestCachedPrice) return false;
    const newQty = formIsBulk ? Number(formUnitQuantity || 1) : 1;
    const newUnitAvg = Number(formAvgPrice) / newQty;
    const oldUnitAvg = latestCachedPrice.avgPrice / (latestCachedPrice.unitQuantity || 1);

    // Check if new price deviates > 50%
    const ratio = newUnitAvg / oldUnitAvg;
    if (ratio > 1.5 || ratio < 0.5) {
      const percentage = Math.round(Math.abs(ratio - 1) * 100);
      const classifier = items.find(i => i.id === formItemId)?.category?.unit?.name || "ชิ้น";
      setWarningMessage(
        `ราคาต่อ${classifier}เฉลี่ยใหม่ (${newUnitAvg.toLocaleString()} บาท) แตกต่างจากราคาก่อนหน้า (${oldUnitAvg.toLocaleString()} บาท) ถึง ${percentage}% กรุณายืนยันความถูกต้องอีกครั้ง`
      );
      return true;
    }
    return false;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemId || !formLowPrice || !formHighPrice || !formAvgPrice || !formSource) {
      setFormError("กรุณาระบุข้อมูลราคาและแหล่งที่มาอ้างอิงให้ครบถ้วน");
      return;
    }

    const low = Number(formLowPrice);
    const high = Number(formHighPrice);
    const avg = Number(formAvgPrice);

    if (low > avg || avg > high) {
      setFormError("กฎธุรกิจ: ราคาต่ำสุด (Low) <= ราคากลาง (Avg) <= ราคาสูงสุด (High)");
      return;
    }

    // Trigger warning confirmation once if it deviates significantly
    if (!showDeviationWarning && checkPriceDeviation()) {
      setShowDeviationWarning(true);
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      if (editingPrice) {
        // Edit price record
        const res = await fetch("/api/prices", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            id: editingPrice.id,
            itemId: formItemId,
            lowPrice: low,
            highPrice: high,
            avgPrice: avg,
            source: formSource.trim(),
            note: formNote.trim(),
            recordedAt: formRecordedAt ? new Date(formRecordedAt).toISOString() : new Date().toISOString(),
            unitQuantity: Number(formUnitQuantity || 1),
            isBulk: formIsBulk,
          })
        });

        if (!res.ok) throw res;
        toast.success("แก้ไขข้อมูลประวัติราคาสำเร็จ!");
      } else {
        // Create price record
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            itemId: formItemId,
            lowPrice: low,
            highPrice: high,
            avgPrice: avg,
            source: formSource.trim(),
            note: formNote.trim(),
            recordedAt: formRecordedAt ? new Date(formRecordedAt).toISOString() : new Date().toISOString(),
            unitQuantity: Number(formUnitQuantity || 1),
            isBulk: formIsBulk,
          })
        });

        if (!res.ok) throw res;
        toast.success("บันทึกราคาใหม่สำเร็จ!");
      }

      setModalOpen(false);
      fetchPrices();
      if (formItemId === filterItemId) {
        fetchItemHistory(formItemId);
      }
    } catch (err: any) {
      const msg = await parseClientError(err);
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Price Handler
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`/api/prices?id=${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw res;

      toast.success("ลบประวัติราคาเรียบร้อยแล้ว!");
      setDeleteConfirmId(null);
      fetchPrices();
      if (filterItemId !== "all") {
        fetchItemHistory(filterItemId);
      }
    } catch (err: any) {
      const msg = await parseClientError(err);
      toast.error("ลบรายการราคาล้มเหลว", { description: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  // SVG Custom line chart logic computed from selected item history records
  const svgChart = useMemo(() => {
    if (historyPrices.length < 2) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-gaming">
          บันทึกประวัติราคาอย่างน้อย 2 รายการเพื่อสร้างกราฟเทรนด์
        </div>
      );
    }

    const padding = 45;
    const width = 460;
    const height = 180;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Retrieve price min and max
    const pricesList = historyPrices.map((p) => p.avgPrice);
    const minVal = Math.min(...pricesList) * 0.95; // 5% cushion under
    const maxVal = Math.max(...pricesList) * 1.05; // 5% cushion above
    const valRange = maxVal - minVal || 1;

    // Coordinate converters
    const getX = (idx: number) => {
      return padding + (idx / (historyPrices.length - 1)) * chartWidth;
    };

    const getY = (val: number) => {
      return height - padding - ((val - minVal) / valRange) * chartHeight;
    };

    // Construct path line strings
    const points = historyPrices.map((p, idx) => ({ x: getX(idx), y: getY(p.avgPrice) }));
    const pathD = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    // Area path string under the line
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-zinc-400">
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c62828" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c62828" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal Grid lines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const val = minVal + ratio * valRange;
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#1f1f1f"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 8}
                y={y + 4}
                className="text-[9px] font-mono fill-zinc-500 text-right"
                textAnchor="end"
              >
                {Math.round(val).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Gradient fill area under line */}
        <path d={areaD} fill="url(#area-gradient)" />

        {/* Dynamic neon line trend path */}
        <path
          d={pathD}
          fill="none"
          stroke="#c62828"
          strokeWidth="2.5"
          filter="url(#glow)"
        />

        {/* Interactive Data dots with indicators */}
        {points.map((p, idx) => {
          const rec = historyPrices[idx];
          return (
            <g key={idx} className="group/dot cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#ffffff"
                stroke="#c62828"
                strokeWidth="2"
              />
              {/* Tooltip trigger details */}
              <title>
                {`วันที่: ${new Date(rec.recordedAt).toLocaleDateString("th-TH")}\nเฉลี่ย: ${rec.avgPrice.toLocaleString()} บาท\nแหล่งที่มา: ${rec.source}`}
              </title>
            </g>
          );
        })}

        {/* X Axis Dates labels */}
        {historyPrices.map((p, idx) => {
          // Render label only for first, middle and last elements to prevent labels overlaying
          if (idx === 0 || idx === Math.floor(historyPrices.length / 2) || idx === historyPrices.length - 1) {
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - padding + 16}
                className="text-[9px] fill-zinc-500"
                textAnchor="middle"
              >
                {new Date(p.recordedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </text>
            );
          }
          return null;
        })}
      </svg>
    );
  }, [historyPrices]);
  return (
    <div className="flex flex-col gap-6 text-left w-full max-w-full overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-4">
        <div>
          <h2 className="font-gaming font-extrabold text-2xl tracking-wide flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-game-red animate-pulse" />
            MARKET PRICE DATABASE
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            บันทึกประวัติราคาตลาดสินค้า วิเคราะห์เทรนด์ และจัดเก็บราคาซื้อขายย้อนหลัง
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-game-red hover:bg-game-red-hover border border-red-600 font-gaming text-xs font-bold px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          เพิ่มราคาใหม่
        </Button>
      </div>

      {/* Grid containing line trend chart and logs filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line chart (2/3 width) */}
        <Card className="lg:col-span-2 bg-neutral-950/70 border-zinc-900/60 text-white backdrop-blur-sm shadow-xl p-4 flex flex-col justify-between h-[280px]">
          <div>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="font-gaming text-xs font-bold tracking-wider text-game-red uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Average Price Trend (บาท)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {filterItemId === "all" ? "กรุณาเลือกไอเทมตัวกรองด้านล่าง" : `ไอเทม ID: ${filterItemId.slice(0, 8)}...`}
              </span>
            </div>
          </div>
          <div className="flex-1 mt-2">
            {historyLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-game-red" /> กำลังโหลดประวัติแนวโน้มราคา...
              </div>
            ) : filterItemId === "all" ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-gaming">
                กรุณาเลือกกรองไอเทมเฉพาะทางเพื่อรับชมกราฟประวัติแนวโน้มราคาตลาด
              </div>
            ) : (
              svgChart
            )}
          </div>
        </Card>

        {/* Filter Selection Panel (1/3 width) */}
        <Card className="bg-neutral-950/70 border-zinc-900/60 text-white backdrop-blur-sm shadow-xl p-5 flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-gaming font-extrabold text-sm uppercase text-white">Item Filter Selector</h3>
              <p className="text-[11px] text-zinc-500 mt-1">กรองสืบค้นเฉพาะไอเทมที่ท่านต้องการดูเทรนด์กราฟราคา</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-zinc-400 font-gaming font-semibold">เลือกไอเทม:</label>
              <select
                value={filterItemId}
                onChange={(e) => {
                  setFilterItemId(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-game-red"
              >
                <option value="all">-- แสดงประวัติราคาทั้งหมด --</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-4 mt-4 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>รายการที่แสดง:</span>
            <span>{totalItems} รายการ</span>
          </div>
        </Card>
      </div>

      {/* Main Prices Logs Table list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-game-red" />
          <span className="font-gaming text-sm">กำลังโหลดบันทึกราคา...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-400 bg-red-950/10 border border-red-900/20 rounded-lg">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <span className="font-gaming text-sm font-semibold">{error}</span>
          <Button onClick={fetchPrices} size="sm" className="bg-zinc-900 hover:bg-game-red">ลองใหม่</Button>
        </div>
      ) : prices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-neutral-950/20 border border-dashed border-zinc-900 rounded-lg">
          <TrendingUp className="w-10 h-10 text-zinc-700" />
          <span className="font-gaming text-sm mt-3">ไม่มีบันทึกประวัติราคาในระบบ</span>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden md:block bg-neutral-950/80 border-zinc-800/80 text-white shadow-lg backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] text-zinc-500 uppercase font-semibold bg-neutral-900/40 border-b border-zinc-900/40">
                  <tr>
                    <th className="px-6 py-4 w-12">#</th>
                    <th className="px-6 py-4">ไอเทม</th>
                    <th className="px-6 py-4 text-center">ราคาต่ำสุด</th>
                    <th className="px-6 py-4 text-center">ราคาขาย</th>
                    <th className="px-6 py-4 text-center">ราคาสูงสุด</th>
                    <th className="px-6 py-4">แหล่งอ้างอิง</th>
                    <th className="px-6 py-4">หมายเหตุ</th>
                    <th className="px-6 py-4">วันที่บันทึก</th>
                    <th className="px-6 py-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 font-medium text-xs">
                  {prices.map((record, idx) => (
                    <tr key={record.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-500 font-bold">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-gaming text-zinc-100 font-bold tracking-wide">{record.item?.name}</span>
                          {record.isBulk ? (
                            <span className="text-[10px] text-amber-400 font-mono font-semibold">
                              📦 เรทการซื้อขาย {record.unitQuantity} {record.item?.category?.unit?.name || "ชิ้น"} | {record.item?.category?.unit?.name || "ชิ้น"}ละ {(record.avgPrice / (record.unitQuantity || 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })} บาท
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-505 font-mono">
                              👤 เรท 1 : 1
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-red-400 font-bold">{record.lowPrice.toLocaleString()} บาท</td>
                      <td className="px-6 py-4 text-center font-mono text-game-green font-extrabold">{record.avgPrice.toLocaleString()} บาท</td>
                      <td className="px-6 py-4 text-center font-mono text-blue-400 font-bold">{record.highPrice.toLocaleString()} บาท</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {record.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[150px] truncate text-zinc-400 italic" title={record.note}>
                        {record.note || "-"}
                      </td>
                      <td className="px-6 py-4 text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-1 border-none">
                        <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                        {new Date(record.recordedAt).toLocaleString("th-TH")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => handleOpenEdit(record)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-[11px] h-7 rounded border border-zinc-800 px-3 font-gaming"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> EDIT
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirmId(record.id)}
                            className="bg-zinc-900 hover:bg-game-red text-red-500 hover:text-white border border-zinc-850 hover:border-game-red h-7 w-8 rounded flex items-center justify-center p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Mobile Card List */}
          <div className="md:hidden flex flex-col gap-3 w-full px-2">
            {prices.map((record, idx) => (
              <div
                key={record.id}
                className="w-full bg-neutral-950/70 border border-zinc-900/60 p-4 rounded-lg flex flex-col gap-3"
              >
                {/* Top section: Name and Rank index */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-gaming text-zinc-100 font-extrabold text-sm tracking-wide block truncate">
                      {record.item?.name}
                    </span>
                    {record.isBulk ? (
                      <span className="text-[10px] text-amber-400 font-mono font-semibold block truncate">
                        📦 เรท {record.unitQuantity} {record.item?.category?.unit?.name || "ชิ้น"}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        👤 เรท 1 : 1
                      </span>
                    )}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-500 font-bold shrink-0">
                    {(page - 1) * limit + idx + 1}
                  </div>
                </div>

                {/* Middle details: low, avg, high price */}
                <div className="grid grid-cols-3 gap-2 border-t border-zinc-900/60 pt-2.5 text-center text-xs">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold truncate">ต่ำสุด</span>
                    <span className="text-red-400 font-mono font-bold text-xs truncate">
                      {record.lowPrice.toLocaleString()} บ.
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 bg-emerald-500/5 rounded py-0.5">
                    <span className="text-[9px] text-emerald-500 uppercase font-semibold truncate">ราคาขาย</span>
                    <span className="text-game-green font-mono font-extrabold text-xs truncate">
                      {record.avgPrice.toLocaleString()} บ.
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold truncate">สูงสุด</span>
                    <span className="text-blue-400 font-mono font-bold text-xs truncate">
                      {record.highPrice.toLocaleString()} บ.
                    </span>
                  </div>
                </div>

                {/* Info summary: source & date */}
                <div className="flex flex-col gap-1 border-t border-zinc-900/60 pt-2.5 text-[10px] text-zinc-500 font-mono">
                  <div className="flex justify-between items-center">
                    <span>แหล่งอ้างอิง:</span>
                    <span className="text-zinc-400 font-semibold">{record.source}</span>
                  </div>
                  {record.note && (
                    <div className="flex justify-between items-center">
                      <span>หมายเหตุ:</span>
                      <span className="text-zinc-400 truncate max-w-[180px]">{record.note}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span>วันที่บันทึก:</span>
                    <span className="text-zinc-400">{new Date(record.recordedAt).toLocaleDateString("th-TH")}</span>
                  </div>
                </div>

                {/* Actions panel */}
                <div className="flex gap-2 border-t border-zinc-900/60 pt-2.5">
                  <Button
                    onClick={() => handleOpenEdit(record)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-[11px] h-7 rounded border border-zinc-800 font-gaming"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    แก้ไข
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirmId(record.id)}
                    className="bg-zinc-900 hover:bg-game-red hover:text-white hover:border-game-red text-red-500 border border-zinc-850 h-7 w-8 rounded flex items-center justify-center p-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Reusable Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={limit}
      />

      {/* Spacer to separate pagination from footer */}
      <div className="h-10 md:h-16 w-full shrink-0" />

      {/* FORM MODAL (Add / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-950 border border-zinc-800 shadow-2xl rounded-lg overflow-hidden animate-[pulse-glow-red_4s_infinite] relative">
            <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-game-red to-transparent" />

            <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
              <h3 className="font-gaming font-extrabold text-md tracking-wider uppercase text-white">
                {editingPrice ? "แก้ไขเรทราคาไอเทม" : "เพิ่มเรทราคาไอเทม"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-left">
              {formError && (
                <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/40 p-2.5 rounded">
                  ⚠️ {formError}
                </div>
              )}

              {showDeviationWarning && (
                <div className="text-xs text-yellow-400 bg-yellow-950/20 border border-yellow-900/40 p-3 rounded flex flex-col gap-2">
                  <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> เตือนการแกว่งราคารุนแรง:</span>
                  <span>{warningMessage}</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Bypass check
                      setShowDeviationWarning(false);
                      handleSubmit(new Event("submit") as any);
                    }}
                    className="mt-1 text-left text-[10px] text-zinc-100 underline hover:text-game-red font-semibold"
                  >
                    ฉันยืนยันว่าราคาถูกต้องและขอกดบันทึกต่อไป
                  </button>
                </div>
              )}

              {/* Item selection and template copy button in one row */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">เลือกไอเทม</label>
                <div className="flex gap-2">
                  <select
                    value={formItemId}
                    onChange={(e) => {
                      setFormItemId(e.target.value);
                      setShowDeviationWarning(false);
                    }}
                    disabled={!!editingPrice}
                    className="flex-1 bg-black/50 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-game-red disabled:opacity-50"
                  >
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                  {!editingPrice && (
                    <Button
                      type="button"
                      onClick={handleCopyLatest}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs px-3 py-1 flex items-center gap-1"
                      title="คัดลอกข้อมูลราคาล่าสุดเพื่อแก้ไขด่วน"
                    >
                      <Copy className="w-3.5 h-3.5" /> คัดลอกข้อมูลล่าสุด
                    </Button>
                  )}
                </div>
              </div>

              {/* Wholesale/Bulk settings panel */}
              <div className="flex flex-col gap-3 p-3 bg-black/40 border border-zinc-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isBulk"
                    checked={formIsBulk}
                    onChange={(e) => {
                      setFormIsBulk(e.target.checked);
                      if (!e.target.checked) setFormUnitQuantity("1");
                    }}
                    className="accent-game-red w-4 h-4"
                  />
                  <label htmlFor="isBulk" className="font-gaming text-xs font-semibold text-zinc-350 cursor-pointer select-none">
                    เป็นเรทแบบเหมา
                  </label>
                </div>

                {formIsBulk && (
                  <div className="flex flex-col gap-1.5 border-t border-zinc-900/60 pt-2.5">
                    <label className="font-gaming text-[10px] text-zinc-400 uppercase font-semibold">จำนวนไอเทม</label>
                    <Input
                      type="number"
                      value={formUnitQuantity}
                      onChange={(e) => setFormUnitQuantity(e.target.value)}
                      placeholder="เช่น 50, 100, 500"
                      required
                      min="1"
                      className="bg-black/50 border-zinc-800 text-xs focus:border-game-red text-center font-mono"
                    />
                    {formAvgPrice && Number(formUnitQuantity) > 0 && (
                      <span className="text-[10px] text-emerald-400 font-mono italic">
                        💡 ตก{items.find(i => i.id === formItemId)?.category?.unit?.name || "ชิ้น"}ละ: {(Number(formAvgPrice) / Number(formUnitQuantity)).toLocaleString(undefined, { maximumFractionDigits: 2 })} บาท
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Calculator Helper */}
              <div className="flex flex-col gap-1.5 p-3.5 bg-blue-950/10 border border-blue-900/30 rounded-lg">
                <label className="font-gaming text-[10px] text-blue-400 uppercase font-semibold">
                  เครื่องมือช่วยคำนวณราคาด่วน (ป้อนราคาเดี่ยว หรือหลายราคาคั่นด้วยจุลภาค)
                </label>
                <Input
                  type="text"
                  placeholder="ตัวอย่าง: 100 หรือ 90, 100, 110"
                  onChange={(e) => {
                    const val = e.target.value;
                    const parsed = val.split(/[,\s]+/)
                      .map(n => n.trim())
                      .filter(n => n !== "" && !isNaN(Number(n)))
                      .map(Number);
                    
                    if (parsed.length > 0) {
                      const min = Math.min(...parsed);
                      const max = Math.max(...parsed);
                      const sum = parsed.reduce((a, b) => a + b, 0);
                      const avg = Math.round(sum / parsed.length);
                      
                      setFormLowPrice(String(min));
                      setFormHighPrice(String(max));
                      setFormAvgPrice(String(avg));
                      setShowDeviationWarning(false);
                    }
                  }}
                  className="bg-black/50 border-zinc-800 text-xs focus:border-blue-500 font-mono"
                />
                <span className="text-[9px] text-zinc-550 leading-normal">
                  * ป้อนราคาเดี่ยวเพื่อกำหนดราคาเดียวทั้งหมด หรือป้อนหลายราคาคั่นด้วยคอมมา/เว้นวรรคเพื่อระบบหา ต่ำสุด/เฉลี่ย/สูงสุด ให้อัตโนมัติ
                </span>
              </div>

              {/* Prices Inputs low / avg / high */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">ราคาต่ำสุด</label>
                  <Input
                    type="number"
                    value={formLowPrice}
                    onChange={(e) => {
                      setFormLowPrice(e.target.value);
                      setShowDeviationWarning(false);
                    }}
                    placeholder="บาท"
                    required
                    min="0"
                    className="bg-black/50 border-zinc-800 text-xs text-center font-mono text-red-400 focus:border-game-red"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">ราคาซื้อขาย</label>
                  <Input
                    type="number"
                    value={formAvgPrice}
                    onChange={(e) => {
                      setFormAvgPrice(e.target.value);
                      setShowDeviationWarning(false);
                    }}
                    placeholder="บาท"
                    required
                    min="0"
                    className="bg-black/50 border-zinc-800 text-xs text-center font-mono text-game-green font-extrabold focus:border-game-red"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">ราคาสูงสุด</label>
                  <Input
                    type="number"
                    value={formHighPrice}
                    onChange={(e) => {
                      setFormHighPrice(e.target.value);
                      setShowDeviationWarning(false);
                    }}
                    placeholder="บาท"
                    required
                    min="0"
                    className="bg-black/50 border-zinc-800 text-xs text-center font-mono text-blue-400 focus:border-game-red"
                  />
                </div>
              </div>

              {/* Source ( FB group / discord / etc) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">แหล่งอ้างอิงราคา</label>
                <Input
                  type="text"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="เช่น กลุ่ม Facebook ซื้อขายอย่างเป็นทางการ, Discord แอดมิน"
                  required
                  className="bg-black/50 border-zinc-800 text-xs focus:border-game-red"
                />
              </div>

              {/* Recorded At Datetime (Allows Backdating) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">วันเวลาที่เก็บข้อมูล</label>
                <Input
                  type="datetime-local"
                  value={formRecordedAt}
                  onChange={(e) => setFormRecordedAt(e.target.value)}
                  required
                  className="bg-black/50 border-zinc-800 text-xs text-zinc-300 focus:border-game-red"
                />
              </div>

              {/* Note / Memo */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">โน้ตเพิ่มเติม</label>
                <Input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="เช่น ของเริ่มขาดตลาดชั่วคราว, จัดเซ็ตราคาเหมา"
                  className="bg-black/50 border-zinc-800 text-xs focus:border-game-red"
                />
              </div>

              {/* Actions Button panel */}
              <div className="flex gap-3 justify-end mt-2">
                <Button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-game-red hover:bg-game-red-hover border border-red-600 font-gaming text-xs font-bold text-white flex items-center gap-1.5"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  บันทึกข้อมูล
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-950 border border-red-950/60 shadow-2xl rounded-lg p-6 relative text-center flex flex-col gap-4 animate-[pulse-glow-red_3s_infinite]">
            <div className="flex justify-center text-red-500">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <div>
              <h3 className="font-gaming font-extrabold text-lg text-white">CONFIRM DELETION</h3>
              <p className="text-xs text-zinc-400 mt-2">
                คุณแน่ใจหรือไม่ว่าต้องการลบประวัติราคานี้ออก? การกระทำนี้ไม่สามารถกู้คืนข้อมูลราคาได้อีกในอนาคต
              </p>
            </div>
            <div className="flex gap-3 justify-center mt-2">
              <Button
                onClick={() => setDeleteConfirmId(null)}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-500 border border-red-500 text-xs font-bold text-white flex items-center gap-1.5"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ยืนยันการลบ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-game-red" />
        <span className="font-gaming text-sm font-semibold">กำลังโหลดหน้าจัดการราคา...</span>
      </div>
    }>
      <PricesContent />
    </Suspense>
  );
}
