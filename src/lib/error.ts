import { NextResponse, NextRequest } from "next/server";
import { supabase } from "./supabase";

/**
 * Custom application-specific error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: any;

  constructor(message: string, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", details: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Verifies JWT session token from Supabase client-side requests
 */
export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Unauthorized: Missing or invalid token", 401, "UNAUTHORIZED");
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new AppError("Unauthorized: Session has expired or is invalid", 401, "UNAUTHORIZED");
  }
  return user;
}

/**
 * Central server-side utility to handle API route exceptions
 */
export function handleApiError(error: any) {
  console.error("💥 Global API Error Intercepted:", error);

  // 1. Handled AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.errorCode,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // 2. TypeORM / PostgreSQL connection error
  if (
    error.name === "CannotExecuteNotConnectedError" ||
    error.message?.includes("connection") ||
    error.message?.includes("pool") ||
    error.code === "ECONNREFUSED"
  ) {
    return NextResponse.json(
      {
        error: "ไม่สามารถเชื่อมต่อกับฐานข้อมูลหลักได้ในขณะนี้ (Supabase Connection Lost)",
        code: "DB_CONNECTION_ERROR",
      },
      { status: 503 }
    );
  }

  // 3. TypeORM Metadata/HMR reload error
  if (error.name === "EntityMetadataNotFoundError") {
    return NextResponse.json(
      {
        error: "เกิดข้อผิดพลาดในการโหลดโมเดลตารางไอเทม (HMR Reload Cache Mismatch)",
        code: "DB_METADATA_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }

  // 4. Fallback for unhandled exceptions
  const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดภายในระบบเซิร์ฟเวอร์";
  return NextResponse.json(
    {
      error: message,
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 }
  );
}

/**
 * Client-side utility to parse catch block errors into readable strings
 */
export async function parseClientError(error: any): Promise<string> {
  if (!error) return "เกิดข้อผิดพลาดที่ไม่สามารถระบุได้";

  // If it's a Fetch Response object
  if (error instanceof Response) {
    try {
      const data = await error.json();
      return data.error || `ข้อผิดพลาดของเซิร์ฟเวอร์ (รหัสสถานะ: ${error.status})`;
    } catch {
      return `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (รหัสสถานะ: ${error.status})`;
    }
  }

  // If it is a standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // If it is an object containing error message
  if (typeof error === "object") {
    if (error.error) return error.error;
    if (error.message) return error.message;
  }

  return String(error);
}
