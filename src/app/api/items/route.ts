import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { MarketItem } from "@/entities/MarketItem";
import { handleApiError } from "@/lib/error";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "5", 10));
    const skip = (page - 1) * limit;

    const dataSource = await initDatabase();
    const itemRepo = dataSource.getRepository<MarketItem>("MarketItem");

    // Use findAndCount to get both dynamic page content and total count in one query
    const [items, total] = await itemRepo.findAndCount({
      order: {
        priceGC: "DESC",
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: items,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
