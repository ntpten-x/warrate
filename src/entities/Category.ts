import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Unit } from "./Unit";

@Entity({ name: "categories" })
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 100, unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  icon_name?: string;

  @Index()
  @Column({ type: "integer", default: 0 })
  order_index!: number;

  @ManyToOne(() => Unit, { eager: true, onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unit_id" })
  unit?: Unit | null;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", name: "created_at" })
  created_at!: Date;
}
