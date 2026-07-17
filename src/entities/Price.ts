import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Item } from "./Item";

@Entity({ name: "prices" })
@Index(["item", "recordedAt"]) // Compound index for the most common query
export class Price {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // ManyToOne relation referencing the registered main Item
  @Index()
  @ManyToOne(() => Item, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "item_id" })
  item!: Item;

  @Column({ type: "float", name: "low_price" })
  lowPrice!: number;

  @Column({ type: "float", name: "high_price" })
  highPrice!: number;

  @Column({ type: "float", name: "avg_price" })
  avgPrice!: number;

  @Column({ type: "varchar", length: 255 })
  source!: string;

  @Column({ type: "text", nullable: true })
  note?: string;

  @Column({ type: "timestamp with time zone", name: "recorded_at" })
  recordedAt!: Date;

  @Column({ type: "integer", name: "unit_quantity", default: 1 })
  unitQuantity!: number;

  @Column({ type: "boolean", name: "is_bulk", default: false })
  isBulk!: boolean;

  @CreateDateColumn({ type: "timestamp with time zone", name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
Object.defineProperty(Price, "name", { value: "Price", configurable: true });

