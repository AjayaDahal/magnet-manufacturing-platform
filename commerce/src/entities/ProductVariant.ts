import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Product } from "./Product";
import { PricingTier } from "./PricingTier";

export enum MagnetSize {
  MINI = "2x3",
  SMALL = "3x4",
  MEDIUM = "4x6",
  LARGE = "5x7",
  XLARGE = "8x10",
  CUSTOM = "custom",
}

export enum MagnetFinish {
  MATTE = "matte",
  GLOSSY = "glossy",
  SATIN = "satin",
  SOFT_TOUCH = "soft_touch",
}

@Entity("product_variants")
export class ProductVariant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  sku!: string;

  @Column({ type: "enum", enum: MagnetSize })
  size!: MagnetSize;

  @Column({ type: "enum", enum: MagnetFinish })
  finish!: MagnetFinish;

  @Column("decimal", { precision: 10, scale: 2 })
  basePrice!: number;

  @Column("decimal", { precision: 4, scale: 2, nullable: true })
  widthInches!: number | null;

  @Column("decimal", { precision: 4, scale: 2, nullable: true })
  heightInches!: number | null;

  @Column("decimal", { precision: 4, scale: 2, nullable: true })
  thicknessMm!: number | null;

  @Column("int", { default: 0 })
  inventoryQuantity!: number;

  @Column({ default: true })
  active!: boolean;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: "CASCADE" })
  @JoinColumn({ name: "productId" })
  product!: Product;

  @Column("uuid")
  productId!: string;

  @OneToMany(() => PricingTier, (t) => t.variant, { cascade: true })
  pricingTiers!: PricingTier[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
