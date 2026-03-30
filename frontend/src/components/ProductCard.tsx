"use client";

import { useState } from "react";
import type { Product, ProductVariant } from "@/types";

interface PricingTierTableProps {
  variant: ProductVariant;
}

export function PricingTierTable({ variant }: PricingTierTableProps) {
  const tiers = [...variant.pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity);

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left text-slate-600">Quantity</th>
            <th className="px-3 py-2 text-right text-slate-600">Price/Unit</th>
            <th className="px-3 py-2 text-right text-slate-600">Savings</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => {
            const savings = ((1 - Number(tier.pricePerUnit) / Number(variant.basePrice)) * 100).toFixed(0);
            return (
              <tr key={tier.id} className="border-t">
                <td className="px-3 py-2">
                  {tier.minQuantity}–{tier.maxQuantity >= 99999 ? "∞" : tier.maxQuantity}
                </td>
                <td className="px-3 py-2 text-right font-medium">${Number(tier.pricePerUnit).toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-green-600">
                  {Number(savings) > 0 ? `${savings}% off` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const lowestPrice = product.variants.length
    ? Math.min(...product.variants.map((v) => Number(v.basePrice)))
    : 0;

  return (
    <div
      onClick={() => onSelect(product)}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition cursor-pointer group"
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <span className="text-4xl">
            {product.shape === "circle" ? "⚪" : product.shape === "heart" ? "❤️" : product.shape === "square" ? "⬜" : "📷"}
          </span>
          <p className="text-xs text-brand-600 font-medium">{product.material.replace("_", " ")}</p>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition">{product.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2">{product.description}</p>
        <div className="flex justify-between items-center pt-2">
          <span className="text-brand-600 font-bold">From ${lowestPrice.toFixed(2)}</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
            {product.variants.length} variants
          </span>
        </div>
      </div>
    </div>
  );
}
