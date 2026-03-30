import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Cart } from "./Cart";

@Entity("cart_items")
export class CartItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  variantId!: string;

  @Column("int")
  quantity!: number;

  @Column("varchar", { nullable: true })
  customPhotoUrl!: string | null;

  @Column("varchar", { nullable: true })
  personalizationText!: string | null;

  @Column("jsonb", { nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => Cart, (c) => c.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cartId" })
  cart!: Cart;

  @Column("uuid")
  cartId!: string;
}
