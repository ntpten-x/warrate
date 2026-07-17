import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "units" })
export class Unit {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  name!: string;

  @CreateDateColumn({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP", name: "created_at" })
  createdAt!: Date;
}
Object.defineProperty(Unit, "name", { value: "Unit", configurable: true });

