import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { BulkOrder } from "./BulkOrder";

@Entity("bulk_order_lines")
export class BulkOrderLine {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar")
  recipientName!: string;

  @Column("varchar", { nullable: true })
  photoUrl!: string | null;

  @Column("int")
  quantity!: number;

  @Column("varchar")
  size!: string;

  @Column("varchar", { nullable: true })
  finish!: string | null;

  @Column("int")
  lineNumber!: number;

  @Column("boolean", { default: true })
  valid!: boolean;

  @Column("varchar", { nullable: true })
  errorMessage!: string | null;

  @Column("decimal", { precision: 10, scale: 2, nullable: true })
  unitPrice!: number | null;

  @ManyToOne(() => BulkOrder, (b) => b.lines, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bulkOrderId" })
  bulkOrder!: BulkOrder;

  @Column("uuid")
  bulkOrderId!: string;
}
