import "reflect-metadata";
import { DataSource, EntityManager } from "typeorm";
import { MarketItem } from "@/entities/MarketItem";
import { Item } from "@/entities/Item";
import { Category } from "@/entities/Category";
import { Price } from "@/entities/Price";
import { Unit } from "@/entities/Unit";

// Patch TypeORM getMetadata and getRepository to fall back to string-based lookup in development environments
// when class constructor references differ across Next.js API sandbox bundles.
if (process.env.NODE_ENV !== "production") {
  const patchTypeORM = (prototype: any, methodName: string) => {
    const original = prototype[methodName];
    if (original && !original.__isPatched) {
      const patched = function (this: any, target: any) {
        try {
          return original.call(this, target);
        } catch (err: any) {
          if (err.name === "EntityMetadataNotFoundError" && typeof target === "function" && target.name) {
            return original.call(this, target.name);
          }
          throw err;
        }
      };
      patched.__isPatched = true;
      prototype[methodName] = patched;
    }
  };

  patchTypeORM(DataSource.prototype, "getMetadata");
  patchTypeORM(DataSource.prototype, "getRepository");
  patchTypeORM(EntityManager.prototype, "getMetadata");
  patchTypeORM(EntityManager.prototype, "getRepository");
}

declare global {
  var dbDataSource: DataSource | undefined;
  var dbInitPromise: Promise<DataSource> | undefined;
}

