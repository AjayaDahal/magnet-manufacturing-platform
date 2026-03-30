import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { OrderItem } from "./OrderItem";

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid", { nullable: true })
  tenantId!: string | null;

  @Column("varchar")
  email!: string;

  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column("decimal", { precision: 12, scale: 2 })
  totalAmount!: number;

  @Column("jsonb", { nullable: true })
  shippingAddress!: Record<string, string> | null;

  @Column("jsonb", { nullable: true })
  billingAddress!: Record<string, string> | null;

  @Column("varchar", { nullable: true })
  trackingNumber!: string | null;

  @Column("varchar", { nullable: true })
  invoiceNumber!: string | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items!: OrderItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
