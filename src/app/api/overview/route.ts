export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { Item } from "@/entities/Item";
import { Price } from "@/entities/Price";
import { handleApiError } from "@/lib/error";
import { ILike, In, LessThanOrEqual } from "typeorm";
import { redis } from "@/lib/redis";
import { fillMissingDatesAndGroup } from "@/lib/chartUtils";

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
    const itemRepo = dataSource.getRepository(Item);
    const priceRepo = dataSource.getRepository(Price);

    // Get unique item IDs that have at least one price record in the database
    const rawActiveItems = await priceRepo.createQueryBuilder("price")
      .select("price.item_id", "itemId")
      .distinct(true)
      .getRawMany();
    const activeItemIds = rawActiveItems.map(r => r.itemId || r.itemid).filter(Boolean);

    if (activeItemIds.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }

    // Build filter
    const where: any = {
      id: In(activeItemIds)
    };
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
      // Fetch up to 30 recent price points to ensure we have a good baseline for filling missing dates
      const rawHistory = await priceRepo.find({
        where: {
          item: { id: item.id },
          recordedAt: LessThanOrEqual(new Date()),
        },
        order: { recordedAt: "DESC" },
        take: 30,
      });

      const latest = rawHistory[0] || null;
      
      // Check if we should normalize to unit price (based on the latest record settings)
      const normalizeToUnit = latest ? (latest.showUnitPrice !== false) : true;
      
      // Transform data: group by day and fill missing dates for the last 7 days
      const historyFilled = fillMissingDatesAndGroup(rawHistory, 7, normalizeToUnit);

      // Extract trend from the last 2 days (today and yesterday)
      const latestDay = historyFilled[historyFilled.length - 1];
      const previousDay = historyFilled[historyFilled.length - 2];

      const latestUnitAvg = latestDay ? latestDay.avgPrice : 0;
      const previousUnitAvg = previousDay ? previousDay.avgPrice : 0;

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
        showUnitPrice: latest ? (latest.showUnitPrice !== false) : true,
        
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
        
        // Sparkline & History use the transformed 7-day continuous data
        sparkline: historyFilled.map(h => h.avgPrice),
        history: historyFilled,
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
