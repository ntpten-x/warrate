import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { Item } from "@/entities/Item";
import { Category } from "@/entities/Category";
import { handleApiError, AppError, verifyAuth } from "@/lib/error";
import { formatImageUrl } from "@/lib/imageUtils";
import { ILike } from "typeorm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "8", 10));
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const skip = (page - 1) * limit;

    const dataSource = await initDatabase();
    const itemRepo = dataSource.getRepository(Item);

    // Build search and filter conditions
    const where: any = {};
    if (search) {
      where.name = ILike(`%${search}%`);
    }
    // Filter by Category relation if category parameter is a valid UUID relation filter
    if (category && category !== "all" && category !== "ทั้งหมด") {
      where.category = { id: category };
    }

    const [items, total] = await itemRepo.findAndCount({
      where,
      order: {
        created_at: "DESC",
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

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { name, categoryId, image_url } = await req.json();
    if (!name || !categoryId) {
      throw new AppError("กรุณาระบุชื่อและหมวดหมู่ไอเทมให้ครบถ้วน", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const itemRepo = dataSource.getRepository(Item);
    const catRepo = dataSource.getRepository(Category);

    const category = await catRepo.findOneBy({ id: categoryId });
    if (!category) {
      throw new AppError("ไม่พบหมวดหมู่ที่เลือกในระบบ", 400, "VALIDATION_ERROR");
    }

    const newItem = itemRepo.create({
      name: name.trim(),
      category,
      image_url: formatImageUrl(image_url),
    });
    
    const savedItem = await itemRepo.save(newItem);
    return NextResponse.json(savedItem, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { id, name, categoryId, image_url } = await req.json();
    if (!id || !name || !categoryId) {
      throw new AppError("ข้อมูลสำหรับแก้ไขไม่ครบถ้วน (id, name, categoryId)", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const itemRepo = dataSource.getRepository(Item);
    const catRepo = dataSource.getRepository(Category);

    const item = await itemRepo.findOneBy({ id });
    if (!item) {
      throw new AppError("ไม่พบไอเทมที่ต้องการแก้ไข", 404, "NOT_FOUND");
    }

    const category = await catRepo.findOneBy({ id: categoryId });
    if (!category) {
      throw new AppError("ไม่พบหมวดหมู่ที่เลือกในระบบ", 400, "VALIDATION_ERROR");
    }

    item.name = name.trim();
    item.category = category;
    item.image_url = formatImageUrl(image_url);
    
    const updatedItem = await itemRepo.save(item);
    return NextResponse.json(updatedItem);
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
      throw new AppError("ไม่พบข้อมูลไอดีไอเทมที่ต้องการลบ", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const itemRepo = dataSource.getRepository(Item);
    const item = await itemRepo.findOneBy({ id });
    if (!item) {
      throw new AppError("ไม่พบไอเทมที่ต้องการลบ", 404, "NOT_FOUND");
    }

    await itemRepo.remove(item);
    return NextResponse.json({ success: true, message: "ลบไอเทมเรียบร้อยแล้ว" });
  } catch (error: any) {
    return handleApiError(error);
  }
}
