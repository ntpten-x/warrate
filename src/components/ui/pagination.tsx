"use client";

import React from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  // Return null if there are no pages or just one page
  if (totalPages <= 1) {
    if (totalItems !== undefined && totalItems > 0) {
      return (
        <div className="flex justify-between items-center text-xs text-zinc-500 font-sans px-4 py-3 select-none">
          <span>แสดงทั้งหมด {totalItems} รายการ</span>
        </div>
      );
    }
    return null;
  }

  // Ellipsis pages calculator
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // page offset around current page
    const left = currentPage - delta;
    const right = currentPage + delta;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  // Range info calculation e.g. "Showing 1-8 of 15 items"
  const showRangeInfo = totalItems !== undefined && pageSize !== undefined;
  const startItem = showRangeInfo ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = showRangeInfo ? Math.min(totalItems || 0, currentPage * pageSize) : 0;

  return (
    <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 bg-neutral-950/40 border-t border-zinc-900/60 p-4 select-none">
      {/* Dynamic Range entries */}
      {showRangeInfo ? (
        <div className="text-xs text-zinc-500 font-sans">
          แสดงข้อมูลรายการที่ <span className="text-zinc-300 font-bold">{startItem}</span> ถึง <span className="text-zinc-300 font-bold">{endItem}</span> จากทั้งหมด <span className="text-zinc-300 font-bold">{totalItems}</span> รายการ
        </div>
      ) : (
        <div className="text-xs text-zinc-500 font-sans" />
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* First Page */}
        <Button
          size="icon"
          variant="outline"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 bg-black/40 border-zinc-800/80 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:border-game-red transition-all"
          title="หน้าแรก"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Previous Page */}
        <Button
          size="icon"
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 bg-black/40 border-zinc-800/80 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:border-game-red transition-all"
          title="หน้าก่อนหน้า"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page Buttons */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-zinc-500 font-mono">
                ...
              </span>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === currentPage;

          return (
            <Button
              key={`page-${pageNum}`}
              onClick={() => onPageChange(pageNum)}
              variant={isActive ? "default" : "outline"}
              className={`w-8 h-8 text-xs font-mono font-bold transition-all border ${
                isActive
                  ? "bg-game-red hover:bg-game-red border-game-red text-white shadow-[0_0_10px_rgba(198,40,40,0.25)]"
                  : "bg-black/30 border-zinc-800/60 text-zinc-400 hover:text-white hover:border-game-red"
              }`}
            >
              {pageNum}
            </Button>
          );
        })}

        {/* Next Page */}
        <Button
          size="icon"
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 bg-black/40 border-zinc-800/80 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:border-game-red transition-all"
          title="หน้าถัดไป"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Last Page */}
        <Button
          size="icon"
          variant="outline"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 bg-black/40 border-zinc-800/80 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:border-game-red transition-all"
          title="หน้าสุดท้าย"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
