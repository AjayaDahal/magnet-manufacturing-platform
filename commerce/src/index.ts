import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { productRoutes } from "./routes/products";
import { bulkOrderRoutes } from "./routes/bulk-orders";
import { tenantRoutes } from "./routes/tenants";
import { cartRoutes } from "./routes/cart";
import { checkoutRoutes } from "./routes/checkout";
import { uploadRoutes } from "./routes/uploads";
import { db } from "./db";

const app = express();
const PORT = parseInt(process.env.PORT || "9000", 10);

app.use(cors({ origin: process.env.STORE_CORS?.split(",") || "*" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "magnet-commerce" });
});

// API routes
app.use("/api/products", productRoutes);
app.use("/api/bulk-orders", bulkOrderRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/uploads", uploadRoutes);

async function start() {
  await db.initialize();
  console.log("Database connected");

  await db.runMigrations();
  console.log("Migrations complete");

  app.listen(PORT, () => {
    console.log(`Magnet Commerce API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});

export { app };
