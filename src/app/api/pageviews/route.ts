import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    // Check if we should only fetch the count without incrementing
    const { searchParams } = new URL(req.url);
    const getOnly = searchParams.get("incr") === "false";

    let count: number;
    if (getOnly) {
      const val = await redis.get("website_pageviews");
      count = val ? parseInt(val, 10) : 0;
    } else {
      count = await redis.incr("website_pageviews");
    }

    return NextResponse.json({ success: true, pageviews: count });
  } catch (err: any) {
    console.error("Redis Pageviews API error:", err);
    // Return fallback value so layout doesn't crash on connection failure
    return NextResponse.json({ success: false, pageviews: 0, error: err.message });
  }
}
