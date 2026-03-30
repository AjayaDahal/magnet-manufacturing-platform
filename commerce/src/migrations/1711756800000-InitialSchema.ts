import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1711756800000 implements MigrationInterface {
  name = "InitialSchema1711756800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE magnet_shape AS ENUM ('rectangle','circle','square','oval','heart','custom');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE magnet_material AS ENUM ('flexible','rigid','vinyl','photo_paper','uv_coated');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE magnet_size AS ENUM ('2x3','3x4','4x6','5x7','8x10','custom');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE magnet_finish AS ENUM ('matte','glossy','satin','soft_touch');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE bulk_order_status AS ENUM ('uploaded','validating','validated','processing','complete','failed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // Tenants
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR UNIQUE NOT NULL,
        name VARCHAR NOT NULL,
        "logoUrl" TEXT,
        "brandingConfig" JSONB,
        "contactEmail" TEXT,
        active BOOLEAN DEFAULT true,
        settings JSONB,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // Products
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        description TEXT NOT NULL,
        shape magnet_shape NOT NULL,
        material magnet_material NOT NULL,
        thumbnail VARCHAR,
        images TEXT,
        "tenantId" UUID REFERENCES tenants(id) ON DELETE SET NULL,
        active BOOLEAN DEFAULT true,
        metadata JSONB,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // Product Variants
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR NOT NULL,
        size magnet_size NOT NULL,
        finish magnet_finish NOT NULL,
        "basePrice" DECIMAL(10,2) NOT NULL,
        "widthInches" DECIMAL(4,2),
        "heightInches" DECIMAL(4,2),
        "thicknessMm" DECIMAL(4,2),
        "inventoryQuantity" INT DEFAULT 0,
        active BOOLEAN DEFAULT true,
        "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // Pricing Tiers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pricing_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "minQuantity" INT NOT NULL,
        "maxQuantity" INT NOT NULL,
        "pricePerUnit" DECIMAL(10,2) NOT NULL,
        "variantId" UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE
      );
    `);

    // Carts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" UUID,
        email VARCHAR,
        "shippingAddress" JSONB,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // Cart Items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "variantId" UUID NOT NULL,
        quantity INT NOT NULL,
        "customPhotoUrl" VARCHAR,
        "personalizationText" VARCHAR,
        metadata JSONB,
        "cartId" UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE
      );
    `);

    // Orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" UUID,
        email VARCHAR NOT NULL,
        status order_status DEFAULT 'pending',
        "totalAmount" DECIMAL(12,2) NOT NULL,
        "shippingAddress" JSONB,
        "billingAddress" JSONB,
        "trackingNumber" VARCHAR,
        "invoiceNumber" VARCHAR,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // Order Items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "variantId" UUID NOT NULL,
        quantity INT NOT NULL,
        "unitPrice" DECIMAL(10,2) NOT NULL,
        "totalPrice" DECIMAL(12,2) NOT NULL,
        "customPhotoUrl" VARCHAR,
        "personalizationText" VARCHAR,
        "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE
      );
    `);

    // Bulk Orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bulk_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" UUID,
        email VARCHAR NOT NULL,
        "originalFilename" VARCHAR NOT NULL,
        status bulk_order_status DEFAULT 'uploaded',
        "totalLines" INT DEFAULT 0,
        "validLines" INT DEFAULT 0,
        "errorLines" INT DEFAULT 0,
        errors JSONB,
        "estimatedTotal" DECIMAL(12,2),
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // Bulk Order Lines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bulk_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipientName" VARCHAR NOT NULL,
        "photoUrl" VARCHAR,
        quantity INT NOT NULL,
        size VARCHAR NOT NULL,
        finish VARCHAR,
        "lineNumber" INT NOT NULL,
        valid BOOLEAN DEFAULT true,
        "errorMessage" VARCHAR,
        "unitPrice" DECIMAL(10,2),
        "bulkOrderId" UUID NOT NULL REFERENCES bulk_orders(id) ON DELETE CASCADE
      );
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant ON products("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_shape ON products(shape);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants("productId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bulk_orders_email ON bulk_orders(email);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS bulk_order_lines CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS bulk_orders CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS order_items CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS orders CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS cart_items CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS carts CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS pricing_tiers CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS product_variants CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS products CASCADE;");
    await queryRunner.query("DROP TABLE IF EXISTS tenants CASCADE;");
    await queryRunner.query("DROP TYPE IF EXISTS bulk_order_status;");
    await queryRunner.query("DROP TYPE IF EXISTS order_status;");
    await queryRunner.query("DROP TYPE IF EXISTS magnet_finish;");
    await queryRunner.query("DROP TYPE IF EXISTS magnet_size;");
    await queryRunner.query("DROP TYPE IF EXISTS magnet_material;");
    await queryRunner.query("DROP TYPE IF EXISTS magnet_shape;");
  }
}
