import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Order } from "./Order";

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  variantId!: string;

  @Column("int")
  quantity!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  unitPrice!: number;

  @Column("decimal", { precision: 12, scale: 2 })
  totalPrice!: number;

  @Column("varchar", { nullable: true })
  customPhotoUrl!: string | null;

  @Column("varchar", { nullable: true })
  personalizationText!: string | null;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order!: Order;

  @Column("uuid")
  orderId!: string;
}
