"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useCartStore } from "@/lib/store";
import type { Order } from "@/types";

export default function CheckoutPage() {
  const { cartId, clearCart } = useCartStore();
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState({ line1: "", city: "", state: "", zip: "", country: "US" });
  const [order, setOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cartId || !email) return;
    setSubmitting(true);
    setError(null);

    try {
      const { order } = await api.checkout.create({
        cartId,
        email,
        shippingAddress: address,
      });
      setOrder(order);
      clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-slate-900">Order Confirmed!</h1>
        <p className="text-slate-500">Invoice: {order.invoiceNumber}</p>
        <p className="text-slate-500">Order ID: {order.id}</p>
        <p className="text-2xl font-bold text-brand-600">${Number(order.totalAmount).toFixed(2)}</p>
        <p className="text-sm text-slate-400">A confirmation will be sent to {order.email}</p>
        <a href="/products" className="inline-block mt-4 text-brand-600 hover:underline">
          Continue Shopping →
        </a>
      </div>
    );
  }

  if (!cartId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400">No items in cart. <a href="/products" className="text-brand-600 hover:underline">Shop now</a></p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Contact</h2>
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Shipping Address</h2>
          <input
            type="text"
            required
            placeholder="Address line 1"
            value={address.line1}
            onChange={(e) => setAddress({ ...address, line1: e.target.value })}
            className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              required
              placeholder="City"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
              className="border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
            <input
              type="text"
              required
              placeholder="State"
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
              className="border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <input
            type="text"
            required
            placeholder="ZIP Code"
            value={address.zip}
            onChange={(e) => setAddress({ ...address, zip: e.target.value })}
            className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition disabled:opacity-50"
        >
          {submitting ? "Processing..." : "Place Order"}
        </button>
      </form>
    </div>
  );
}
