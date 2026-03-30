const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  products: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<{ products: import("@/types").Product[] }>(`/api/products${qs}`);
    },
    get: (id: string) =>
      request<{ product: import("@/types").Product }>(`/api/products/${id}`),
    getPrice: (productId: string, variantId: string, quantity: number) =>
      request<{ unitPrice: number; total: number; quantity: number; tiered: boolean }>(
        `/api/products/${productId}/price?variantId=${variantId}&quantity=${quantity}`
      ),
  },

  cart: {
    create: (tenantId?: string) =>
      request<{ cart: import("@/types").Cart }>("/api/cart", {
        method: "POST",
        body: JSON.stringify({ tenantId }),
      }),
    get: (id: string) =>
      request<{ cart: import("@/types").Cart }>(`/api/cart/${id}`),
    addItem: (cartId: string, data: { variantId: string; quantity: number; customPhotoUrl?: string; personalizationText?: string }) =>
      request<{ item: import("@/types").CartItem }>(`/api/cart/${cartId}/items`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateItem: (cartId: string, itemId: string, quantity: number) =>
      request<{ item: import("@/types").CartItem }>(`/api/cart/${cartId}/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
      }),
    removeItem: (cartId: string, itemId: string) =>
      request<{ success: boolean }>(`/api/cart/${cartId}/items/${itemId}`, {
        method: "DELETE",
      }),
  },

  checkout: {
    create: (data: { cartId: string; email: string; shippingAddress?: Record<string, string> }) =>
      request<{ order: import("@/types").Order }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getOrder: (id: string) =>
      request<{ order: import("@/types").Order }>(`/api/checkout/orders/${id}`),
    listOrders: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<{ orders: import("@/types").Order[] }>(`/api/checkout/orders${qs}`);
    },
  },

  bulkOrders: {
    upload: async (file: File, email: string, tenantId?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", email);
      if (tenantId) formData.append("tenantId", tenantId);

      const res = await fetch(`${API_URL}/api/bulk-orders/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ bulkOrder: import("@/types").BulkOrder; summary: { total: number; valid: number; errors: number; estimatedTotal: number } }>;
    },
    get: (id: string) =>
      request<{ bulkOrder: import("@/types").BulkOrder }>(`/api/bulk-orders/${id}`),
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<{ bulkOrders: import("@/types").BulkOrder[] }>(`/api/bulk-orders${qs}`);
    },
    confirm: (id: string) =>
      request<{ bulkOrder: import("@/types").BulkOrder }>(`/api/bulk-orders/${id}/confirm`, {
        method: "POST",
      }),
  },

  uploads: {
    photo: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`${API_URL}/api/uploads/photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ url: string; filename: string }>;
    },
  },
};
