import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { ProductVariant } from "./ProductVariant";

export enum MagnetShape {
  RECTANGLE = "rectangle",
  CIRCLE = "circle",
  SQUARE = "square",
  OVAL = "oval",
  HEART = "heart",
  CUSTOM = "custom",
}

export enum MagnetMaterial {
  FLEXIBLE = "flexible",
  RIGID = "rigid",
  VINYL = "vinyl",
  PHOTO_PAPER = "photo_paper",
  UV_COATED = "uv_coated",
}

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column("text")
  description!: string;

  @Column({ type: "enum", enum: MagnetShape })
  shape!: MagnetShape;

  @Column({ type: "enum", enum: MagnetMaterial })
  material!: MagnetMaterial;

  @Column("varchar", { nullable: true })
  thumbnail!: string | null;

  @Column("simple-array", { nullable: true })
  images!: string[];

  @Column("uuid", { nullable: true })
  tenantId!: string | null;

  @Column({ default: true })
  active!: boolean;

  @Column("jsonb", { nullable: true })
  metadata!: Record<string, unknown> | null;

  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: true })
  variants!: ProductVariant[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
