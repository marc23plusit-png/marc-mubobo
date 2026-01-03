
import { Currency } from "../types";

const CURRENCY_MAP: Record<string, Currency> = {
  'Africa/Johannesburg': 'ZAR',
  'Africa/Harare': 'ZAR',
  'America/Sao_Paulo': 'BRL',
  'America/Manaus': 'BRL',
  'Asia/Tokyo': 'JPY',
  'Europe/London': 'GBP',
  'Europe/Paris': 'EUR',
  'Europe/Berlin': 'EUR',
  'Europe/Rome': 'EUR',
  'Europe/Madrid': 'EUR',
  'America/Toronto': 'CAD',
  'Australia/Sydney': 'AUD',
  'Australia/Melbourne': 'AUD',
  'Asia/Kolkata': 'INR',
};

export const detectLocalCurrency = (): Currency => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = navigator.language;
  
  if (CURRENCY_MAP[tz]) return CURRENCY_MAP[tz];
  
  // Fallbacks based on timezone prefixes
  if (tz.startsWith('Europe/')) return 'EUR';
  if (tz.startsWith('Africa/')) return 'ZAR';
  if (tz.startsWith('Asia/')) {
    if (locale.includes('IN')) return 'INR';
    if (locale.includes('JP')) return 'JPY';
  }
  
  return 'USD';
};

export const fetchExchangeRates = async (base: Currency = 'USD'): Promise<Record<Currency, number>> => {
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates, using defaults", error);
    return {
      USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150.2, CAD: 1.35, AUD: 1.52, INR: 82.9, ZAR: 19.1, BRL: 4.95,
    };
  }
};
