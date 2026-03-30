import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ProductVariant } from "./ProductVariant";

@Entity("pricing_tiers")
export class PricingTier {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("int")
  minQuantity!: number;

  @Column("int")
  maxQuantity!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  pricePerUnit!: number;

  @ManyToOne(() => ProductVariant, (v) => v.pricingTiers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "variantId" })
  variant!: ProductVariant;

  @Column("uuid")
  variantId!: string;
}
