import { NextResponse, NextRequest } from "next/server";
import { initDatabase } from "@/lib/db";
import { Unit } from "@/entities/Unit";
import { handleApiError, AppError, verifyAuth } from "@/lib/error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataSource = await initDatabase();
    const unitRepo = dataSource.getRepository<Unit>("Unit");
    const units = await unitRepo.find({
      order: {
        name: "ASC",
      },
    });
    return NextResponse.json(units);
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { name } = await req.json();
    if (!name || !name.trim()) {
      throw new AppError("กรุณาระบุชื่อหน่วยนับ", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const unitRepo = dataSource.getRepository<Unit>("Unit");
    
    // Check if name is unique
    const existing = await unitRepo.findOneBy({ name: name.trim() });
    if (existing) {
      throw new AppError(`มีหน่วยนับ "${name}" นี้อยู่ในระบบแล้ว`, 400, "NAME_DUPLICATE");
    }

    const newUnit = unitRepo.create({
      name: name.trim(),
    });
    
    const saved = await unitRepo.save(newUnit);
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await verifyAuth(req);

    const { id, name } = await req.json();
    if (!id || !name || !name.trim()) {
      throw new AppError("กรุณาระบุไอดีและชื่อหน่วยนับ", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const unitRepo = dataSource.getRepository<Unit>("Unit");
    
    const unit = await unitRepo.findOneBy({ id });
    if (!unit) {
      throw new AppError("ไม่พบข้อมูลหน่วยนับที่ต้องการแก้ไขในระบบ", 404, "UNIT_NOT_FOUND");
    }

    // Check duplicate name on other rows
    const duplicate = await unitRepo.findOne({
      where: { name: name.trim() }
    });
    if (duplicate && duplicate.id !== id) {
      throw new AppError(`มีหน่วยนับ "${name}" นี้อยู่แล้วในรายการอื่น`, 400, "NAME_DUPLICATE");
    }

    unit.name = name.trim();
    const saved = await unitRepo.save(unit);
    return NextResponse.json(saved);
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
      throw new AppError("กรุณาระบุไอดีของหน่วยนับที่ต้องการลบ", 400, "VALIDATION_ERROR");
    }

    const dataSource = await initDatabase();
    const unitRepo = dataSource.getRepository<Unit>("Unit");
    
    const unit = await unitRepo.findOneBy({ id });
    if (!unit) {
      throw new AppError("ไม่พบหน่วยนับที่ต้องการลบในระบบ", 404, "UNIT_NOT_FOUND");
    }

    await unitRepo.remove(unit);
    return NextResponse.json({ success: true, message: "ลบหน่วยนับเสร็จสิ้น" });
  } catch (error: any) {
    return handleApiError(error);
  }
}
