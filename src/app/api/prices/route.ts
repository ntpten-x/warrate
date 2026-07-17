import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { Price } from "@/entities/Price";
import { Item } from "@/entities/Item";
import { handleApiError, AppError, verifyAuth } from "@/lib/error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId") || "";
    const latest = searchParams.get("latest") === "true";

    const dataSource = await initDatabase();
    const priceRepo = dataSource.getRepository(Price);

    // Scenario A: Retrieve only the single latest price record for autofill template
    if (latest) {
      if (!itemId) {
        throw new AppError("กรุณาระบุไอดีไอเทมเพื่อดึงราคาล่าสุด", 400, "VALIDATION_ERROR");
      }
      const latestPrice = await priceRepo.findOne({
        where: { item: { id: itemId } },
        order: { recordedAt: "DESC" },
      });
      return NextResponse.json(latestPrice || null);
    }

    // Scenario B: Retrieve paginated price records
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (itemId) {
      where.item = { id: itemId };
    }

    const [prices, total] = await priceRepo.findAndCount({
      where,
      order: {
        recordedAt: "DESC",
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: prices,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { itemId, lowPrice, highPrice, avgPrice, source, note, recordedAt, unitQuantity, isBulk, showUnitPrice } = await req.json();

    if (!itemId || lowPrice === undefined || highPrice === undefined || avgPrice === undefined || !source) {
      throw new AppError("ข้อมูลสำหรับบันทึกราคาไม่ครบถ้วน", 400, "VALIDATION_ERROR");
    }

    const low = Number(lowPrice);
    const high = Number(highPrice);
    const avg = Number(avgPrice);

    // Business Logic Validation
    if (low > avg || avg > high) {
      throw new AppError("ราคาผิดพลาดตามกฎธุรกิจ: ราคาต่ำสุด (Low) <= ราคากลาง (Avg) <= ราคาสูงสุด (High)", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const itemRepo = dataSource.getRepository(Item);
    const priceRepo = dataSource.getRepository(Price);

    const item = await itemRepo.findOneBy({ id: itemId });
    if (!item) {
      throw new AppError("ไม่พบไอเทมที่เลือกในระบบ", 400, "VALIDATION_ERROR");
    }

    const newPrice = priceRepo.create({
      item,
      lowPrice: low,
      highPrice: high,
      avgPrice: avg,
      source: source.trim(),
      note: note?.trim() || "",
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      unitQuantity: unitQuantity !== undefined ? Math.max(1, Number(unitQuantity)) : 1,
      isBulk: !!isBulk,
      showUnitPrice: showUnitPrice === undefined ? true : !!showUnitPrice,
    });

    const saved = await priceRepo.save(newPrice);
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { id, itemId, lowPrice, highPrice, avgPrice, source, note, recordedAt, unitQuantity, isBulk, showUnitPrice } = await req.json();

    if (!id || !itemId || lowPrice === undefined || highPrice === undefined || avgPrice === undefined || !source) {
      throw new AppError("ข้อมูลสำหรับแก้ไขไม่ครบถ้วน", 400, "VALIDATION_ERROR");
    }

    const low = Number(lowPrice);
    const high = Number(highPrice);
    const avg = Number(avgPrice);

    // Business Logic Validation
    if (low > avg || avg > high) {
      throw new AppError("ราคาผิดพลาดตามกฎธุรกิจ: ราคาต่ำสุด (Low) <= ราคากลาง (Avg) <= ราคาสูงสุด (High)", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const priceRepo = dataSource.getRepository(Price);
    const itemRepo = dataSource.getRepository(Item);

    const priceRecord = await priceRepo.findOneBy({ id });
    if (!priceRecord) {
      throw new AppError("ไม่พบรายการราคาที่ต้องการแก้ไข", 404, "NOT_FOUND");
    }

    const item = await itemRepo.findOneBy({ id: itemId });
    if (!item) {
      throw new AppError("ไม่พบไอเทมที่ระบุ", 400, "VALIDATION_ERROR");
    }

    priceRecord.item = item;
    priceRecord.lowPrice = low;
    priceRecord.highPrice = high;
    priceRecord.avgPrice = avg;
    priceRecord.source = source.trim();
    priceRecord.note = note?.trim() || "";
    priceRecord.recordedAt = recordedAt ? new Date(recordedAt) : new Date();
    priceRecord.unitQuantity = unitQuantity !== undefined ? Math.max(1, Number(unitQuantity)) : 1;
    priceRecord.isBulk = !!isBulk;
    priceRecord.showUnitPrice = showUnitPrice === undefined ? true : !!showUnitPrice;

    const updated = await priceRepo.save(priceRecord);
    return NextResponse.json(updated);
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      throw new AppError("ไม่พบข้อมูลไอดีราคาที่ต้องการลบ", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const priceRepo = dataSource.getRepository(Price);

    const priceRecord = await priceRepo.findOneBy({ id });
    if (!priceRecord) {
      throw new AppError("ไม่พบรายการราคาที่ต้องการลบ", 404, "NOT_FOUND");
    }

    await priceRepo.remove(priceRecord);
    return NextResponse.json({ success: true, message: "ลบประวัติราคาเรียบร้อยแล้ว" });
  } catch (error: any) {
    return handleApiError(error);
  }
}
