import { database } from "./firebase";
import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  child,
} from "firebase/database";
import type {
  Product,
  Cart,
  CartItem,
  Order,
  OrderItem,
  BulkOrder,
} from "@/types";

// ─── helpers ───────────────────────────────────────────────────────
function snap<T>(snapshot: Awaited<ReturnType<typeof get>>): T | null {
  return snapshot.exists() ? (snapshot.val() as T) : null;
}

function mapToArray<T extends { id: string }>(obj: Record<string, T> | null): T[] {
  if (!obj) return [];
  return Object.entries(obj).map(([key, val]) => ({ ...val, id: val.id ?? key }));
}

function generateId(): string {
  return push(ref(database)).key!;
}

// ─── products ──────────────────────────────────────────────────────
export async function listProducts(params?: Record<string, string>): Promise<Product[]> {
  const snapshot = await get(ref(database, "products"));
  let products = mapToArray<Product>(snap(snapshot));

  if (params?.tenantId) products = products.filter((p) => p.tenantId === params.tenantId);
  if (params?.shape) products = products.filter((p) => p.shape === params.shape);
  if (params?.material) products = products.filter((p) => p.material === params.material);
  if (params?.active !== undefined) products = products.filter((p) => p.active === (params.active === "true"));

  return products;
}

export async function getProduct(id: string): Promise<Product | null> {
  const snapshot = await get(ref(database, `products/${id}`));
  const data = snap<Product>(snapshot);
  return data ? { ...data, id } : null;
}

export function getPrice(
  product: Product,
  variantId: string,
  quantity: number
): { unitPrice: number; total: number; quantity: number; tiered: boolean } {
  const variant = product.variants?.find((v) => v.id === variantId);
  if (!variant) throw new Error("Variant not found");

  const tier = variant.pricingTiers
    ?.sort((a, b) => a.minQuantity - b.minQuantity)
    .find((t) => quantity >= t.minQuantity && quantity <= t.maxQuantity);

  const unitPrice = tier ? tier.pricePerUnit : variant.basePrice;
  return { unitPrice, total: +(unitPrice * quantity).toFixed(2), quantity, tiered: !!tier };
}

// ─── cart ───────────────────────────────────────────────────────────
export async function createCart(tenantId?: string): Promise<Cart> {
  const id = generateId();
  const cart: Cart = { id, tenantId: tenantId || null, email: null, items: [] };
  await set(ref(database, `carts/${id}`), cart);
  return cart;
}

export async function getCart(id: string): Promise<Cart | null> {
  const snapshot = await get(ref(database, `carts/${id}`));
  const data = snap<Cart>(snapshot);
  if (!data) return null;
  // items stored as object, normalize to array
  const items = data.items ? (Array.isArray(data.items) ? data.items : mapToArray<CartItem>(data.items as any)) : [];
  return { ...data, id, items };
}

export async function addCartItem(
  cartId: string,
  data: { variantId: string; quantity: number; customPhotoUrl?: string; personalizationText?: string }
): Promise<CartItem> {
  const itemId = generateId();
  const item: CartItem = {
    id: itemId,
    variantId: data.variantId,
    quantity: data.quantity,
    customPhotoUrl: data.customPhotoUrl || null,
    personalizationText: data.personalizationText || null,
    metadata: null,
    cartId,
  };
  await set(ref(database, `carts/${cartId}/items/${itemId}`), item);
  return item;
}

export async function updateCartItem(cartId: string, itemId: string, quantity: number): Promise<CartItem> {
  await update(ref(database, `carts/${cartId}/items/${itemId}`), { quantity });
  const snapshot = await get(ref(database, `carts/${cartId}/items/${itemId}`));
  return snap<CartItem>(snapshot)!;
}

export async function removeCartItem(cartId: string, itemId: string): Promise<boolean> {
  await remove(ref(database, `carts/${cartId}/items/${itemId}`));
  return true;
}

