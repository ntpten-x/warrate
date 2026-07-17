export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { Category } from "@/entities/Category";
import { Item } from "@/entities/Item";
import { Price } from "@/entities/Price";
import { In } from "typeorm";
import { handleApiError, AppError, verifyAuth } from "@/lib/error";

export const revalidate = 300; // Cache for 5 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const dataSource = await initDatabase();
    const catRepo = dataSource.getRepository(Category);

    if (activeOnly) {
      const priceRepo = dataSource.getRepository(Price);
      const itemRepo = dataSource.getRepository(Item);

      // Get unique item IDs that have at least one price record
      const rawActiveItems = await priceRepo.createQueryBuilder("price")
        .select("price.item_id", "itemId")
        .distinct(true)
        .getRawMany();
      const activeItemIds = rawActiveItems.map(r => r.itemId || r.itemid).filter(Boolean);

      if (activeItemIds.length === 0) {
        return NextResponse.json([]);
      }

      // Fetch the category IDs for those items
      const items = await itemRepo.find({
        where: { id: In(activeItemIds) },
        relations: { category: true }
      });
      console.log("DEBUG activeItemIds:", activeItemIds);
      console.log("DEBUG fetched items:", items.map(it => ({ id: it.id, name: it.name, catId: it.category?.id, cat: it.category })));
      const activeCategoryIds = items.map(it => it.category?.id).filter(Boolean);
      const uniqueCategoryIds = Array.from(new Set(activeCategoryIds));

      if (uniqueCategoryIds.length === 0) {
        return NextResponse.json([]);
      }

      const categories = await catRepo.find({
        where: { id: In(uniqueCategoryIds) },
        order: { order_index: "ASC" },
      });
      return NextResponse.json(categories);
    }

    const categories = await catRepo.find({
      order: {
        order_index: "ASC",
      },
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { name, slug, icon_name, order_index, unitId } = await req.json();
    if (!name || !slug) {
      throw new AppError("กรุณาระบุชื่อและสลักหมวดหมู่ให้ครบถ้วน", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const catRepo = dataSource.getRepository(Category);
    
    // Check if slug is unique
    const existing = await catRepo.findOneBy({ slug: slug.trim().toLowerCase() });
    if (existing) {
      throw new AppError(`มีหมวดหมู่สลัก "${slug}" นี้อยู่ในระบบแล้ว`, 400, "SLUG_DUPLICATE");
    }

    const newCategory = catRepo.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      icon_name: icon_name?.trim() || "Folder",
      order_index: Number(order_index) || 0,
      unit: unitId ? { id: unitId } : null,
    });
    
    const saved = await catRepo.save(newCategory);
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { id, name, slug, icon_name, order_index, unitId } = await req.json();
    if (!id || !name || !slug) {
      throw new AppError("ข้อมูลสำหรับแก้ไขไม่ครบถ้วน (id, name, slug)", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const catRepo = dataSource.getRepository(Category);
    
    const category = await catRepo.findOneBy({ id });
    if (!category) {
      throw new AppError("ไม่พบหมวดหมู่ที่ต้องการแก้ไข", 404, "NOT_FOUND");
    }

    // Check slug unique constraints (if slug changed)
    const normalizedSlug = slug.trim().toLowerCase();
    if (category.slug !== normalizedSlug) {
      const existing = await catRepo.findOneBy({ slug: normalizedSlug });
      if (existing) {
        throw new AppError(`มีหมวดหมู่สลัก "${slug}" นี้อยู่ในระบบแล้ว`, 400, "SLUG_DUPLICATE");
      }
    }

    category.name = name.trim();
    category.slug = normalizedSlug;
    category.icon_name = icon_name?.trim() || "Folder";
    category.order_index = Number(order_index) || 0;
    category.unit = unitId ? { id: unitId } as any : null;

    const updated = await catRepo.save(category);
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
      throw new AppError("ไม่พบข้อมูลไอดีหมวดหมู่ที่ต้องการลบ", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const catRepo = dataSource.getRepository(Category);
    
    const category = await catRepo.findOneBy({ id });
    if (!category) {
      throw new AppError("ไม่พบหมวดหมู่ที่ต้องการลบ", 404, "NOT_FOUND");
    }

    await catRepo.remove(category);
    return NextResponse.json({ success: true, message: "ลบหมวดหมู่เรียบร้อยแล้ว" });
  } catch (error: any) {
    return handleApiError(error);
  }
}
