import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { Category } from "@/entities/Category";
import { handleApiError, AppError, verifyAuth } from "@/lib/error";

export const runtime = "edge";
export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const dataSource = await initDatabase();
    const catRepo = dataSource.getRepository<Category>("Category");
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
    const catRepo = dataSource.getRepository<Category>("Category");
    
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
    const catRepo = dataSource.getRepository<Category>("Category");
    
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
    const catRepo = dataSource.getRepository<Category>("Category");
    
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
