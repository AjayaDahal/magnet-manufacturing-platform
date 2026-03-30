import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { BulkOrderLine } from "./BulkOrderLine";

export enum BulkOrderStatus {
  UPLOADED = "uploaded",
  VALIDATING = "validating",
  VALIDATED = "validated",
  PROCESSING = "processing",
  COMPLETE = "complete",
  FAILED = "failed",
}

@Entity("bulk_orders")
export class BulkOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid", { nullable: true })
  tenantId!: string | null;

  @Column("varchar")
  email!: string;

  @Column("varchar")
  originalFilename!: string;

  @Column({ type: "enum", enum: BulkOrderStatus, default: BulkOrderStatus.UPLOADED })
  status!: BulkOrderStatus;

  @Column("int", { default: 0 })
  totalLines!: number;

  @Column("int", { default: 0 })
  validLines!: number;

  @Column("int", { default: 0 })
  errorLines!: number;

  @Column("jsonb", { nullable: true })
  errors!: Array<{ line: number; message: string }> | null;

  @Column("decimal", { precision: 12, scale: 2, nullable: true })
  estimatedTotal!: number | null;

  @OneToMany(() => BulkOrderLine, (l) => l.bulkOrder, { cascade: true })
  lines!: BulkOrderLine[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
