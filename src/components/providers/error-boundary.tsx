"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 Uncaught boundary error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="relative min-h-screen w-screen flex flex-col items-center justify-center text-white p-6 font-sans select-none bg-neutral-950"
          style={{ 
            backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.99) 100%), url('/zombie-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Scanline atmospheric overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 z-1 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />
          
          <div className="w-full max-w-xl bg-black/90 border border-red-950 shadow-[0_0_30px_rgba(198,40,40,0.15)] rounded-lg p-6 relative z-10 flex flex-col gap-6 animate-[pulse-glow-red_3s_infinite]">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-red-600 to-transparent absolute top-0 left-0" />

            {/* Error Header */}
            <div className="flex flex-col items-center gap-3 text-center border-b border-zinc-900/60 pb-4">
              <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center text-red-500 animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-gaming font-extrabold text-lg text-red-500 tracking-wider">CRITICAL LAUNCHER EXCEPTION</h2>
                <p className="text-[11px] text-zinc-400 mt-1.5 font-gaming">
                  ตรวจพบข้อผิดพลาดร้ายแรงในเอนจิ้นอินเตอร์เฟซระบบ
                </p>
              </div>
            </div>

            {/* Diagnostics Report Terminal */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-zinc-400 font-gaming text-[10px] uppercase font-bold tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-red-500" />
                <span>Diagnostic Logs / Stack Trace</span>
              </div>
              <div className="w-full bg-neutral-950 border border-zinc-900 rounded p-4 font-mono text-[10px] text-red-400/90 overflow-x-auto text-left leading-relaxed max-h-[160px] scrollbar-thin select-text">
                <p className="font-bold text-red-400">Error: {this.state.error?.message || "Unknown error occurred"}</p>
                {this.state.error?.stack && (
                  <pre className="mt-2 text-zinc-500 whitespace-pre-wrap leading-normal font-mono select-text">
                    {this.state.error.stack.split("\n").slice(1, 5).join("\n")}
                  </pre>
                )}
              </div>
            </div>

            {/* Recover Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
              <Button 
                onClick={this.handleReset}
                className="w-full sm:w-auto bg-red-900/80 hover:bg-red-800 text-white font-gaming text-xs border border-red-700 font-bold px-5 py-2 flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                REBOOT SYSTEM
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs px-5 py-2 flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                <Home className="w-3.5 h-3.5" />
                GO BACK HOME
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
