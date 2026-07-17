export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { Item } from "@/entities/Item";
import { Price } from "@/entities/Price";
import { handleApiError } from "@/lib/error";
import { redis } from "@/lib/redis";
import { In, LessThanOrEqual } from "typeorm";

export const revalidate = 10; // Cache trending items for 10 seconds in production

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch top 5 item IDs and scores from Redis Sorted Set
    let topClicked: string[] = [];
    try {
      topClicked = await redis.zrevrange("trending_items", 0, 4, "WITHSCORES");
    } catch (redisError) {
      console.error("Redis error in GET /api/trending:", redisError);
      topClicked = []; // Triggers DB fallback
    }
    
    const dataSource = await initDatabase();
    const itemRepo = dataSource.getRepository(Item);
    const priceRepo = dataSource.getRepository(Price);

    let dbItems: Item[] = [];
    const itemViewsMap = new Map<string, number>();

    // Get unique item IDs that have at least one price record in the database
    const rawActiveItems = await priceRepo.createQueryBuilder("price")
      .select("price.item_id", "itemId")
      .distinct(true)
      .getRawMany();
    const activeItemIds = rawActiveItems.map(r => r.itemId || r.itemid).filter(Boolean);

    if (activeItemIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    if (topClicked.length > 0) {
      // Parse the zrevrange result [id1, score1, id2, score2, ...]
      const itemIds: string[] = [];
      for (let i = 0; i < topClicked.length; i += 2) {
        const id = topClicked[i];
        const score = parseInt(topClicked[i + 1], 10);
        itemIds.push(id);
        itemViewsMap.set(id, score);
      }

      // Fetch items matching these IDs that have at least one price log
      const matchedIds = itemIds.filter(id => activeItemIds.includes(id));
      if (matchedIds.length > 0) {
        dbItems = await itemRepo.find({
          where: { id: In(matchedIds) },
        });
      }
    }
    
    // If no trending items could be fetched, or none of them have prices, fall back to newest active items
    if (dbItems.length === 0) {
      dbItems = await itemRepo.find({
        where: { id: In(activeItemIds) },
        order: { created_at: "DESC" },
        take: 3,
      });
      // Initialize them with 0 views
      dbItems.forEach(item => {
        itemViewsMap.set(item.id, 0);
      });
    }

    // 2. Resolve price details, histories, and trends for these items
    const rawData = await Promise.all(dbItems.map(async (item) => {
      // Get last 7 price points chronologically
      const history = await priceRepo.find({
        where: {
          item: { id: item.id },
          recordedAt: LessThanOrEqual(new Date()),
        },
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

      const views = itemViewsMap.get(item.id) || 0;

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
        views,
        
        // Sparkline & History are fully normalized to Unit Price or Total Package Price based on flag
        sparkline: history.map(h => (latest && latest.showUnitPrice === false) ? h.avgPrice : (h.avgPrice / (h.unitQuantity || 1))),
        history: history.map(h => ({
          date: new Date(h.recordedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
          avgPrice: (latest && latest.showUnitPrice === false) ? h.avgPrice : (h.avgPrice / (h.unitQuantity || 1)),
          lowPrice: (latest && latest.showUnitPrice === false) ? h.lowPrice : (h.lowPrice / (h.unitQuantity || 1)),
          highPrice: (latest && latest.showUnitPrice === false) ? h.highPrice : (h.highPrice / (h.unitQuantity || 1)),
        })),
      };
    }));

    // Sort items based on their score (views) descending, falling back to created_at DESC for equal score/fallback
    rawData.sort((a, b) => {
      if (b.views !== a.views) {
        return b.views - a.views;
      }
      // Compare by created date or id if fallback
      return b.name.localeCompare(a.name);
    });

    return NextResponse.json({ data: rawData });
  } catch (error: any) {
    return handleApiError(error);
  }
}
