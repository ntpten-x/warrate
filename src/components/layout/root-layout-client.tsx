"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Toaster, toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-context";
import {
  Home,
  LogOut,
  User,
  Menu,
  Package,
  Loader2,
  FolderKanban,
  TrendingUp,
  Tag,
  Gamepad2,
  ChevronDown,
  Globe,
  Mail,
  Eye
} from "lucide-react";

export function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [playDropdownOpen, setPlayDropdownOpen] = useState(false);
  const [pageviews, setPageviews] = useState<number | null>(null);
  const [showPageviewsText, setShowPageviewsText] = useState(false);

  // Fetch page views
  useEffect(() => {
    async function fetchPageviews() {
      try {
        const res = await fetch("/api/pageviews");
        if (res.ok) {
          const data = await res.json();
          setPageviews(data.pageviews);
        }
      } catch (err) {
        console.error("Failed to fetch page views:", err);
      }
    }
    fetchPageviews();
  }, []);

  // Redirect to login if user is not authenticated and trying to access private routes
  useEffect(() => {
    // Guest users can only see the dashboard home page ("/") and the login page ("/login")
    if (!loading && !user && pathname !== "/" && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  const menuItems = [
    { id: "dashboard", label: "Overview", icon: Home, href: "/" },
    { id: "items", label: "Manage Items", icon: Package, href: "/items" },
    { id: "categories", label: "Manage Categories", icon: FolderKanban, href: "/categories" },
    { id: "units", label: "Manage Units", icon: Tag, href: "/units" },
    { id: "prices", label: "Manage Prices", icon: TrendingUp, href: "/prices" },
  ];

  // 1. Session Loading Splash Screen
  if (loading) {
    return (
      <div
        className="min-h-screen w-screen bg-black flex flex-col items-center justify-center text-white font-sans"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.99) 100%), url('/zombie-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="flex flex-col items-center gap-4 animate-[pulse-glow-red_3s_infinite]">
          <Loader2 className="w-10 h-10 text-game-red animate-spin" />
          <div className="font-gaming font-extrabold text-sm tracking-widest text-zinc-300 uppercase">
            Loading security credentials...
          </div>
        </div>
      </div>
    );
  }

  // 2. Guest Login Screen Container (No Header or Sidebar)
  if (pathname === "/login") {
    return (
      <>
        {children}
        <Toaster theme="dark" closeButton richColors position="top-right" />
      </>
    );
  }

  // 3. Guest Redirection Spinner for other private routes (Prevents content flash)
  if (!user && pathname !== "/" && pathname !== "/login") {
    return (
      <div className="min-h-screen w-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-game-red" />
        <span className="font-gaming text-xs tracking-wider mt-3">REDIRECTING TO SECURITY GATE...</span>
      </div>
    );
  }

  // 4. Main Layout Shell (Conditional Sidebar rendering based on auth)
  return (
    <div
      className="relative min-h-screen w-full flex flex-col overflow-hidden text-white font-sans bg-game-dark-900"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.98) 100%), url('/zombie-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Scanline overlay for horror atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 z-1"
        style={{
          background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))",
          backgroundSize: "100% 4px, 6px 100%"
        }}
      />

      {/* HEADER */}
      <header className="h-16 border-b border-zinc-800/80 bg-neutral-950/80 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0">
        {/* Brand Logo & Sidebar Toggle */}
        <div className="flex items-center gap-4">
          {user && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-all md:block hidden"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Dashboard Title */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 relative shrink-0">
              <Image src="/brand-logo.png" alt="WAR Rate" fill sizes="32px" className="object-contain animate-pulse" />
            </div>
            <h1 className="font-gaming font-extrabold text-md tracking-wider">
              WAR Rate
              {/* <span className="text-game-red text-[11px] font-sans font-bold bg-red-950/60 border border-red-900/40 px-1.5 py-0.5 rounded ml-1.5 uppercase">LIMITED</span> */}
            </h1>
          </Link>
        </div>

        {/* Header Right widgets */}
        <div className="flex items-center gap-4">

          {/* PLAY GAME BUTTON DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setPlayDropdownOpen(!playDropdownOpen)}
              className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(16,185,129,0.45)] transition-all font-gaming text-xs font-bold px-3 py-1.5 h-8 rounded flex items-center gap-1.5 select-none"
            >
              <Gamepad2 className="w-4 h-4 animate-bounce" />
              <span>เล่นเกม</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${playDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {playDropdownOpen && (
              <>
                {/* Overlay to close on outside click */}
                <div className="fixed inset-0 z-20" onClick={() => setPlayDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-neutral-950/95 border border-zinc-800 rounded shadow-2xl z-30 p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
                  <a
                    href="https://warzth.thehof.gg/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setPlayDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded text-[11px] font-gaming font-bold text-zinc-400 hover:text-white hover:bg-emerald-950/40 border border-transparent hover:border-emerald-500/20 transition-all"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>เว็บไซต์ WarzTH</span>
                  </a>
                  <a
                    href="https://www.facebook.com/thehof.warzth"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setPlayDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded text-[11px] font-gaming font-bold text-zinc-400 hover:text-white hover:bg-blue-950/40 border border-transparent hover:border-blue-500/20 transition-all"
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5 text-blue-400">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                    </svg>
                    <span>แฟนเพจ WarzTH</span>
                  </a>
                </div>
              </>
            )}
          </div>

          {/* User profile actions - Conditional based on Auth status */}
          <div className="flex items-center gap-3 border-l border-zinc-800 pl-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-neutral-900 border border-zinc-700/80 flex items-center justify-center text-game-red font-extrabold shadow-sm select-none">
                    <User className="w-4.5 h-4.5 text-zinc-400" />
                  </div>
                  <div className="flex flex-col text-left md:block hidden">
                    <span className="text-xs font-semibold text-white block select-all" title={user.email || ""}>
                      {user.email?.split("@")[0] || "Survivor"}
                    </span>
                    <span className="text-[8px] text-zinc-500 font-medium block uppercase tracking-wider">Survivor Class</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={async () => {
                    try {
                      await signOut();
                      toast.success("ออกจากระบบสำเร็จ!", { description: "เซสชันผู้รอดชีวิตถูกปิดการใช้งานแล้ว" });
                      router.push("/login");
                    } catch (err: any) {
                      toast.error("ออกจากระบบล้มเหลว", { description: err.message });
                    }
                  }}
                  className="text-zinc-500 hover:text-game-red hover:bg-red-950/20"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => router.push("/login")}
                className="bg-game-red hover:bg-game-red-hover border border-red-650 font-gaming text-xs font-bold px-4 py-1.5 h-8 flex items-center gap-1.5"
                style={{ display: "none" }}
              >
                SIGN IN
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* BODY STRUCTURE (SIDEBAR + MAIN CONTENT) */}
      <div className="flex flex-row flex-1 overflow-hidden z-10 w-full">
        {/* SIDEBAR MENU - Only rendered if user is logged in */}
        {user && (
          <aside
            className={`hidden md:flex shrink-0 border-r border-zinc-900/60 bg-neutral-950/70 backdrop-blur-md flex flex-col justify-between transition-all duration-300 ${sidebarOpen ? "w-[240px]" : "w-[68px]"
              } z-20`}
          >
            {/* Navigation link items */}
            <nav className="p-3 flex flex-col gap-1.5">
              {menuItems.map((item) => {
                const IconComp = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group ${isActive
                      ? "bg-game-red text-white shadow-[0_0_12px_rgba(198,40,40,0.3)] font-semibold border-l-2 border-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                      }`}
                  >
                    <IconComp className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-game-red transition-colors"
                      }`} />

                    {sidebarOpen && (
                      <span className="text-xs font-gaming font-bold tracking-wide transition-all duration-200">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>


            {/* Sidebar decorative footer */}
            <div className="p-4 border-t border-zinc-900/60 font-gaming text-[10px] text-zinc-600 font-bold uppercase tracking-wider text-center">
              {sidebarOpen ? "War Rate" : "WR"}
            </div>
          </aside>
        )}

        {/* MAIN DISPLAY CONTAINER */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Main content scroll area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:p-8 pb-24 md:pb-8">
            {/* Page content */}
            <div className="w-full pr-4 md:pr-0 pb-10 md:pb-16 max-w-full overflow-hidden">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* GLOBAL FOOTER */}
      <footer className="h-auto shrink-0 border-t border-zinc-900/60 bg-neutral-950/90 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 px-6 py-4 md:py-0 pb-24 md:pb-0 z-20 text-[11px] text-zinc-500 font-sans select-none text-center md:text-left w-full">
        {/* Toggle Eye Button for Mobile */}
        <div className="md:hidden flex justify-center w-full py-2">
          <button
            onClick={() => setShowPageviewsText(!showPageviewsText)}
            className="flex items-center justify-center p-2 rounded-full bg-neutral-900/40 border border-zinc-900/80 text-emerald-500 hover:bg-neutral-900/60 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Content wrapper for mobile, normal layout for desktop */}
        <div className={`w-full flex-col md:flex md:flex-row items-center justify-between gap-3 md:gap-0 ${showPageviewsText ? 'flex animate-in fade-in slide-in-from-top-2 duration-200' : 'hidden md:flex'
          }`}>
          <div className="font-gaming text-zinc-500 order-3 md:order-1">v1.0.0 (Jul 15 2026 14:06:36)</div>
          <div className="flex items-center justify-center gap-1.5 text-zinc-400 font-medium order-1 md:order-2">
            <Mail className="w-3.5 h-3.5 text-game-red animate-pulse" />
            <span>ติดต่องานและโฆษณา :</span>
            <a href="mailto:natthaphongcontact@gmail.com" className="text-zinc-200 hover:text-game-red hover:underline transition-all select-all font-semibold font-mono">natthaphongcontact@gmail.com</a>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-end gap-2.5 sm:gap-4 order-2 md:order-3 w-full md:w-auto uppercase">
            {pageviews !== null && (
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium bg-neutral-900/40 border border-zinc-900/80 px-2.5 py-0.5 rounded">
                <Eye className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>ยอดเข้าชมเว็บไซต์ทั้งหมด</span>
                <span className="text-zinc-200 font-mono font-semibold">{pageviews.toLocaleString()}</span>
                <span>ครั้ง</span>
              </div>
            )}
            <span>© 2026 PUBLISHED BY War Rate</span>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-neutral-950/90 backdrop-blur-md border-t border-zinc-900/60 flex items-center justify-around z-30 px-2 select-none pb-safe">
          {menuItems.map((item) => {
            const IconComp = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded transition-all ${isActive ? "text-game-red font-bold" : "text-zinc-500 hover:text-zinc-300"
                  }`}
              >
                <IconComp className={`w-5 h-5 ${isActive ? "text-game-red" : "text-zinc-500"}`} />
                <span className="text-[9px] uppercase tracking-wider font-gaming font-bold truncate max-w-full px-1">
                  {item.id === "dashboard" ? "Overview" : item.label.replace("Manage ", "")}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* GLOBAL TOASTER FOR GAME ALERTS */}
      <Toaster theme="dark" closeButton richColors position="top-right" />
    </div>
  );
}
