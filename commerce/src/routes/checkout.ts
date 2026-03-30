import { Router, Request, Response } from "express";
import { db } from "../db";
import { Cart } from "../entities/Cart";
import { Order, OrderStatus } from "../entities/Order";
import { OrderItem } from "../entities/OrderItem";
import { ProductVariant } from "../entities/ProductVariant";

export const checkoutRoutes = Router();

checkoutRoutes.post("/", async (req: Request, res: Response) => {
  try {
    const { cartId, email, shippingAddress, billingAddress } = req.body;
    if (!cartId || !email) {
      return res.status(400).json({ error: "cartId and email required" });
    }

    const cart = await db.getRepository(Cart).findOne({
      where: { id: cartId },
      relations: ["items"],
    });
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    if (!cart.items.length) return res.status(400).json({ error: "Cart is empty" });

    // Calculate totals
    let totalAmount = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of cart.items) {
      const variant = await db.getRepository(ProductVariant).findOne({
        where: { id: item.variantId },
        relations: ["pricingTiers"],
      });
      if (!variant) continue;

      const tier = variant.pricingTiers
        .sort((a, b) => b.minQuantity - a.minQuantity)
        .find((t) => item.quantity >= t.minQuantity && item.quantity <= t.maxQuantity);

      const unitPrice = tier ? Number(tier.pricePerUnit) : Number(variant.basePrice);
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
        customPhotoUrl: item.customPhotoUrl,
        personalizationText: item.personalizationText,
      });
    }

    // Create order
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const order = db.getRepository(Order).create({
      tenantId: cart.tenantId,
      email,
      status: OrderStatus.CONFIRMED,
      totalAmount,
      shippingAddress: shippingAddress || null,
      billingAddress: billingAddress || null,
      invoiceNumber,
    });

    const savedOrder = await db.getRepository(Order).save(order);

    // Create order items
    for (const oi of orderItems) {
      const orderItem = db.getRepository(OrderItem).create({
        ...oi,
        orderId: savedOrder.id,
      });
      await db.getRepository(OrderItem).save(orderItem);
    }

    // Clear cart
    await db.getRepository(Cart).delete(cart.id);

    const fullOrder = await db.getRepository(Order).findOne({
      where: { id: savedOrder.id },
      relations: ["items"],
    });

    res.status(201).json({ order: fullOrder });
  } catch (err) {
    res.status(500).json({ error: "Checkout failed", detail: String(err) });
  }
});

// Get order by ID
checkoutRoutes.get("/orders/:id", async (req: Request, res: Response) => {
  try {
    const order = await db.getRepository(Order).findOne({
      where: { id: req.params.id },
      relations: ["items"],
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order", detail: String(err) });
  }
});

// List orders by email/tenant
checkoutRoutes.get("/orders", async (req: Request, res: Response) => {
  try {
    const { email, tenantId } = req.query;
    const qb = db.getRepository(Order).createQueryBuilder("order").leftJoinAndSelect("order.items", "item").orderBy("order.createdAt", "DESC");

    if (email) qb.andWhere("order.email = :email", { email });
    if (tenantId) qb.andWhere("order.tenantId = :tenantId", { tenantId });

    const orders = await qb.getMany();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders", detail: String(err) });
  }
});
