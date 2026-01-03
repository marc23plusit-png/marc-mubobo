
import { GoogleGenAI, Type } from "@google/genai";
import { Product, Listing, ComparisonData } from "../types";
import { STORES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchProducts = async (query: string): Promise<ComparisonData> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate realistic product information and pricing for these 30 specific retailers: ${STORES.map(s => s.name).join(', ')}. Target the specific item: "${query}". Ensure varied pricing and delivery times across fashion, tech, and home retailers.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          product: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              image: { type: Type.STRING, description: "Placeholder URL like https://picsum.photos/400" }
            },
            required: ["name", "description", "image"]
          },
          listings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                storeName: { type: Type.STRING },
                price: { type: Type.NUMBER },
                shippingDays: { type: Type.NUMBER },
                shippingCost: { type: Type.NUMBER },
                rating: { type: Type.NUMBER },
                reviewCount: { type: Type.NUMBER },
                returnPolicy: { type: Type.STRING }
              },
              required: ["storeName", "price", "shippingDays", "rating"]
            }
          }
        },
        required: ["product", "listings"]
      }
    }
  });

  const rawData = JSON.parse(response.text || '{}');
  
  const product: Product = {
    id: Math.random().toString(36).substr(2, 9),
    name: rawData.product.name,
    image: `https://picsum.photos/seed/${encodeURIComponent(query)}/600/600`,
    category: 'Marketplace',
    description: rawData.product.description
  };

  const listings: (Listing & { store: typeof STORES[0] })[] = rawData.listings.map((l: any, idx: number) => {
    // Attempt to match generated store name to our known list
    const store = STORES.find(s => 
      s.name.toLowerCase().includes(l.storeName.toLowerCase()) || 
      l.storeName.toLowerCase().includes(s.name.toLowerCase())
    ) || STORES[idx % STORES.length];

    return {
      id: `list-${idx}`,
      productId: product.id,
      storeId: store.id,
      store: store,
      price: l.price,
      shippingDays: l.shippingDays,
      shippingCost: l.shippingCost || 0,
      rating: l.rating,
      reviewCount: l.reviewCount || Math.floor(Math.random() * 5000),
      url: `https://www.${store.name.toLowerCase().replace(/\s+/g, '')}.com/search?q=${encodeURIComponent(product.name)}`,
      returnPolicy: l.returnPolicy || '30-day returns',
      image: `https://picsum.photos/seed/${store.id}-${encodeURIComponent(product.name)}/140/140`
    };
  }).sort((a: any, b: any) => (a.price + a.shippingCost) - (b.price + b.shippingCost));

  return { product, listings };
};
