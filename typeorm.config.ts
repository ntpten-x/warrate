import { DataSource } from "typeorm";
import { config } from "dotenv";
import { MarketItem } from "./src/entities/MarketItem";
import { Item } from "./src/entities/Item";
import { Category } from "./src/entities/Category";
import { Price } from "./src/entities/Price";
import { Unit } from "./src/entities/Unit";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false, // Migrations should never synchronize automatically
  logging: true,
  entities: [MarketItem, Item, Category, Price, Unit],
  migrations: ["src/migrations/**/*.ts"],
});
