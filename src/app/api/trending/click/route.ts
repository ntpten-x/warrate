import { NextResponse, NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { handleApiError } from "@/lib/error";

export async function POST(req: NextRequest) {
  try {
    const { itemId } = await req.json();
    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Missing itemId" },
        { status: 400 }
      );
    }

    // Try to get client IP
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const limitKey = `click_limit:${ip}:${itemId}`;

    let viewsVal: number = 0;
    let incremented = false;

    try {
      const isLimited = await redis.get(limitKey);

      if (!isLimited) {
        const rawViews = await redis.zincrby("trending_items", 1, itemId);
        await redis.set(limitKey, "1", "EX", 60); // 1 minute limit per item per IP
        viewsVal = parseInt(rawViews, 10);
        incremented = true;
      } else {
        const rawViews = await redis.zscore("trending_items", itemId);
        viewsVal = rawViews ? parseInt(rawViews, 10) : 0;
      }
    } catch (redisError) {
      console.error("Redis error during click tracking:", redisError);
      // Fallback if Redis is down: return success: true but views: 0 so client doesn't break
      return NextResponse.json({
        success: true,
        views: 0,
        incremented: false,
        redisDown: true,
      });
    }

    return NextResponse.json({
      success: true,
      views: viewsVal,
      incremented,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
