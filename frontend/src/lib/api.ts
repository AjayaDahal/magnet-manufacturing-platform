import * as db from "./firebase-db";

export const api = {
  products: {
    list: async (params?: Record<string, string>) => {
      const products = await db.listProducts(params);
      return { products };
    },
    get: async (id: string) => {
      const product = await db.getProduct(id);
      if (!product) throw new Error("Product not found");
      return { product };
    },
    getPrice: async (productId: string, variantId: string, quantity: number) => {
      const product = await db.getProduct(productId);
      if (!product) throw new Error("Product not found");
      return db.getPrice(product, variantId, quantity);
    },
  },

  cart: {
    create: async (tenantId?: string) => {
      const cart = await db.createCart(tenantId);
      return { cart };
    },
    get: async (id: string) => {
      const cart = await db.getCart(id);
      if (!cart) throw new Error("Cart not found");
      return { cart };
    },
    addItem: async (cartId: string, data: { variantId: string; quantity: number; customPhotoUrl?: string; personalizationText?: string }) => {
      const item = await db.addCartItem(cartId, data);
      return { item };
    },
    updateItem: async (cartId: string, itemId: string, quantity: number) => {
      const item = await db.updateCartItem(cartId, itemId, quantity);
      return { item };
    },
    removeItem: async (cartId: string, itemId: string) => {
      const success = await db.removeCartItem(cartId, itemId);
      return { success };
    },
  },

  checkout: {
    create: async (data: { cartId: string; email: string; shippingAddress?: Record<string, string> }) => {
      const order = await db.createOrder(data);
      return { order };
    },
    getOrder: async (id: string) => {
      const order = await db.getOrder(id);
      if (!order) throw new Error("Order not found");
      return { order };
    },
    listOrders: async (params?: Record<string, string>) => {
      const orders = await db.listOrders(params);
      return { orders };
    },
  },

  bulkOrders: {
    upload: async (file: File, email: string, tenantId?: string) => {
      // Parse CSV client-side
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const header = lines.shift()!.split(",").map((h) => h.trim().toLowerCase());

      const parsed = lines.map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        const row: Record<string, string> = {};
        header.forEach((h, i) => (row[h] = cols[i] || ""));
        return {
          recipientName: row["name"] || row["recipient_name"] || "",
          photoUrl: row["photo_url"] || row["photo"] || undefined,
          quantity: parseInt(row["quantity"] || "1", 10),
          size: row["size"] || "medium",
          finish: row["finish"] || undefined,
        };
      });

      return db.createBulkOrder({
        email,
        lines: parsed,
        originalFilename: file.name,
        tenantId,
      });
    },
    get: async (id: string) => {
      const bulkOrder = await db.getBulkOrder(id);
      if (!bulkOrder) throw new Error("Bulk order not found");
      return { bulkOrder };
    },
    list: async (params?: Record<string, string>) => {
      const bulkOrders = await db.listBulkOrders(params);
      return { bulkOrders };
    },
    confirm: async (id: string) => {
      const bulkOrder = await db.confirmBulkOrder(id);
      if (!bulkOrder) throw new Error("Bulk order not found");
      return { bulkOrder };
    },
  },

  uploads: {
    photo: async (file: File) => {
      // For static site without backend, convert to data URL
      return new Promise<{ url: string; filename: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result as string, filename: file.name });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
  },
};
