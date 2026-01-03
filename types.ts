
export interface Product {
  id: string;
  name: string;
  image: string;
  barcode?: string;
  category: string;
  description: string;
}

export interface Store {
  id: string;
  name: string;
  logo: string;
  color: string;
}

export interface Listing {
  id: string;
  productId: string;
  storeId: string;
  price: number;
  shippingDays: number;
  shippingCost: number;
  rating: number;
  reviewCount: number;
  url: string;
  returnPolicy: string;
  image?: string;
}

export type AppScreen = 'HOME' | 'RESULTS' | 'COMPARE' | 'WATCHLIST' | 'ACCOUNT' | 'CHECKOUT' | 'UPGRADE' | 'CRYPTO_PAY' | 'CARD_PAY' | 'OZOW_PAY' | 'EFT_PAY';

export interface ComparisonData {
  product: Product;
  listings: (Listing & { store: Store })[];
}

export interface WatchItem {
  productId: string;
  targetPrice: number;
  addedAt: number;
}

export type UserTier = 'TRIAL' | 'STARTER' | 'EXPLORER' | 'ELITE';

export interface SubscriptionPlan {
  id: UserTier;
  name: string;
  price: number;
  storesCount: number;
  searchLimit: number | 'unlimited';
  description: string;
}

export type CryptoCurrency = 'XRP' | 'XLM' | 'HBAR' | 'SOL' | 'VET';
export type PaymentMethod = 'STRIPE' | 'PAYPAL' | 'CRYPTO' | 'OZOW' | 'EFT';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'INR' | 'ZAR' | 'BRL';
