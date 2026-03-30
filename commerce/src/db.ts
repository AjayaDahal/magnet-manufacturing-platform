import { DataSource } from "typeorm";
import { Product } from "./entities/Product";
import { ProductVariant } from "./entities/ProductVariant";
import { PricingTier } from "./entities/PricingTier";
import { Tenant } from "./entities/Tenant";
import { Cart } from "./entities/Cart";
import { CartItem } from "./entities/CartItem";
import { Order } from "./entities/Order";
import { OrderItem } from "./entities/OrderItem";
import { BulkOrder } from "./entities/BulkOrder";
import { BulkOrderLine } from "./entities/BulkOrderLine";

export const db = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).hostname
    : "localhost",
  port: process.env.DATABASE_URL
    ? parseInt(new URL(process.env.DATABASE_URL).port || "5433")
    : 5433,
  username: process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).username
    : "magnet",
  password: process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).password
    : "magnet_dev",
  database: process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).pathname.slice(1)
    : "magnet_platform",
  synchronize: false,
  logging: process.env.NODE_ENV !== "production",
  entities: [
    Product,
    ProductVariant,
    PricingTier,
    Tenant,
    Cart,
    CartItem,
    Order,
    OrderItem,
    BulkOrder,
    BulkOrderLine,
  ],
  migrations: ["src/migrations/*.ts"],
  migrationsRun: false,
});
