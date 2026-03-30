import { Router, Request, Response } from "express";
import { db } from "../db";
import { Cart } from "../entities/Cart";
import { CartItem } from "../entities/CartItem";

export const cartRoutes = Router();

// Create cart
cartRoutes.post("/", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.body;
    const cart = db.getRepository(Cart).create({ tenantId: tenantId || null });
    const saved = await db.getRepository(Cart).save(cart);
    res.status(201).json({ cart: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to create cart", detail: String(err) });
  }
});

// Get cart
cartRoutes.get("/:id", async (req: Request, res: Response) => {
  try {
    const cart = await db.getRepository(Cart).findOne({
      where: { id: req.params.id },
      relations: ["items"],
    });
    if (!cart) return res.status(404).json({ error: "Cart not found" });
    res.json({ cart });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cart", detail: String(err) });
  }
});

// Add item to cart
cartRoutes.post("/:id/items", async (req: Request, res: Response) => {
  try {
    const { variantId, quantity, customPhotoUrl, personalizationText, metadata } = req.body;
    if (!variantId || !quantity) {
      return res.status(400).json({ error: "variantId and quantity required" });
    }

    const cart = await db.getRepository(Cart).findOne({ where: { id: req.params.id } });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = db.getRepository(CartItem).create({
      cartId: cart.id,
      variantId,
      quantity,
      customPhotoUrl: customPhotoUrl || null,
      personalizationText: personalizationText || null,
      metadata: metadata || null,
    });

    const saved = await db.getRepository(CartItem).save(item);
    res.status(201).json({ item: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to add item", detail: String(err) });
  }
});

// Update item quantity
cartRoutes.put("/:id/items/:itemId", async (req: Request, res: Response) => {
  try {
    const { quantity } = req.body;
    const item = await db.getRepository(CartItem).findOne({
      where: { id: req.params.itemId, cartId: req.params.id },
    });
    if (!item) return res.status(404).json({ error: "Item not found" });

    item.quantity = quantity;
    const saved = await db.getRepository(CartItem).save(item);
    res.json({ item: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to update item", detail: String(err) });
  }
});

// Remove item
cartRoutes.delete("/:id/items/:itemId", async (req: Request, res: Response) => {
  try {
    await db.getRepository(CartItem).delete({
      id: req.params.itemId,
      cartId: req.params.id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove item", detail: String(err) });
  }
});
