export interface Product {
  id: string;
  name: string;
  description: string;
  shape: string;
  material: string;
  thumbnail: string | null;
  images: string[];
  tenantId: string | null;
  active: boolean;
  metadata: Record<string, unknown> | null;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  finish: string;
  basePrice: number;
  widthInches: number | null;
  heightInches: number | null;
  thicknessMm: number | null;
  inventoryQuantity: number;
  active: boolean;
  productId: string;
  pricingTiers: PricingTier[];
}

export interface PricingTier {
  id: string;
  minQuantity: number;
  maxQuantity: number;
  pricePerUnit: number;
  variantId: string;
}

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  customPhotoUrl: string | null;
  personalizationText: string | null;
  metadata: Record<string, unknown> | null;
  cartId: string;
}

export interface Cart {
  id: string;
  tenantId: string | null;
  email: string | null;
  items: CartItem[];
}

export interface Order {
  id: string;
  tenantId: string | null;
  email: string;
  status: string;
  totalAmount: number;
  shippingAddress: Record<string, string> | null;
  trackingNumber: string | null;
  invoiceNumber: string | null;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customPhotoUrl: string | null;
  personalizationText: string | null;
}

export interface BulkOrder {
  id: string;
  tenantId: string | null;
  email: string;
  originalFilename: string;
  status: string;
  totalLines: number;
  validLines: number;
  errorLines: number;
  errors: Array<{ line: number; message: string }> | null;
  estimatedTotal: number | null;
  createdAt: string;
}

export interface BulkOrderLine {
  id: string;
  recipientName: string;
  photoUrl: string | null;
  quantity: number;
  size: string;
  finish: string | null;
  lineNumber: number;
  valid: boolean;
  errorMessage: string | null;
  unitPrice: number | null;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  brandingConfig: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  } | null;
  contactEmail: string | null;
  active: boolean;
}

export interface CsvBulkRow {
  name: string;
  photo_url: string;
  quantity: string;
  size: string;
  finish?: string;
}
