"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { parseClientError } from "@/lib/error";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";
import {
  FolderKanban,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  X
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
  order_index: number;
  created_at: string;
  unit?: {
    id: string;
    name: string;
  } | null;
}

// Dynamic icon renderer helper mapping lucide icons dynamically
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as any)[name] || Icons.Folder;
  return <IconComponent className={className} />;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formIconName, setFormIconName] = useState("Folder");
  const [formOrderIndex, setFormOrderIndex] = useState("0");
  const [formUnitId, setFormUnitId] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Available lucide icon options gallery
  const iconOptions = [
    { name: "Flame", label: "Flame (พลัง/ไฟ)" },
    { name: "Shield", label: "Shield (เกราะ/ป้องกัน)" },
    { name: "Heart", label: "Heart (เลือด/แพทย์)" },
    { name: "Crosshair", label: "Crosshair (เป้าเล็ง/ปืน)" },
    { name: "Bomb", label: "Bomb (ระเบิด)" },
    { name: "Skull", label: "Skull (อันตราย/ไอเทมหัวกะโหลก)" },
    { name: "Award", label: "Award (เกียรติยศ)" },
    { name: "Compass", label: "Compass (สำรวจ)" },
    { name: "Activity", label: "Activity (พลังงาน)" },
    { name: "Boxes", label: "Boxes (กล่อง/สัมภาระ)" },
    { name: "Layers", label: "Layers (คลังชั้น)" },
    { name: "Settings", label: "Settings (ตั้งค่า/อะไหล่)" },
    { name: "Folder", label: "Folder (เริ่มต้น)" }
  ];

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/categories");
      if (!res.ok) {
        throw res;
      }
      const data = await res.json();
      setCategories(data);
    } catch (err: any) {
      console.error("Fetch Categories Error:", err);
      const msg = await parseClientError(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch("/api/units");
      if (res.ok) {
        const data = await res.json();
        setUnits(data || []);
      }
    } catch (err) {
      console.error("Error loading units:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchUnits();
  }, []);

  // Form modal triggers
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName("");
    setFormSlug("");
    setFormIconName("Folder");
    setFormOrderIndex("0");
    setFormUnitId("");
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormIconName(cat.icon_name || "Folder");
    setFormOrderIndex(String(cat.order_index));
    setFormUnitId(cat.unit?.id || "");
    setFormError(null);
    setModalOpen(true);
  };

  // Submit Handler (Create/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      setFormError("กรุณาระบุชื่อและสลักหมวดหมู่ให้ครบถ้วน");
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      if (editingCategory) {
        // Update Category
        const res = await fetch("/api/categories", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            id: editingCategory.id,
            name: formName.trim(),
            slug: formSlug.trim().toLowerCase(),
            icon_name: formIconName,
            order_index: Number(formOrderIndex) || 0,
            unitId: formUnitId || null,
          }),
        });

        if (!res.ok) {
          throw res;
        }

        toast.success("อัปเดตข้อมูลหมวดหมู่สำเร็จ!");
      } else {
        // Create Category
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formName.trim(),
            slug: formSlug.trim().toLowerCase(),
            icon_name: formIconName,
            order_index: Number(formOrderIndex) || 0,
            unitId: formUnitId || null,
          }),
        });

        if (!res.ok) {
          throw res;
        }

        toast.success("เพิ่มหมวดหมู่ใหม่สำเร็จ!");
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      const msg = await parseClientError(err);
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete category handler
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw res;
      }

      toast.success("ลบหมวดหมู่เรียบร้อยแล้ว!");
      setDeleteConfirmId(null);
      fetchCategories();
    } catch (err: any) {
      const msg = await parseClientError(err);
      toast.error("ลบหมวดหมู่ล้มเหลว", { description: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered categories computed locally
  const filteredCategories = categories.filter((cat) => {
    const term = searchTerm.toLowerCase();
    return (
      cat.name.toLowerCase().includes(term) ||
      cat.slug.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6 text-left w-full max-w-full overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-4">
        <div>
          <h2 className="font-gaming font-extrabold text-2xl tracking-wide flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-game-red animate-pulse" />
            GAME CATEGORY REGISTRY
          </h2>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-game-red hover:bg-game-red-hover border border-red-600 font-gaming text-xs font-bold px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          เพิ่มหมวดหมู่ใหม่
        </Button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex justify-between items-center gap-4 bg-neutral-950/70 border border-zinc-900/60 p-4 rounded-lg backdrop-blur-sm">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            placeholder="ค้นหาหมวดหมู่ด้วยชื่อหรือสลัก..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border-zinc-800/80 text-xs focus:border-game-red h-9"
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          ทั้งหมด: {filteredCategories.length} หมวดหมู่
        </div>
      </div>

      {/* Categories CRUD Table listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-game-red" />
          <span className="font-gaming text-sm">กำลังดึงข้อมูลหมวดหมู่จาก Supabase...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-400 bg-red-950/10 border border-red-900/20 rounded-lg">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <span className="font-gaming text-sm font-semibold">{error}</span>
          <Button onClick={fetchCategories} size="sm" className="bg-zinc-900 hover:bg-game-red">ลองอีกครั้ง</Button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 bg-neutral-950/20 border border-dashed border-zinc-900 rounded-lg">
          <FolderKanban className="w-10 h-10 text-zinc-700" />
          <span className="font-gaming text-sm mt-3">ไม่พบรายการหมวดหมู่ในระบบ</span>
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
                    <th className="px-6 py-4 w-16 text-center">ไอคอน</th>
                    <th className="px-6 py-4">ชื่อหมวดหมู่</th>
                    <th className="px-6 py-4">Slug</th>
                    <th className="px-6 py-4">หน่วยนับ</th>
                    <th className="px-6 py-4">ชื่อไอคอน</th>
                    <th className="px-6 py-4 text-center">ลำดับ</th>
                    <th className="px-6 py-4 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 font-medium">
                  {filteredCategories.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-500 font-bold">{idx + 1}</td>
                      <td className="px-6 py-2 text-center">
                        <div className="w-10 h-10 rounded bg-black/60 border border-zinc-800/80 flex items-center justify-center text-game-red shadow-[inset_0_0_10px_rgba(198,40,40,0.1)]">
                          <DynamicIcon name={cat.icon_name} className="w-5 h-5 text-game-red" />
                        </div>
                      </td>
                      <td className="px-6 py-4 font-gaming text-zinc-100 font-bold tracking-wide">{cat.name}</td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-900 border border-zinc-800 text-game-green">
                          {cat.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-amber-400 font-mono font-semibold">
                          {cat.unit?.name || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-900/60 border border-zinc-800/40 text-zinc-400">
                          {cat.icon_name || "Folder"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs text-zinc-300">
                        {cat.order_index}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => handleOpenEdit(cat)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-[11px] h-7 rounded border border-zinc-800 px-3 font-gaming"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> EDIT
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirmId(cat.id)}
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
            {filteredCategories.map((cat, idx) => (
              <div
                key={cat.id}
                className="w-full bg-neutral-950/70 border border-zinc-900/60 p-4 rounded-lg flex flex-col gap-3"
              >
                {/* Top section: Icon and Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-black/60 border border-zinc-800/80 flex items-center justify-center text-game-red shrink-0 shadow-[inset_0_0_10px_rgba(198,40,40,0.1)]">
                    <DynamicIcon name={cat.icon_name} className="w-5 h-5 text-game-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-gaming text-zinc-100 font-extrabold text-sm tracking-wide block truncate">
                      {cat.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 block truncate">
                      slug: {cat.slug}
                    </span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-500 font-bold shrink-0">
                    {idx + 1}
                  </div>
                </div>

                {/* Middle details: unit & icon class & order */}
                <div className="grid grid-cols-3 gap-2 border-t border-zinc-900/60 pt-2.5 text-center text-xs">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold truncate">หน่วยนับ</span>
                    <span className="text-zinc-300 font-medium text-xs truncate">
                      {cat.unit?.name || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold truncate">ชื่อไอคอน</span>
                    <span className="text-zinc-300 font-mono text-[10px] truncate">
                      {cat.icon_name || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold truncate">ลำดับ</span>
                    <span className="text-zinc-300 font-mono text-xs truncate">
                      {cat.order_index}
                    </span>
                  </div>
                </div>

                {/* Actions panel */}
                <div className="flex gap-2 border-t border-zinc-900/60 pt-2.5">
                  <Button
                    onClick={() => handleOpenEdit(cat)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-[11px] h-7 rounded border border-zinc-800 font-gaming"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    แก้ไข
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirmId(cat.id)}
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

      {/* Spacer to separate content from footer */}
      <div className="h-10 md:h-16 w-full shrink-0" />

      {/* FORM MODAL DIALOG (Add / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-950 border border-zinc-800 shadow-2xl rounded-lg overflow-hidden animate-[pulse-glow-red_4s_infinite] relative">
            {/* Header glow border */}
            <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-game-red to-transparent" />

            {/* Header */}
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center text-left">
              <h3 className="font-gaming font-extrabold text-md tracking-wider uppercase text-white">
                {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-left">
              {formError && (
                <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/40 p-2.5 rounded">
                  ⚠️ {formError}
                </div>
              )}

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">ชื่อหมวดหมู่</label>
                <Input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="กรอกชื่อหมวดหมู่ เช่น ปืนกลเบา, เกราะหนัก"
                  required
                  className="bg-black/50 border-zinc-800 text-sm focus:border-game-red"
                />
              </div>

              {/* Slug */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">Slug (สลักระบุหมวดหมู่)</label>
                <Input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="กรอกสลักภาษาอังกฤษ เช่น smg, heavy-armor"
                  required
                  className="bg-black/50 border-zinc-800 text-sm focus:border-game-red"
                />
              </div>

              {/* Lucide Icon Option Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">ไอคอนหมวดหมู่</label>
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded bg-black/60 border border-zinc-800 flex items-center justify-center text-game-red shrink-0">
                    <DynamicIcon name={formIconName} className="w-5 h-5" />
                  </div>
                  <select
                    value={formIconName}
                    onChange={(e) => setFormIconName(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-game-red"
                  >
                    {iconOptions.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit Dropdown Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">หน่วยนับ</label>
                <select
                  value={formUnitId}
                  onChange={(e) => setFormUnitId(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-game-red"
                >
                  <option value="">-- ไม่ระบุหน่วยนับ --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Index */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">ลำดับการเรียง</label>
                <Input
                  type="number"
                  value={formOrderIndex}
                  onChange={(e) => setFormOrderIndex(e.target.value)}
                  placeholder="เช่น 1, 2, 3"
                  min="0"
                  className="bg-black/50 border-zinc-800 text-sm focus:border-game-red"
                />
              </div>

              {/* Buttons */}
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
              <h3 className="font-gaming font-extrabold text-lg text-white">ยืนยันการลบ</h3>
              <p className="text-xs text-zinc-400 mt-2">
                คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้ออก? การลบข้อมูลนี้จะเป็นการลบอย่างถาวรและไม่สามารถกู้คืนได้
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
