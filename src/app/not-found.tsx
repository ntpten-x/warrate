"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div 
      className="relative min-h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center text-white p-6 font-sans select-none rounded-lg overflow-hidden border border-zinc-900/60 bg-neutral-950/40 backdrop-blur-sm"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.99) 100%), url('/zombie-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Scanline atmospheric overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-1 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />

      <div className="w-full max-w-md bg-black/90 border border-red-950/60 shadow-[0_0_30px_rgba(198,40,40,0.15)] rounded-lg p-8 relative z-10 flex flex-col items-center gap-6 text-center animate-[pulse-glow-red_4s_infinite]">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-red-600/80 to-transparent absolute top-0 left-0" />

        {/* Warning Icon with pulse */}
        <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-900/40 flex items-center justify-center text-red-500 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Text descriptions */}
        <div className="flex flex-col gap-2">
          <h1 className="font-gaming font-extrabold text-4xl tracking-widest text-red-600">404 ERROR</h1>
          <h3 className="font-gaming font-bold text-sm text-zinc-200 tracking-wider uppercase mt-1">OUT OF SECTOR BOUNDS</h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-sm mt-2">
            คุณได้พยายามเชื่อมต่อไปยังพิกัดนอกขอบเขตความปลอดภัยของเซิร์ฟเวอร์ พื้นที่นี้มีค่ากัมมันตภาพรังสีสูง หรืออาจจะยังไม่พร้อมเปิดให้บริการในขณะนี้
          </p>
        </div>

        <div className="w-full h-[1px] bg-zinc-900/60" />

        {/* Diagnostic log info */}
        <div className="w-full font-mono text-[9px] text-zinc-500 bg-neutral-950/60 rounded p-2 text-left border border-zinc-900/40">
          <div>SYSTEM_STATUS: ERROR_SECTOR_NOT_FOUND</div>
          <div>COORDINATE_LOG: 0xDEADBEEF::404</div>
          <div>SECTOR: [RESTRICTED_RADIOACTIVE_ZONE]</div>
        </div>

        {/* Recover Controls */}
        <div className="w-full flex flex-col sm:flex-row gap-3 justify-center mt-2">
          <Link 
            href="/"
            className="w-full sm:w-auto bg-game-red hover:bg-game-red-hover text-white border border-red-600 font-gaming text-xs font-bold px-5 h-9 flex items-center justify-center gap-1.5 transition-all rounded-md"
          >
            <Home className="w-3.5 h-3.5" />
            กลับโซนปลอดภัย
          </Link>
          <Button 
            onClick={handleReload}
            className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs px-5 h-9 flex items-center justify-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            รีสตาร์ทสัญญาณ
          </Button>
        </div>
      </div>
    </div>
  );
}
