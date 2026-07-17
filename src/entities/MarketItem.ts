import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "market_items" })
export class MarketItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 100 })
  category!: string;

  @Column({ type: "int" })
  priceGC!: number;

  @Column({ type: "double precision" })
  priceUSD!: number;

  @Column({ type: "int" })
  stock!: number;
}
Object.defineProperty(MarketItem, "name", { value: "MarketItem", configurable: true });

