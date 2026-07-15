import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { RootLayoutClient } from "@/components/layout/root-layout-client";
import { QueryProvider } from "@/components/providers/query-provider";
import { ItemsProvider } from "@/components/providers/items-context";
import { ErrorBoundary } from "@/components/providers/error-boundary";
import { AuthProvider } from "@/components/providers/auth-context";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "War Rate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={cn("font-sans", geist.variable)}>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <QueryProvider>
              <ItemsProvider>
                <RootLayoutClient>{children}</RootLayoutClient>
              </ItemsProvider>
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
