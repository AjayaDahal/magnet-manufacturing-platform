import { create } from "zustand";

interface CartState {
  cartId: string | null;
  itemCount: number;
  setCartId: (id: string) => void;
  setItemCount: (count: number) => void;
  incrementItems: () => void;
  decrementItems: () => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cartId: null,
  itemCount: 0,
  setCartId: (id) => set({ cartId: id }),
  setItemCount: (count) => set({ itemCount: count }),
  incrementItems: () => set((s) => ({ itemCount: s.itemCount + 1 })),
  decrementItems: () => set((s) => ({ itemCount: Math.max(0, s.itemCount - 1) })),
  clearCart: () => set({ cartId: null, itemCount: 0 }),
}));
