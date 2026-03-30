import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCa7-wCmSNqh9hH6qZyaBA_gmCEJKAJV5A",
  authDomain: "magnet-manufacturing.firebaseapp.com",
  databaseURL: "https://magnet-manufacturing-default-rtdb.firebaseio.com",
  projectId: "magnet-manufacturing",
  storageBucket: "magnet-manufacturing.firebasestorage.app",
  messagingSenderId: "316772664262",
  appId: "1:316772664262:web:cb6213a07949d1684da8c7",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Mirror the seed data from commerce/src/seed.ts
const shapes = ["rectangle", "circle", "rectangle", "heart"] as const;
const materials = ["flexible", "flexible", "uv_coated", "photo_paper"] as const;

const productDefs = [
  {
    name: "Custom Photo Magnet - Rectangle",
    description: "High-quality rectangular photo magnet. Upload your photo and we'll print it on a durable, flexible magnet.",
    shape: "rectangle",
    material: "flexible",
  },
  {
    name: "Circle Photo Magnet",
    description: "Round photo magnets perfect for portraits and headshots.",
    shape: "circle",
    material: "flexible",
  },
  {
    name: "Premium UV-Coated Magnet",
    description: "UV-coated magnets with extra durability and vibrant colors. Weather-resistant for outdoor use.",
    shape: "rectangle",
    material: "uv_coated",
  },
  {
    name: "Heart-Shaped Photo Magnet",
    description: "Heart-shaped magnets perfect for gifts and special occasions.",
    shape: "heart",
    material: "photo_paper",
  },
];

const sizes = [
  { size: "mini", width: 2, height: 3, base: 3.99 },
  { size: "small", width: 3, height: 4, base: 5.99 },
  { size: "medium", width: 4, height: 6, base: 8.99 },
  { size: "large", width: 5, height: 7, base: 12.99 },
  { size: "xlarge", width: 8, height: 10, base: 19.99 },
];

const finishes = ["glossy", "matte", "satin"];

const tierDefs = [
  { min: 1, max: 9, discount: 0 },
  { min: 10, max: 49, discount: 0.1 },
  { min: 50, max: 99, discount: 0.2 },
  { min: 100, max: 499, discount: 0.3 },
  { min: 500, max: 999, discount: 0.4 },
  { min: 1000, max: 99999, discount: 0.5 },
];

async function seed() {
  console.log("Seeding Firebase RTDB...");

  const products: Record<string, any> = {};
  let prodIdx = 0;

  for (const p of productDefs) {
    prodIdx++;
    const productId = `product-${prodIdx}`;
    const variants: any[] = [];
    let varIdx = 0;

    for (const s of sizes) {
      for (const f of finishes) {
        varIdx++;
        const finishMul = f === "satin" ? 1.15 : f === "matte" ? 1.05 : 1.0;
        const matMul = p.material === "uv_coated" ? 1.5 : p.material === "photo_paper" ? 1.2 : 1.0;
        const basePrice = +(s.base * finishMul * matMul).toFixed(2);

        const variantId = `${productId}-var-${varIdx}`;
        const pricingTiers = tierDefs.map((t, ti) => ({
          id: `${variantId}-tier-${ti + 1}`,
          minQuantity: t.min,
          maxQuantity: t.max,
          pricePerUnit: +(basePrice * (1 - t.discount)).toFixed(2),
          variantId,
        }));

        variants.push({
          id: variantId,
          sku: `MAG-${p.shape.toUpperCase().slice(0, 3)}-${s.size}-${f.toUpperCase().slice(0, 3)}`,
          size: s.size,
          finish: f,
          basePrice,
          widthInches: s.width,
          heightInches: s.height,
          thicknessMm: 1.5,
          inventoryQuantity: 1000,
          active: true,
          productId,
          pricingTiers,
        });
      }
    }

    products[productId] = {
      id: productId,
      name: p.name,
      description: p.description,
      shape: p.shape,
      material: p.material,
      thumbnail: null,
      images: [],
      tenantId: "demo-magnets",
      active: true,
      metadata: null,
      variants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  await set(ref(database, "products"), products);
  console.log(`Seeded ${Object.keys(products).length} products with variants and pricing tiers.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
