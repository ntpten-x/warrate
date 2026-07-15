"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated, bounce to dashboard
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("กรุณาระบุอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }

    setAuthLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await signIn(email.trim(), password.trim());
      if (error) {
        throw error;
      }
      toast.success("เข้าสู่ระบบเรียบร้อย!", {
        description: "กำลังยินดีต้อนรับผู้รอดชีวิตเข้าสู่พื้นที่ควบคุม...",
      });
      router.replace("/");
    } catch (err: any) {
      console.error("Authentication failed:", err);
      const message = err.message === "Invalid login credentials"
        ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"
        : err.message || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์";
      setErrorMsg(message);
      toast.error("เข้าสู่ระบบล้มเหลว", { description: message });
    } finally {
      setAuthLoading(false);
    }
  };



  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 bg-black relative select-none font-sans overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.99) 100%), url('/zombie-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Scanline noise effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-1 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />

      <div className="w-full max-w-md bg-black/90 border border-zinc-800/80 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(198,40,40,0.15)] relative z-10 p-6 md:p-8 animate-[pulse-glow-red_5s_infinite]">
        {/* Glow Header bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-game-red to-transparent absolute top-0 left-0" />

        {/* Brand Banner */}
        <div className="flex flex-col items-center gap-2.5 mb-8 text-center">
          <div className="w-16 h-16 flex items-center justify-center animate-pulse relative">
            <Image src="/brand-logo.png" alt="WAR RATE" fill sizes="64px" className="object-contain" />
          </div>
          <div>
            <h2 className="font-gaming font-extrabold text-lg tracking-widest text-zinc-100">
              WAR RATE
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">
              Authenticator Launcher
            </p>
          </div>
        </div>



        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/40 p-3 rounded">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-gaming text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <Mail className="w-3 h-3" />
              EMAIL
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@survivor-net.com"
              required
              disabled={authLoading}
              className="bg-black/50 border-zinc-800 text-sm focus:border-game-red h-10"
            />
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-gaming text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
              <Key className="w-3 h-3" />
              ACCESS PASSWORD
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••••••"
              required
              disabled={authLoading}
              className="bg-black/50 border-zinc-800 text-sm focus:border-game-red h-10"
            />
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={authLoading}
            className="w-full bg-game-red hover:bg-game-red-hover border border-red-600 font-gaming text-xs font-bold text-white flex items-center justify-center gap-1.5 h-10 mt-2 shadow-[0_0_15px_rgba(198,40,40,0.2)] hover:shadow-[0_0_20px_rgba(198,40,40,0.3)] transition-all"
          >
            {authLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                VERIFYING CODES...
              </>
            ) : (
              <>
                SIGN-IN
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Decorative footer details */}
      <div className="absolute bottom-6 w-full text-center px-4 font-gaming text-[9px] text-zinc-600 tracking-widest uppercase select-none pointer-events-none">
        launcher terminal system status // online
      </div>
    </div>
  );
}
