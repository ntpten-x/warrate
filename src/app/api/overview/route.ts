import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { Item } from "@/entities/Item";
import { Price } from "@/entities/Price";
import { handleApiError } from "@/lib/error";
import { ILike } from "typeorm";
import { redis } from "@/lib/redis";

export const revalidate = 15; // Cache response for 15 seconds to support high concurrency

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "8", 10));
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const skip = (page - 1) * limit;

    const dataSource = await initDatabase();
    const itemRepo = dataSource.getRepository<Item>("Item");
    const priceRepo = dataSource.getRepository<Price>("Price");

    // Build filter
    const where: any = {};
    if (search) {
      where.name = ILike(`%${search}%`);
    }
    if (category && category !== "all" && category !== "ทั้งหมด") {
      where.category = { id: category };
    }

    const sortBy = searchParams.get("sortBy") || "latest";

    let items: Item[];
    let total: number;
    const viewsMap = new Map<string, number>();

    if (sortBy === "trending") {
      // Fetch all items matching the filter to sort in memory
      const allItems = await itemRepo.find({
        where,
      });

      // Pipeline views from Redis
      let scoresResult: any = null;
      try {
        const pipeline = redis.pipeline();
        allItems.forEach((item) => {
          pipeline.zscore("trending_items", item.id);
        });
        scoresResult = await pipeline.exec();
      } catch (redisError) {
        console.error("Redis pipeline error in overview (trending):", redisError);
      }

      const itemsWithViews = allItems.map((item, index) => {
        const scoreRaw = scoresResult ? scoresResult[index][1] : null;
        const views = scoreRaw ? parseInt(scoreRaw as string, 10) : 0;
        return { item, views };
      });

      // Sort by views DESC, then created_at DESC
      itemsWithViews.sort((a, b) => {
        if (b.views !== a.views) {
          return b.views - a.views;
        }
        return new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime();
      });

      total = itemsWithViews.length;
      const paginated = itemsWithViews.slice(skip, skip + limit);
      items = paginated.map((p) => p.item);
      paginated.forEach((p) => {
        viewsMap.set(p.item.id, p.views);
      });
    } else {
      // Default: latest (database pagination)
      const [dbItems, dbTotal] = await itemRepo.findAndCount({
        where,
        order: { created_at: "DESC" },
        skip,
        take: limit,
      });
      items = dbItems;
      total = dbTotal;

      // Pipeline views from Redis for only the paginated items
      let scoresResult: any = null;
      try {
        const pipeline = redis.pipeline();
        items.forEach((item) => {
          pipeline.zscore("trending_items", item.id);
        });
        scoresResult = await pipeline.exec();
      } catch (redisError) {
        console.error("Redis pipeline error in overview (latest):", redisError);
      }

      items.forEach((item, index) => {
        const scoreRaw = scoresResult ? scoresResult[index][1] : null;
        const views = scoreRaw ? parseInt(scoreRaw as string, 10) : 0;
        viewsMap.set(item.id, views);
      });
    }

    const data = await Promise.all(items.map(async (item) => {
      // Get last 7 price points chronologically
      const history = await priceRepo.find({
        where: { item: { id: item.id } },
        order: { recordedAt: "DESC" },
        take: 7,
      });

      // Reverse to chronological order (oldest to newest)
      history.reverse();

      const latest = history[history.length - 1] || null;
      const previous = history[history.length - 2] || null;

      // Calculate unit prices to ensure fair comparison
      const latestUnitAvg = latest ? (latest.avgPrice / (latest.unitQuantity || 1)) : 0;
      const previousUnitAvg = previous ? (previous.avgPrice / (previous.unitQuantity || 1)) : 0;

      let trend = 0;
      if (latestUnitAvg && previousUnitAvg) {
        trend = ((latestUnitAvg - previousUnitAvg) / previousUnitAvg) * 100;
      }

      return {
        id: item.id,
        name: item.name,
        image_url: item.image_url,
        category: item.category,
        
        // Wholesale/Bulk attributes
        isBulk: latest ? latest.isBulk : false,
        unitQuantity: latest ? latest.unitQuantity : 1,
        
        // Total Prices (lump sum)
        totalAvgPrice: latest ? latest.avgPrice : 0,
        totalLowPrice: latest ? latest.lowPrice : 0,
        totalHighPrice: latest ? latest.highPrice : 0,

        // Unit Price (calculated)
        avgPrice: latestUnitAvg,
        lowPrice: latest ? (latest.lowPrice / (latest.unitQuantity || 1)) : 0,
        highPrice: latest ? (latest.highPrice / (latest.unitQuantity || 1)) : 0,

        note: latest ? latest.note : "",
        trend,
        views: viewsMap.get(item.id) || 0,
        
        // Sparkline & History are fully normalized to Unit Price
        sparkline: history.map(h => h.avgPrice / (h.unitQuantity || 1)),
        history: history.map(h => ({
          date: new Date(h.recordedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
          avgPrice: h.avgPrice / (h.unitQuantity || 1),
          lowPrice: h.lowPrice / (h.unitQuantity || 1),
          highPrice: h.highPrice / (h.unitQuantity || 1),
        })),
      };
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
