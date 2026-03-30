import { Router, Request, Response } from "express";
import multer from "multer";
import { parse } from "csv-parse";
import { Readable } from "stream";
import { db } from "../db";
import { BulkOrder, BulkOrderStatus } from "../entities/BulkOrder";
import { BulkOrderLine } from "../entities/BulkOrderLine";
import { ProductVariant } from "../entities/ProductVariant";

export const bulkOrderRoutes = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

interface CsvRow {
  name: string;
  photo_url: string;
  quantity: string;
  size: string;
  finish?: string;
}

const VALID_SIZES = ["2x3", "3x4", "4x6", "5x7", "8x10"];

function parseCsvBuffer(buffer: Buffer): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        })
      )
      .on("data", (row: CsvRow) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// Upload CSV for bulk order
bulkOrderRoutes.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { email, tenantId } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const rows = await parseCsvBuffer(req.file.buffer);
    if (rows.length === 0) return res.status(400).json({ error: "CSV is empty" });

    // Create bulk order
    const bulkOrder = db.getRepository(BulkOrder).create({
      email,
      tenantId: tenantId || null,
      originalFilename: req.file.originalname,
      status: BulkOrderStatus.VALIDATING,
      totalLines: rows.length,
    });

    const savedOrder = await db.getRepository(BulkOrder).save(bulkOrder);

    // Validate and create lines
    const errors: Array<{ line: number; message: string }> = [];
    let validCount = 0;
    let estimatedTotal = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNumber = i + 1;
      const lineErrors: string[] = [];

      if (!row.name?.trim()) lineErrors.push("Missing name");
      const qty = parseInt(row.quantity, 10);
      if (isNaN(qty) || qty < 1) lineErrors.push("Invalid quantity");
      if (!row.size || !VALID_SIZES.includes(row.size.trim()))
        lineErrors.push(`Invalid size. Valid: ${VALID_SIZES.join(", ")}`);

      const isValid = lineErrors.length === 0;

      // Look up pricing if valid
      let unitPrice: number | null = null;
      if (isValid) {
        const variant = await db.getRepository(ProductVariant).findOne({
          where: { size: row.size.trim() as any, active: true },
          relations: ["pricingTiers"],
        });
        if (variant) {
          const tier = variant.pricingTiers
            .sort((a, b) => b.minQuantity - a.minQuantity)
            .find((t) => qty >= t.minQuantity && qty <= t.maxQuantity);
          unitPrice = tier ? Number(tier.pricePerUnit) : Number(variant.basePrice);
          estimatedTotal += unitPrice * qty;
        }
      }

      if (!isValid) {
        errors.push({ line: lineNumber, message: lineErrors.join("; ") });
      } else {
        validCount++;
      }

      const line = db.getRepository(BulkOrderLine).create({
        bulkOrderId: savedOrder.id,
        recipientName: row.name?.trim() || "",
        photoUrl: row.photo_url?.trim() || null,
        quantity: isNaN(qty) ? 0 : qty,
        size: row.size?.trim() || "",
        finish: row.finish?.trim() || null,
        lineNumber,
        valid: isValid,
        errorMessage: isValid ? null : lineErrors.join("; "),
        unitPrice,
      });

      await db.getRepository(BulkOrderLine).save(line);
    }

    // Update bulk order with validation results
    savedOrder.status = errors.length === 0 ? BulkOrderStatus.VALIDATED : BulkOrderStatus.VALIDATED;
    savedOrder.validLines = validCount;
    savedOrder.errorLines = errors.length;
    savedOrder.errors = errors.length > 0 ? errors : null;
    savedOrder.estimatedTotal = estimatedTotal;

    await db.getRepository(BulkOrder).save(savedOrder);

    res.status(201).json({
      bulkOrder: savedOrder,
      summary: {
        total: rows.length,
        valid: validCount,
        errors: errors.length,
        estimatedTotal,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to process bulk order", detail: String(err) });
  }
});

// Get bulk order status
bulkOrderRoutes.get("/:id", async (req: Request, res: Response) => {
  try {
    const order = await db.getRepository(BulkOrder).findOne({
      where: { id: req.params.id },
      relations: ["lines"],
    });
    if (!order) return res.status(404).json({ error: "Bulk order not found" });
    res.json({ bulkOrder: order });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bulk order", detail: String(err) });
  }
});

// List bulk orders for a tenant/email
bulkOrderRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const { tenantId, email } = req.query;
    const qb = db
      .getRepository(BulkOrder)
      .createQueryBuilder("bo")
      .orderBy("bo.createdAt", "DESC");

    if (tenantId) qb.andWhere("bo.tenantId = :tenantId", { tenantId });
    if (email) qb.andWhere("bo.email = :email", { email });

    const orders = await qb.getMany();
    res.json({ bulkOrders: orders });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bulk orders", detail: String(err) });
  }
});

// Confirm/process a validated bulk order
bulkOrderRoutes.post("/:id/confirm", async (req: Request, res: Response) => {
  try {
    const order = await db.getRepository(BulkOrder).findOne({
      where: { id: req.params.id },
    });
    if (!order) return res.status(404).json({ error: "Bulk order not found" });
    if (order.status !== BulkOrderStatus.VALIDATED) {
      return res.status(400).json({ error: "Order must be validated before confirmation" });
    }

    order.status = BulkOrderStatus.PROCESSING;
    await db.getRepository(BulkOrder).save(order);

    res.json({ bulkOrder: order, message: "Order confirmed and processing" });
  } catch (err) {
    res.status(500).json({ error: "Failed to confirm order", detail: String(err) });
  }
});
