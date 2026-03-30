import "dotenv/config";
import { db } from "./db";
import { Product, MagnetShape, MagnetMaterial } from "./entities/Product";
import { ProductVariant, MagnetSize, MagnetFinish } from "./entities/ProductVariant";
import { PricingTier } from "./entities/PricingTier";
import { Tenant } from "./entities/Tenant";

async function seed() {
  await db.initialize();
  console.log("Seeding database...");

  // Create demo tenant
  const tenant = db.getRepository(Tenant).create({
    slug: "demo-magnets",
    name: "Demo Magnet Co",
    brandingConfig: { primaryColor: "#2563eb", secondaryColor: "#f59e0b" },
    contactEmail: "demo@magnetco.example",
  });
  const savedTenant = await db.getRepository(Tenant).save(tenant);

  // Create products
  const products = [
    {
      name: "Custom Photo Magnet - Rectangle",
      description: "High-quality rectangular photo magnet. Upload your photo and we'll print it on a durable, flexible magnet.",
      shape: MagnetShape.RECTANGLE,
      material: MagnetMaterial.FLEXIBLE,
      tenantId: savedTenant.id,
    },
    {
      name: "Circle Photo Magnet",
      description: "Round photo magnets perfect for portraits and headshots.",
      shape: MagnetShape.CIRCLE,
      material: MagnetMaterial.FLEXIBLE,
      tenantId: savedTenant.id,
    },
    {
      name: "Premium UV-Coated Magnet",
      description: "UV-coated magnets with extra durability and vibrant colors. Weather-resistant for outdoor use.",
      shape: MagnetShape.RECTANGLE,
      material: MagnetMaterial.UV_COATED,
      tenantId: savedTenant.id,
    },
    {
      name: "Heart-Shaped Photo Magnet",
      description: "Heart-shaped magnets perfect for gifts and special occasions.",
      shape: MagnetShape.HEART,
      material: MagnetMaterial.PHOTO_PAPER,
      tenantId: savedTenant.id,
    },
  ];

  const sizes: Array<{ size: MagnetSize; width: number; height: number; base: number }> = [
    { size: MagnetSize.MINI, width: 2, height: 3, base: 3.99 },
    { size: MagnetSize.SMALL, width: 3, height: 4, base: 5.99 },
    { size: MagnetSize.MEDIUM, width: 4, height: 6, base: 8.99 },
    { size: MagnetSize.LARGE, width: 5, height: 7, base: 12.99 },
    { size: MagnetSize.XLARGE, width: 8, height: 10, base: 19.99 },
  ];

  const finishes = [MagnetFinish.GLOSSY, MagnetFinish.MATTE, MagnetFinish.SATIN];

  for (const p of products) {
    const product = db.getRepository(Product).create(p);
    const savedProduct = await db.getRepository(Product).save(product);

    for (const s of sizes) {
      for (const f of finishes) {
        const finishMultiplier = f === MagnetFinish.SATIN ? 1.15 : f === MagnetFinish.MATTE ? 1.05 : 1.0;
        const materialMultiplier = p.material === MagnetMaterial.UV_COATED ? 1.5 : p.material === MagnetMaterial.PHOTO_PAPER ? 1.2 : 1.0;
        const basePrice = +(s.base * finishMultiplier * materialMultiplier).toFixed(2);

        const variant = db.getRepository(ProductVariant).create({
          sku: `MAG-${p.shape.toUpperCase().slice(0, 3)}-${s.size}-${f.toUpperCase().slice(0, 3)}`,
          size: s.size,
          finish: f,
          basePrice,
          widthInches: s.width,
          heightInches: s.height,
          thicknessMm: 1.5,
          inventoryQuantity: 1000,
          productId: savedProduct.id,
        });

        const savedVariant = await db.getRepository(ProductVariant).save(variant);

        // Pricing tiers
        const tiers = [
          { min: 1, max: 9, discount: 0 },
          { min: 10, max: 49, discount: 0.10 },
          { min: 50, max: 99, discount: 0.20 },
          { min: 100, max: 499, discount: 0.30 },
          { min: 500, max: 999, discount: 0.40 },
          { min: 1000, max: 99999, discount: 0.50 },
        ];

        for (const t of tiers) {
          const tier = db.getRepository(PricingTier).create({
            minQuantity: t.min,
            maxQuantity: t.max,
            pricePerUnit: +(basePrice * (1 - t.discount)).toFixed(2),
            variantId: savedVariant.id,
          });
          await db.getRepository(PricingTier).save(tier);
        }
      }
    }
  }

  console.log("Seed complete!");
  await db.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
