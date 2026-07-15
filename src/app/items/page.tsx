"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useItems, Item } from "@/components/providers/items-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Grid,
  List,
  Loader2,
  AlertTriangle,
  X,
  Image as ImageIcon
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
}

export default function ItemsPage() {
  const {
    items,
    isLoading,
    error,
    page,
    limit,
    search,
    category,
    totalPages,
    totalItems,
    setPage,
    setSearch,
    setCategory,
    createItem,
    updateItem,
    deleteItem
  } = useItems();

  // Local Categories List from DB
  const [categoriesList, setCategoriesList] = useState<CategoryOption[]>([]);

  // Fetch all categories to populate dynamic dropdowns and filters
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then((data) => setCategoriesList(data))
      .catch((err) => console.error("Error loading categories:", err));
  }, []);

  // Local Search Input with Debounce to prevent server flooding
  const [searchTerm, setSearchTerm] = useState(search);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchTerm.trim());
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [searchTerm, setSearch]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Form Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName("");
    setFormCategoryId(categoriesList[0]?.id || "");
    setFormImageUrl("");
    setFormError(null);
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategoryId(item.category?.id || "");
    setFormImageUrl(item.image_url);
    setFormError(null);
    setModalOpen(true);
  };

  // Submit Form (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("กรุณาระบุชื่อไอเทม");
      return;
    }
    if (!formCategoryId) {
      setFormError("กรุณาเลือกหมวดหมู่ไอเทม");
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (editingItem) {
        // Update
        await updateItem({
          id: editingItem.id,
          name: formName.trim(),
          categoryId: formCategoryId,
          image_url: formImageUrl.trim(),
        });
        toast.success("บันทึกการแก้ไขไอเทมสำเร็จ!");
      } else {
        // Create
        await createItem({
          name: formName.trim(),
          categoryId: formCategoryId,
          image_url: formImageUrl.trim(),
        });
        toast.success("เพิ่มไอเทมใหม่เรียบร้อยแล้ว!");
      }
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setFormLoading(false);
    }
  };

  // Execute Delete
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      await deleteItem(id);
      setDeleteConfirmId(null);
      toast.success("ลบไอเทมเสร็จสิ้น!");
    } catch (err: any) {
      // toast error handled centrally
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left w-full max-w-full overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-4">
        <div>
          <h2 className="font-gaming font-extrabold text-2xl tracking-wide flex items-center gap-2">
            <Package className="w-6 h-6 text-game-red" />
            ITEM REGISTRY DATABASE
          </h2>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-game-red hover:bg-game-red-hover border border-red-600 font-gaming text-xs font-bold px-4 py-2"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          เพิ่มไอเทมใหม่
        </Button>
      </div>

      {/* Search and Filters Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-950/70 border border-zinc-900/60 p-4 rounded-lg backdrop-blur-sm">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            placeholder="ค้นหาไอเทมด้วยชื่อ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border-zinc-800/80 text-xs focus:border-game-red h-9"
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>

        {/* Dynamic Categories Filters */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setCategory("all")}
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
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded text-[11px] font-semibold border transition-all ${category === cat.id
                  ? "bg-game-red border-game-red text-white"
                  : "bg-black/30 border-zinc-800/60 text-zinc-400 hover:text-white hover:border-game-red"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 sm:block hidden" />

          {/* Grid/List View switcher */}
          <div className="flex border border-zinc-800/80 rounded bg-black/30 p-0.5 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-all ${viewMode === "grid" ? "bg-game-red text-white" : "text-zinc-500 hover:text-white"}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-all ${viewMode === "list" ? "bg-game-red text-white" : "text-zinc-500 hover:text-white"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Items Listing Grid/List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-game-red" />
          <span className="font-gaming text-sm">กำลังโหลดข้อมูลไอเทมจาก Supabase...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-400 bg-red-950/10 border border-red-900/20 rounded-lg">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <span className="font-gaming text-sm font-semibold">{error}</span>
          <Button onClick={() => window.location.reload()} size="sm" className="bg-zinc-900 hover:bg-game-red">ลองอีกครั้ง</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 bg-neutral-950/20 border border-dashed border-zinc-900 rounded-lg">
          <Package className="w-10 h-10 text-zinc-700" />
          <span className="font-gaming text-sm mt-3">ไม่พบรายการไอเทมในระบบ</span>
        </div>
      ) : viewMode === "grid" ? (
        /* Inventory Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="group relative bg-gradient-to-b from-neutral-900 to-neutral-950/90 border border-zinc-800/80 rounded-lg overflow-hidden shadow-lg hover:border-game-red hover:shadow-[0_0_15px_rgba(198,40,40,0.15)] transition-all duration-300 flex flex-col justify-between"
            >
              {/* Item Image Slot */}
              <div className="relative aspect-video w-full bg-black/80 flex items-center justify-center overflow-hidden border-b border-zinc-900">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 256px"
                    className="object-contain p-1 group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-700" />
                )}
                {/* Category name tag from Category entity relation */}
                <span className="absolute top-2 left-2 px-2 py-0.5 text-[9px] uppercase font-bold rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                  {item.category?.name || "ไม่ระบุหมวดหมู่"}
                </span>
                {/* Dynamic Row Numbering (Index Tag) */}
                <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-zinc-950/80 border border-zinc-800 text-zinc-400">
                  #{(page - 1) * limit + idx + 1}
                </span>
              </div>

              {/* Item Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-left">
                <div>
                  <h4 className="font-gaming font-bold text-sm text-zinc-100 tracking-wide line-clamp-1">{item.name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1.5">
                    <Calendar className="w-3 h-3 text-zinc-600" />
                    <span>ลงทะเบียน: {new Date(item.created_at).toLocaleDateString("th-TH")}</span>
                  </div>
                </div>

                {/* Edit & Delete Action Panel */}
                <div className="flex items-center gap-2 border-t border-zinc-900/60 pt-3">
                  <Button
                    onClick={() => handleOpenEdit(item)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-[11px] h-7 rounded border border-zinc-800 transition-all font-gaming"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    EDIT
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="bg-zinc-900 hover:bg-game-red hover:text-white hover:border-game-red text-red-500 border border-zinc-800 h-7 w-8 rounded flex items-center justify-center p-0"
                    title="ลบไอเทม"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card className="bg-neutral-950/80 border-zinc-800/80 text-white shadow-lg backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-zinc-500 uppercase font-semibold bg-neutral-900/40 border-b border-zinc-900/40">
                <tr>
                  <th className="px-6 py-4 w-12">#</th>
                  <th className="px-6 py-4">รูป</th>
                  <th className="px-6 py-4">ชื่อไอเทม</th>
                  <th className="px-6 py-4">หมวดหมู่</th>
                  <th className="px-6 py-4">เวลาที่สร้าง</th>
                  <th className="px-6 py-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40 font-medium">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-[11px] text-zinc-500 font-bold">{(page - 1) * limit + idx + 1}</td>
                    <td className="px-6 py-2">
                      <div className="w-16 h-12 rounded bg-black/60 border border-zinc-800 flex items-center justify-center overflow-hidden p-1 relative">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.name} fill sizes="64px" className="object-contain p-1" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-zinc-700" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-gaming text-zinc-100 font-bold tracking-wide">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-[10px] uppercase font-bold rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {item.category?.name || "ไม่ระบุหมวดหมู่"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400">
                      {new Date(item.created_at).toLocaleString("th-TH")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          onClick={() => handleOpenEdit(item)}
                          className="bg-zinc-900 hover:bg-zinc-800 text-[11px] h-7 rounded border border-zinc-800 px-3 font-gaming"
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> EDIT
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirmId(item.id)}
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
      )}

      {/* Reusable Global Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={limit}
      />

      {/* Spacer to separate pagination from footer */}
      <div className="h-10 md:h-16 w-full shrink-0" />

      {/* FORM MODAL DIALOG (Add / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-950 border border-zinc-800 shadow-2xl rounded-lg overflow-hidden animate-[pulse-glow-red_4s_infinite] relative">
            {/* Header border */}
            <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-game-red to-transparent" />

            {/* Header */}
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center text-left">
              <h3 className="font-gaming font-extrabold text-md tracking-wider uppercase text-white">
                {editingItem ? "แก้ไขไอเทม" : "เพิ่มไอเทมใหม่"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-left">
              {formError && (
                <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/40 p-2.5 rounded">
                  ⚠️ {formError}
                </div>
              )}

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">ชื่อไอเทม</label>
                <Input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="กรอกชื่อไอเทม เช่น AWP, Riot Armor"
                  required
                  className="bg-black/50 border-zinc-800 text-sm focus:border-game-red"
                />
              </div>

              {/* Category selector dynamically rendering database categories */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">หมวดหมู่</label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-game-red"
                >
                  <option value="" disabled>-- เลือกหมวดหมู่ไอเทม --</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Image URL */}
              <div className="flex flex-col gap-1.5">
                <label className="font-gaming text-[11px] text-zinc-400 uppercase font-semibold">ลิงก์รูปภาพ</label>
                <Input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="กรอกลิงก์รูปภาพไอเทม"
                  className="bg-black/50 border-zinc-800 text-sm focus:border-game-red"
                />
              </div>

              {/* Image Preview */}
              {formImageUrl.trim() && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-gaming text-[10px] text-zinc-500 uppercase font-semibold">Image Preview</span>
                  <div className="w-full h-32 rounded bg-black/60 border border-zinc-900 flex items-center justify-center p-2 overflow-hidden relative">
                    <Image
                      src={formImageUrl}
                      alt="Preview"
                      fill
                      unoptimized
                      sizes="112px"
                      className="object-contain p-2"
                      onError={(e) => { (e.target as HTMLImageElement).src = "" }}
                    />
                  </div>
                </div>
              )}

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
              <h3 className="font-gaming font-extrabold text-lg text-white">ยืนยันการลบไอเทม</h3>
              <p className="text-xs text-zinc-400 mt-2">
                คุณแน่ใจหรือไม่ว่าต้องการลบไอเทมชิ้นนี้ออกจากเซิร์ฟเวอร์? การลบข้อมูลนี้จะเป็นการลบอย่างถาวรและไม่สามารถกู้คืนได้
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
