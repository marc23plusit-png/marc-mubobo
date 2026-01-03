
import { Store, SubscriptionPlan, CryptoCurrency } from './types';

export interface CryptoAsset {
  id: CryptoCurrency;
  name: string;
  symbol: string;
  icon: string;
  rate: number; // Simulated rate per 1 USD
  address: string;
}

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { id: 'XRP', name: 'Ripple', symbol: 'XRP', icon: 'fa-solid fa-x', rate: 1.62, address: 'rPVMhWB77699999XRP_ADDRESS_NODE' },
  { id: 'XLM', name: 'Stellar', symbol: 'XLM', icon: 'fa-solid fa-rocket', rate: 3.45, address: 'GB777999XLM_STELAR_NODE' },
  { id: 'HBAR', name: 'Hedera', symbol: 'HBAR', icon: 'fa-solid fa-h', rate: 8.12, address: '0.0.777999_HBAR_NODE' },
  { id: 'SOL', name: 'Solana', symbol: 'SOL', icon: 'fa-solid fa-sun', rate: 0.0054, address: 'Sol777999SOL_WALLET_NODE' },
  { id: 'VET', name: 'VeChain', symbol: 'VET', icon: 'fa-solid fa-v', rate: 22.45, address: '0x777999VET_WALLET_NODE' },
];

export const STORES: Store[] = [
  // The Core 15 "Biggest" Sites
  { id: 'amz', name: 'Amazon', logo: 'https://logo.clearbit.com/amazon.com', color: '#FF9900' },
  { id: 'wmt', name: 'Walmart', logo: 'https://logo.clearbit.com/walmart.com', color: '#0071CE' },
  { id: 'tgt', name: 'Target', logo: 'https://logo.clearbit.com/target.com', color: '#CC0000' },
  { id: 'eby', name: 'eBay', logo: 'https://logo.clearbit.com/ebay.com', color: '#E53238' },
  { id: 'bby', name: 'Best Buy', logo: 'https://logo.clearbit.com/bestbuy.com', color: '#FFF200' },
  { id: 'cst', name: 'Costco', logo: 'https://logo.clearbit.com/costco.com', color: '#005DAA' },
  { id: 'ult', name: 'Ulta', logo: 'https://logo.clearbit.com/ulta.com', color: '#FF8A00' },
  { id: 'sph', name: 'Sephora', logo: 'https://logo.clearbit.com/sephora.com', color: '#000000' },
  { id: 'ets', name: 'Etsy', logo: 'https://logo.clearbit.com/etsy.com', color: '#F1641E' },
  { id: 'shn', name: 'Shein', logo: 'https://logo.clearbit.com/shein.com', color: '#000000' },
  
  // Extra 15
  { id: 'nke', name: 'Nike', logo: 'https://logo.clearbit.com/nike.com', color: '#000000' },
  { id: 'adi', name: 'Adidas', logo: 'https://logo.clearbit.com/adidas.com', color: '#000000' },
  { id: 'zps', name: 'Zappos', logo: 'https://logo.clearbit.com/zappos.com', color: '#003953' },
  { id: 'nwg', name: 'Newegg', logo: 'https://logo.clearbit.com/newegg.com', color: '#F58220' },
  { id: 'asf', name: 'ASOS', logo: 'https://logo.clearbit.com/asos.com', color: '#000000' },
  { id: 'mac', name: 'Macys', logo: 'https://logo.clearbit.com/macys.com', color: '#E21A2C' },
  { id: 'nord', name: 'Nordstrom', logo: 'https://logo.clearbit.com/nordstrom.com', color: '#000000' },
  { id: 'h&m', name: 'H&M', logo: 'https://logo.clearbit.com/hm.com', color: '#FF0000' },
  { id: ' Zara', name: 'Zara', logo: 'https://logo.clearbit.com/zara.com', color: '#000000' },
  { id: 'ftl', name: 'Foot Locker', logo: 'https://logo.clearbit.com/footlocker.com', color: '#000000' },
  { id: 'dsg', name: 'Dicks Sporting Goods', logo: 'https://logo.clearbit.com/dickssportinggoods.com', color: '#BA0C2F' },
  { id: 'way', name: 'Wayfair', logo: 'https://logo.clearbit.com/wayfair.com', color: '#7F187F' },
  { id: 'hdp', name: 'Home Depot', logo: 'https://logo.clearbit.com/homedepot.com', color: '#F96302' },
  { id: 'ovk', name: 'Overstock', logo: 'https://logo.clearbit.com/overstock.com', color: '#C72027' },
  { id: 'ffh', name: 'Farfetch', logo: 'https://logo.clearbit.com/farfetch.com', color: '#000000' },
  { id: 'rvl', name: 'Revolve', logo: 'https://logo.clearbit.com/revolve.com', color: '#000000' },
  { id: 'lul', name: 'Lululemon', logo: 'https://logo.clearbit.com/lululemon.com', color: '#D31145' },
  { id: 'bho', name: 'Boohoo', logo: 'https://logo.clearbit.com/boohoo.com', color: '#000000' },
  { id: 'plt', name: 'PrettyLittleThing', logo: 'https://logo.clearbit.com/prettylittlething.com', color: '#FFB6C1' },
  { id: 'temu', name: 'Temu', logo: 'https://logo.clearbit.com/temu.com', color: '#FF7000' },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: 'TRIAL', name: 'Trial', price: 0, storesCount: 10, searchLimit: 5, description: 'First 5 searches for free.' },
  { id: 'STARTER', name: 'Starter', price: 5, storesCount: 10, searchLimit: 'unlimited', description: 'Unlock unlimited searches with 10 suppliers.' },
  { id: 'EXPLORER', name: 'Explorer', price: 10, storesCount: 20, searchLimit: 'unlimited', description: 'Deep market access: 20 retailers.' },
  { id: 'ELITE', name: 'Elite', price: 15, storesCount: 30, searchLimit: 'unlimited', description: 'Total market mastery: all 30 retailers.' },
];

export const APP_THEME = {
  purple: '#8B5CF6',
  cyan: '#22D3EE',
  pink: '#F472B6',
  slate: '#0F172A',
};
