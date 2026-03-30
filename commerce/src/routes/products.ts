import { Router, Request, Response } from "express";
import { db } from "../db";
import { Product } from "../entities/Product";
import { ProductVariant } from "../entities/ProductVariant";
import { PricingTier } from "../entities/PricingTier";

export const productRoutes = Router();

// List products with optional tenant filtering
productRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const { tenantId, shape, material, active } = req.query;
    const repo = db.getRepository(Product);
    const qb = repo
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.variants", "variant")
      .leftJoinAndSelect("variant.pricingTiers", "tier");

    if (tenantId) qb.andWhere("product.tenantId = :tenantId", { tenantId });
    if (shape) qb.andWhere("product.shape = :shape", { shape });
    if (material) qb.andWhere("product.material = :material", { material });
    if (active !== undefined)
      qb.andWhere("product.active = :active", { active: active === "true" });

    qb.orderBy("product.createdAt", "DESC");

    const products = await qb.getMany();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products", detail: String(err) });
  }
});

// Get single product
productRoutes.get("/:id", async (req: Request, res: Response) => {
  try {
    const product = await db.getRepository(Product).findOne({
      where: { id: req.params.id },
      relations: ["variants", "variants.pricingTiers"],
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product", detail: String(err) });
  }
});

// Create product with variants and pricing tiers
productRoutes.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, shape, material, thumbnail, images, tenantId, variants, metadata } =
      req.body;

    const product = db.getRepository(Product).create({
      name,
      description,
      shape,
      material,
      thumbnail: thumbnail || null,
      images: images || [],
      tenantId: tenantId || null,
      metadata: metadata || null,
    });

    const saved = await db.getRepository(Product).save(product);

    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        const variant = db.getRepository(ProductVariant).create({
          ...v,
          productId: saved.id,
        });
        const savedVariant = await db.getRepository(ProductVariant).save(variant);

        if (v.pricingTiers && Array.isArray(v.pricingTiers)) {
          for (const t of v.pricingTiers) {
            const tier = db.getRepository(PricingTier).create({
              ...t,
              variantId: savedVariant.id,
            });
            await db.getRepository(PricingTier).save(tier);
          }
        }
      }
    }

    const full = await db.getRepository(Product).findOne({
      where: { id: saved.id },
      relations: ["variants", "variants.pricingTiers"],
    });

    res.status(201).json({ product: full });
  } catch (err) {
    res.status(500).json({ error: "Failed to create product", detail: String(err) });
  }
});

// Get price for a variant at a given quantity
productRoutes.get("/:id/price", async (req: Request, res: Response) => {
  try {
    const { variantId, quantity } = req.query;
    if (!variantId || !quantity) {
      return res.status(400).json({ error: "variantId and quantity required" });
    }

    const qty = parseInt(quantity as string, 10);
    const variant = await db.getRepository(ProductVariant).findOne({
      where: { id: variantId as string },
      relations: ["pricingTiers"],
    });

    if (!variant) return res.status(404).json({ error: "Variant not found" });

    // Find matching tier
    const tier = variant.pricingTiers
      .sort((a, b) => b.minQuantity - a.minQuantity)
      .find((t) => qty >= t.minQuantity && qty <= t.maxQuantity);

    const unitPrice = tier ? Number(tier.pricePerUnit) : Number(variant.basePrice);
    const total = unitPrice * qty;

    res.json({ unitPrice, total, quantity: qty, tiered: !!tier });
  } catch (err) {
    res.status(500).json({ error: "Failed to calculate price", detail: String(err) });
  }
});
