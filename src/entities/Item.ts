import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Category } from "./Category";

@Entity({ name: "items" })
export class Item {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  // ManyToOne relation to Category table, dynamically loading the category object (eager: true)
  @Index()
  @ManyToOne(() => Category, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "category_id" })
  category!: Category;

  @Column({ type: "text", nullable: true })
  image_url!: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;
}
