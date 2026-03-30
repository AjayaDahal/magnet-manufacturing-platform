"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCartStore } from "@/lib/store";
import type { Cart } from "@/types";

export default function CartPage() {
  const { cartId, clearCart, setItemCount } = useCartStore();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cartId) {
      setLoading(false);
      return;
    }
    api.cart.get(cartId).then((r) => {
      setCart(r.cart);
      setItemCount(r.cart.items.length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [cartId, setItemCount]);

  async function removeItem(itemId: string) {
    if (!cartId) return;
    await api.cart.removeItem(cartId, itemId);
    const { cart: updated } = await api.cart.get(cartId);
    setCart(updated);
    setItemCount(updated.items.length);
  }

  async function updateQuantity(itemId: string, qty: number) {
    if (!cartId || qty < 1) return;
    await api.cart.updateItem(cartId, itemId, qty);
    const { cart: updated } = await api.cart.get(cartId);
    setCart(updated);
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">Loading cart...</div>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 text-lg">Your cart is empty</p>
        <a href="/products" className="text-brand-600 hover:underline mt-2 inline-block">
          Browse products →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>

      <div className="space-y-4">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 border rounded-lg p-4">
            <div className="flex-1">
              <p className="font-medium text-sm">Variant: {item.variantId.slice(0, 8)}...</p>
              {item.customPhotoUrl && (
                <p className="text-xs text-green-600">📷 Custom photo attached</p>
              )}
              {item.personalizationText && (
                <p className="text-xs text-slate-500">"{item.personalizationText}"</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-8 h-8 rounded border flex items-center justify-center text-sm hover:bg-slate-50"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 rounded border flex items-center justify-center text-sm hover:bg-slate-50"
              >
                +
              </button>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <a
          href="/checkout"
          className="bg-brand-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-700 transition"
        >
          Proceed to Checkout
        </a>
      </div>
    </div>
  );
}