export async function initDatabase() {
  if (globalThis.dbDataSource) {
    // Next.js dev server executes each API route in an isolated sandbox,
    // which results in separate constructor references for Category, Item, etc.
    // Instead of re-initializing the DataSource pool (which causes connection leaks/drops),
    // we use our getRepository string-fallback patch above to support cross-sandbox queries.
    const hasHmrReload = false;

    if (hasHmrReload) {
      console.log("🔄 Next.js HMR detected new entity definitions. Re-initializing TypeORM DataSource...");
      const oldDataSource = globalThis.dbDataSource;
      globalThis.dbDataSource = undefined;
      globalThis.dbInitPromise = undefined;

      if (oldDataSource.isInitialized) {
        // Delay connection pool destruction by 10 seconds to let in-flight queries complete safely
        setTimeout(() => {
          console.log("🧹 Gracefully closing old HMR-replaced database connection pool...");
          oldDataSource.destroy().catch(() => { });
        }, 10000);
      }
    }
  }

  // Ping connection if already initialized to check for server-terminated connections
  if (globalThis.dbDataSource && globalThis.dbDataSource.isInitialized) {
    try {
      await globalThis.dbDataSource.query("SELECT 1");
    } catch (err) {
      console.warn("⚠️ Database connection is terminated or dead. Re-initializing DataSource...");
      const oldDataSource = globalThis.dbDataSource;
      globalThis.dbDataSource = undefined;
      globalThis.dbInitPromise = undefined;

      if (oldDataSource.isInitialized) {
        oldDataSource.destroy().catch(() => { });
      }
    }
  }

  if (!globalThis.dbDataSource) {
    globalThis.dbDataSource = new DataSource({
      type: "postgres",
      url: process.env.DATABASE_URL || "postgres://localhost:5432/db",
      synchronize: process.env.NODE_ENV !== "production",
      logging: false,
      entities: [MarketItem, Item, Category, Price, Unit],
      extra: {
        max: 40,
        idleTimeoutMillis: 30000,
      },
    });
  }

  // Prevent multiple concurrent .initialize() calls by storing the init promise globally
  if (!globalThis.dbDataSource.isInitialized) {
    if (!globalThis.dbInitPromise) {
      console.log("🔋 Initializing Supabase PostgreSQL connection via TypeORM (Singleton)...");
      globalThis.dbInitPromise = globalThis.dbDataSource.initialize()
        .then(async (dataSourceInstance) => {
          console.log("🔌 Connection established successfully!");

          // Seed units first if empty
          const unitRepo = dataSourceInstance.getRepository(Unit);
          const unitCount = await unitRepo.count();
          let seededUnits: Unit[] = [];
          if (unitCount === 0) {
            console.log("🌱 Seeding default units into Supabase...");
            const defaultUnits = [
              { name: "กระบอก" },
              { name: "ตัว" },
              { name: "ชิ้น" },
              { name: "กล่อง" },
              { name: "อัน" },
            ];
            seededUnits = await unitRepo.save(unitRepo.create(defaultUnits));
          } else {
            seededUnits = await unitRepo.find();
          }

          // Seed marketplace items if empty
          const marketRepo = dataSourceInstance.getRepository(MarketItem);
          const marketCount = await marketRepo.count();

          if (marketCount === 0) {
            console.log("🌱 Seeding default marketplace items into Supabase...");
            const defaultMarketItems = [
              { name: "AWP Sniper Rifle", category: "Weapon", priceGC: 4500, priceUSD: 15, stock: 12 },
              { name: "M4A1 Assault Rifle", category: "Weapon", priceGC: 2200, priceUSD: 8, stock: 24 },
              { name: "Military Bulletproof Vest", category: "Gear", priceGC: 1200, priceUSD: 4, stock: 45 },
              { name: "Large Medkit", category: "Medical", priceGC: 450, priceUSD: 1.5, stock: 120 },
              { name: "Antibiotics Injection", category: "Medical", priceGC: 650, priceUSD: 2, stock: 85 },
              { name: "Riot Helmet", category: "Gear", priceGC: 950, priceUSD: 3, stock: 32 },
              { name: "5.56mm Ammo Crate", category: "Ammo", priceGC: 150, priceUSD: 0.5, stock: 500 },
              { name: "Golden Desert Eagle", category: "Weapon", priceGC: 6000, priceUSD: 20, stock: 3 },
            ];
            await marketRepo.save(marketRepo.create(defaultMarketItems));
          }

          // Seed categories if empty
          const catRepo = dataSourceInstance.getRepository(Category);
          const catCount = await catRepo.count();

          let seededCategories: Category[] = [];
          if (catCount === 0) {
            console.log("🌱 Seeding default categories into Supabase...");
            const findUnit = (name: string) => seededUnits.find(u => u.name === name) || seededUnits[0];

            const defaultCategories = [
              { name: "ปืนไรเฟิล", slug: "rifle", icon_name: "Flame", order_index: 1, unit: findUnit("กระบอก") },
              { name: "ชุดเกราะ", slug: "armor", icon_name: "Shield", order_index: 2, unit: findUnit("ตัว") },
              { name: "ยารักษา", slug: "medical", icon_name: "Heart", order_index: 3, unit: findUnit("ชิ้น") },
              { name: "กระสุน", slug: "ammo", icon_name: "Crosshair", order_index: 4, unit: findUnit("กล่อง") },
              { name: "ไอเทมพิเศษ", slug: "special", icon_name: "Award", order_index: 5, unit: findUnit("อัน") },
            ];
            seededCategories = await catRepo.save(catRepo.create(defaultCategories));
          } else {
            seededCategories = await catRepo.find();
          }

          // Seed main items table if empty
          const itemRepo = dataSourceInstance.getRepository(Item);
          const itemCount = await itemRepo.count();

          let seededItems: Item[] = [];
          if (itemCount === 0) {
            console.log("🌱 Seeding main items table in Supabase...");
            const rifleCat = seededCategories.find(c => c.slug === "rifle") || seededCategories[0];
            const armorCat = seededCategories.find(c => c.slug === "armor") || seededCategories[0];
            const medicalCat = seededCategories.find(c => c.slug === "medical") || seededCategories[0];
            const specialCat = seededCategories.find(c => c.slug === "special") || seededCategories[0];

            const defaultItems = [
              { name: "AWP Sniper Rifle", category: rifleCat, image_url: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=150" },
              { name: "M4A1 Assault Rifle", category: rifleCat, image_url: "https://images.unsplash.com/photo-1608889174636-234cf745037d?w=150" },
              { name: "Military Bulletproof Vest", category: armorCat, image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150" },
              { name: "Large Medkit", category: medicalCat, image_url: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=150" },
              { name: "Night Vision Goggles", category: specialCat, image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150" },
            ];
            seededItems = await itemRepo.save(itemRepo.create(defaultItems));
          } else {
            seededItems = await itemRepo.find();
          }

          // Seed Price logs if empty
          const priceRepo = dataSourceInstance.getRepository(Price);
          const priceCount = await priceRepo.count();

          if (priceCount === 0) {
            console.log("🌱 Seeding default historical prices into Supabase...");
            const awp = seededItems.find(i => i.name.includes("AWP"));
            const m4 = seededItems.find(i => i.name.includes("M4A1"));
            const vest = seededItems.find(i => i.name.includes("Vest"));
            const medkit = seededItems.find(i => i.name.includes("Medkit"));

            const defaultPrices = [];
            const now = new Date();

            if (awp) {
              defaultPrices.push(
                { item: awp, lowPrice: 4000, highPrice: 4300, avgPrice: 4100, source: "Facebook กลุ่ม A", note: "ช่วงราคารุ่นประหยัด", recordedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
                { item: awp, lowPrice: 4200, highPrice: 4500, avgPrice: 4300, source: "Facebook กลุ่ม A", note: "คนขายเริ่มกักตุน", recordedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
                { item: awp, lowPrice: 4300, highPrice: 4600, avgPrice: 4450, source: "Discord Server X", note: "กระแสปืนแรงขึ้น", recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
                { item: awp, lowPrice: 4400, highPrice: 4800, avgPrice: 4600, source: "Discord Server X", note: "ราคาดีที่สุดสัปดาห์นี้", recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
                { item: awp, lowPrice: 4500, highPrice: 4900, avgPrice: 4700, source: "กลุ่มทางการ", note: "อัปเดตราคาล่าสุดวันนี้", recordedAt: now },
              );
            }

            if (m4) {
              defaultPrices.push(
                { item: m4, lowPrice: 2000, highPrice: 2300, avgPrice: 2150, source: "กลุ่มทางการ", note: "ราคาตลาดปกติ", recordedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
                { item: m4, lowPrice: 2100, highPrice: 2400, avgPrice: 2200, source: "Discord Server Y", note: "มีความต้องการเพิ่ม", recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
                { item: m4, lowPrice: 2200, highPrice: 2500, avgPrice: 2350, source: "Facebook กลุ่ม B", note: "อัปเดตราคาช่วงค่ำ", recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
                { item: m4, lowPrice: 2200, highPrice: 2600, avgPrice: 2400, source: "กลุ่มทางการ", note: "ราคาปรับขึ้นเล็กน้อย", recordedAt: now },
              );
            }

            if (vest) {
              defaultPrices.push(
                { item: vest, lowPrice: 1000, highPrice: 1200, avgPrice: 1100, source: "Facebook กลุ่ม A", note: "เกราะหาง่าย", recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
                { item: vest, lowPrice: 1100, highPrice: 1300, avgPrice: 1180, source: "Discord Server X", note: "อัปเดตรายวัน", recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
                { item: vest, lowPrice: 1150, highPrice: 1400, avgPrice: 1250, source: "กลุ่มทางการ", note: "มีความคุ้มราคา", recordedAt: now },
              );
            }

            if (medkit) {
              defaultPrices.push(
                { item: medkit, lowPrice: 80, highPrice: 120, avgPrice: 100, source: "FB ซื้อขาย", note: "ขายปลีก 1 ชิ้นปกติ", unitQuantity: 1, isBulk: false, recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
                { item: medkit, lowPrice: 4000, highPrice: 5000, avgPrice: 4500, source: "Discord คลังกลาง", note: "ยกล็อต 50 ชิ้นสุดคุ้ม (ตกชิ้นละ 90 GC)", unitQuantity: 50, isBulk: true, recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
                { item: medkit, lowPrice: 7500, highPrice: 8500, avgPrice: 8000, source: "กลุ่มทางการ", note: "ขายส่ง 100 ชิ้นประหยัดมาก (ตกชิ้นละ 80 GC)", unitQuantity: 100, isBulk: true, recordedAt: now },
              );
            }

            await priceRepo.save(priceRepo.create(defaultPrices));
            console.log("🌿 Prices historical logs seeded successfully!");
          }

          return dataSourceInstance;
        })
        .catch((err) => {
          console.error("❌ Failed to initialize TypeORM connection:", err);
          globalThis.dbDataSource = undefined;
          globalThis.dbInitPromise = undefined; // reset so we can retry on next request
          throw err;
        });
    }
    await globalThis.dbInitPromise;
  }

  return globalThis.dbDataSource;
}
