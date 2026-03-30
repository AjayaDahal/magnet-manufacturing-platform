"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCartStore } from "@/lib/store";
import { ProductCard, PricingTierTable } from "@/components/ProductCard";
import { PhotoUploader } from "@/components/PhotoUploader";
import type { Product, ProductVariant } from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const { cartId, setCartId, incrementItems } = useCartStore();

  useEffect(() => {
    api.products.list().then((r) => {
      setProducts(r.products);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function selectProduct(product: Product) {
    setSelected(product);
    setSelectedVariant(product.variants[0] || null);
    setQuantity(1);
    setPhotoUrl(null);
  }

  async function addToCart() {
    if (!selectedVariant) return;
    setAdding(true);
    try {
      let cid = cartId;
      if (!cid) {
        const { cart } = await api.cart.create();
        cid = cart.id;
        setCartId(cart.id);
      }
      await api.cart.addItem(cid, {
        variantId: selectedVariant.id,
        quantity,
        customPhotoUrl: photoUrl || undefined,
      });
      incrementItems();
      setSelected(null);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  const uniqueSizes = selected ? [...new Set(selected.variants.map((v) => v.size))] : [];
  const uniqueFinishes = selected
    ? [...new Set(selected.variants.filter((v) => !selectedVariant || v.size === selectedVariant.size).map((v) => v.finish))]
    : [];

  function getPrice() {
    if (!selectedVariant) return 0;
    const tier = selectedVariant.pricingTiers
      .sort((a, b) => b.minQuantity - a.minQuantity)
      .find((t) => quantity >= t.minQuantity && quantity <= t.maxQuantity);
    return tier ? Number(tier.pricePerUnit) : Number(selectedVariant.basePrice);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse text-slate-400">Loading products...</div>
      </div>
    );
  }

  // Product detail view
  if (selected) {
    const unitPrice = getPrice();
    const total = unitPrice * quantity;

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button onClick={() => setSelected(null)} className="text-sm text-brand-600 hover:underline mb-6 inline-block">
          ← Back to products
        </button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Photo upload & preview */}
          <div className="space-y-6">
            <PhotoUploader onUpload={setPhotoUrl} previewShape={selected.shape} />
          </div>

          {/* Right: Configuration */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{selected.name}</h1>
              <p className="text-slate-500 mt-1">{selected.description}</p>
            </div>

            {/* Size selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Size</label>
              <div className="flex flex-wrap gap-2">
                {uniqueSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      const v = selected.variants.find((v) => v.size === size);
                      if (v) setSelectedVariant(v);
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                      selectedVariant?.size === size
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    {size.replace("x", '"×')}"
                  </button>
                ))}
              </div>
            </div>

            {/* Finish selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Finish</label>
              <div className="flex flex-wrap gap-2">
                {uniqueFinishes.map((finish) => (
                  <button
                    key={finish}
                    onClick={() => {
                      const v = selected.variants.find(
                        (v) => v.size === selectedVariant?.size && v.finish === finish
                      );
                      if (v) setSelectedVariant(v);
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition ${
                      selectedVariant?.finish === finish
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    {finish.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border flex items-center justify-center hover:bg-slate-50"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border rounded-lg py-2"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border flex items-center justify-center hover:bg-slate-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Unit price</span>
                <span className="font-medium">${unitPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-brand-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={addToCart}
              disabled={adding}
              className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add to Cart"}
            </button>

            {/* Pricing tiers */}
            {selectedVariant && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Volume Pricing</p>
                <PricingTierTable variant={selectedVariant} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Product listing
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Custom Magnets</h1>
        <p className="text-slate-500 mt-1">Choose a magnet type, then customize with your photo</p>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-400 text-center py-16">No products available. Run the seed script to add products.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onSelect={selectProduct} />
          ))}
        </div>
      )}
    </div>
  );
}
