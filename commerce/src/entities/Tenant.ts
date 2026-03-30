import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("tenants")
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  @Column("text", { nullable: true })
  logoUrl!: string | null;

  @Column("jsonb", { nullable: true })
  brandingConfig!: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  } | null;

  @Column("text", { nullable: true })
  contactEmail!: string | null;

  @Column({ default: true })
  active!: boolean;

  @Column("jsonb", { nullable: true })
  settings!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