// ─── orders / checkout ─────────────────────────────────────────────
export async function createOrder(data: {
  cartId: string;
  email: string;
  shippingAddress?: Record<string, string>;
}): Promise<Order> {
  const cart = await getCart(data.cartId);
  if (!cart) throw new Error("Cart not found");

  // Resolve prices for each item
  const orderItems: OrderItem[] = [];
  let totalAmount = 0;

  for (const item of cart.items) {
    // look up product for this variant
    const allProducts = await listProducts();
    const product = allProducts.find((p) => p.variants?.some((v) => v.id === item.variantId));
    const variant = product?.variants?.find((v) => v.id === item.variantId);
    const unitPrice = variant?.basePrice ?? 0;
    const totalPrice = +(unitPrice * item.quantity).toFixed(2);
    totalAmount += totalPrice;

    orderItems.push({
      id: generateId(),
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      customPhotoUrl: item.customPhotoUrl,
      personalizationText: item.personalizationText,
    });
  }

  const id = generateId();
  const order: Order = {
    id,
    tenantId: cart.tenantId,
    email: data.email,
    status: "pending",
    totalAmount: +totalAmount.toFixed(2),
    shippingAddress: data.shippingAddress || null,
    trackingNumber: null,
    invoiceNumber: null,
    items: orderItems,
    createdAt: new Date().toISOString(),
  };

  await set(ref(database, `orders/${id}`), order);
  // Clear cart
  await remove(ref(database, `carts/${data.cartId}`));
  return order;
}

export async function getOrder(id: string): Promise<Order | null> {
  const snapshot = await get(ref(database, `orders/${id}`));
  const data = snap<Order>(snapshot);
  return data ? { ...data, id } : null;
}

export async function listOrders(params?: Record<string, string>): Promise<Order[]> {
  const snapshot = await get(ref(database, "orders"));
  let orders = mapToArray<Order>(snap(snapshot));
  if (params?.email) orders = orders.filter((o) => o.email === params.email);
  if (params?.status) orders = orders.filter((o) => o.status === params.status);
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─── bulk orders ───────────────────────────────────────────────────
export async function createBulkOrder(data: {
  email: string;
  lines: Array<{ recipientName: string; photoUrl?: string; quantity: number; size: string; finish?: string }>;
  originalFilename: string;
  tenantId?: string;
}): Promise<{ bulkOrder: BulkOrder; summary: { total: number; valid: number; errors: number; estimatedTotal: number } }> {
  const id = generateId();
  const validLines = data.lines.filter((l) => l.quantity > 0 && l.size);

  const bulkOrder: BulkOrder = {
    id,
    tenantId: data.tenantId || null,
    email: data.email,
    originalFilename: data.originalFilename,
    status: "pending",
    totalLines: data.lines.length,
    validLines: validLines.length,
    errorLines: data.lines.length - validLines.length,
    errors: null,
    estimatedTotal: null,
    createdAt: new Date().toISOString(),
  };

  await set(ref(database, `bulk-orders/${id}`), bulkOrder);
  return {
    bulkOrder,
    summary: {
      total: data.lines.length,
      valid: validLines.length,
      errors: data.lines.length - validLines.length,
      estimatedTotal: 0,
    },
  };
}

export async function getBulkOrder(id: string): Promise<BulkOrder | null> {
  const snapshot = await get(ref(database, `bulk-orders/${id}`));
  const data = snap<BulkOrder>(snapshot);
  return data ? { ...data, id } : null;
}

export async function listBulkOrders(params?: Record<string, string>): Promise<BulkOrder[]> {
  const snapshot = await get(ref(database, "bulk-orders"));
  let orders = mapToArray<BulkOrder>(snap(snapshot));
  if (params?.email) orders = orders.filter((o) => o.email === params.email);
  return orders;
}

export async function confirmBulkOrder(id: string): Promise<BulkOrder | null> {
  await update(ref(database, `bulk-orders/${id}`), { status: "confirmed" });
  return getBulkOrder(id);
}
