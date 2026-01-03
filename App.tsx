
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, ComparisonData, WatchItem, Listing, PaymentMethod, Currency, Store, UserTier, SubscriptionPlan, CryptoCurrency } from './types';
import { searchProducts } from './services/shopService';
import VoiceAssistant from './components/VoiceAssistant';
import { SUBSCRIPTION_PLANS, STORES, CRYPTO_ASSETS, CryptoAsset } from './constants';
import { translations, LanguageCode } from './translations';
import { detectLocalCurrency, fetchExchangeRates } from './services/currencyService';

const Confetti = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-[250]">
    {[...Array(20)].map((_, i) => (
      <div 
        key={i} 
        className="confetti-piece"
        style={{
          left: `${Math.random() * 100}%`,
          top: '20%',
          width: '6px',
          height: '6px',
          backgroundColor: i % 2 === 0 ? '#8B5CF6' : '#22D3EE',
          borderRadius: '50%',
          position: 'absolute',
          animation: 'fall 2s forwards ease-in-out',
          animationDelay: `${Math.random() * 0.5}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(300px) rotate(360deg); opacity: 0; }
      }
    `}</style>
  </div>
);

const ProductThumbnail = ({ src, storeLogo }: { src?: string, storeLogo?: string }) => {
  const [error, setError] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (src && src.includes('picsum.photos')) {
      const timer = setTimeout(() => setVerified(true), 100);
      return () => clearTimeout(timer);
    }
    setVerified(true);
  }, [src]);

  if (error || !src || !verified) {
    return (
      <div className="w-[70px] h-[70px] bg-white rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-200 overflow-hidden p-2 shadow-sm">
        {storeLogo ? (
          <img src={storeLogo} className="w-full h-full object-contain opacity-40 grayscale" alt="Fallback" />
        ) : (
          <i className="fa-solid fa-camera text-slate-300 text-xl"></i>
        )}
      </div>
    );
  }

  return (
    <div className="w-[70px] h-[70px] bg-white rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
      <img 
        src={src} 
        alt="Product" 
        loading="lazy"
        className="w-full h-full object-cover transition-opacity duration-300"
        onError={() => setError(true)}
      />
    </div>
  );
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('HOME');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ComparisonData | null>(null);
  const [selectedListing, setSelectedListing] = useState<(Listing & { store: Store }) | null>(null);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // --- Currency & Rates State ---
  const [currency, setCurrency] = useState<Currency>(detectLocalCurrency());
  const [rates, setRates] = useState<Record<Currency, number>>({
    USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150.2, CAD: 1.35, AUD: 1.52, INR: 82.9, ZAR: 19.1, BRL: 4.95,
  });

  // Sync rates on mount
  useEffect(() => {
    const syncRates = async () => {
      const freshRates = await fetchExchangeRates();
      setRates(freshRates as any);
    };
    syncRates();
    const interval = setInterval(syncRates, 3600000); // Every hour
    return () => clearInterval(interval);
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);

  // --- Persistent Tiered Access State ---
  const [userTier, setUserTier] = useState<UserTier>(() => (localStorage.getItem('shopsnap_tier') as UserTier) || 'TRIAL');
  const [searchCount, setSearchCount] = useState<number>(() => parseInt(localStorage.getItem('shopsnap_search_count') || '0'));
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // --- Crypto Gateway State ---
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset>(CRYPTO_ASSETS[0]);
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'WAITING' | 'CONFIRMING' | 'SUCCESS'>('IDLE');

  // --- Card Payment State ---
  const [cardData, setCardData] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'amex' | 'discover' | 'generic'>('generic');

  // --- Multi-language State ---
  const [lang, setLang] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('shopsnap_lang') as LanguageCode;
    if (saved) return saved;
    const browserLang = navigator.language.split('-')[0] as LanguageCode;
    return translations[browserLang] ? browserLang : 'en';
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = translations[lang];
  const isRTL = lang === 'ar';

  useEffect(() => {
    localStorage.setItem('shopsnap_lang', lang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [lang, isRTL]);

  useEffect(() => {
    localStorage.setItem('shopsnap_tier', userTier);
  }, [userTier]);

  useEffect(() => {
    localStorage.setItem('shopsnap_search_count', searchCount.toString());
  }, [searchCount]);

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === userTier)!;
  const isLocked = userTier === 'TRIAL' && searchCount >= 5;

  const formatPrice = (usdAmount: number) => {
    const rate = rates[currency] || 1;
    const converted = usdAmount * rate;
    return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(converted);
  };

  const startCardCheckout = (plan: SubscriptionPlan) => {
    setPendingPlan(plan);
    setScreen('CARD_PAY');
    setShowUpgradeModal(false);
  };

  const startOzowCheckout = (plan: SubscriptionPlan) => {
    setPendingPlan(plan);
    setScreen('OZOW_PAY');
    setShowUpgradeModal(false);
  };

  const startEFTCheckout = (plan: SubscriptionPlan) => {
    setPendingPlan(plan);
    setScreen('EFT_PAY');
    setShowUpgradeModal(false);
  };

  const handleManualCardPayment = async () => {
    if (!cardData.number || !cardData.expiry || !cardData.cvc) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (pendingPlan) setUserTier(pendingPlan.id);
    setIsProcessing(false);
    setScreen('HOME');
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleOzowPayment = async () => {
    setIsProcessing(true);
    setPaymentStatus('WAITING');
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (pendingPlan) setUserTier(pendingPlan.id);
    setIsProcessing(false);
    setScreen('HOME');
    setPaymentStatus('IDLE');
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const detectCardBrand = (num: string) => {
    const cleanNum = num.replace(/\D/g, '');
    if (cleanNum.startsWith('4')) return 'visa';
    if (cleanNum.match(/^5[1-5]/)) return 'mastercard';
    if (cleanNum.match(/^3[47]/)) return 'amex';
    if (cleanNum.startsWith('6')) return 'discover';
    return 'generic';
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCardData({ ...cardData, number: val });
    setCardBrand(detectCardBrand(val));
  };

  const startCryptoCheckout = (plan: SubscriptionPlan) => {
    setPendingPlan(plan);
    setScreen('CRYPTO_PAY');
    setShowUpgradeModal(false);
  };

  const handleSimulatedCryptoPayment = async () => {
    setPaymentStatus('WAITING');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPaymentStatus('CONFIRMING');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPaymentStatus('SUCCESS');
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (pendingPlan) setUserTier(pendingPlan.id);
    setScreen('HOME');
    setPaymentStatus('IDLE');
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    if (isLocked) { setShowUpgradeModal(true); return; }
    setLoading(true);
    setSearchQuery(query);
    setScreen('RESULTS');
    try {
      const data = await searchProducts(query);
      const limitedListings = data.listings.slice(0, currentPlan.storesCount);
      setResults({ ...data, listings: limitedListings });
      if (userTier === 'TRIAL') setSearchCount(prev => prev + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const toggleWatch = (productId: string) => {
    const existing = watchlist.find(w => w.productId === productId);
    if (existing) setWatchlist(watchlist.filter(w => w.productId !== productId));
    else setWatchlist([...watchlist, { productId, targetPrice: 0, addedAt: Date.now() }]);
  };

  const renderOzowGateway = () => {
    if (!pendingPlan) return null;
    return (
      <div className="min-h-screen pt-24 pb-40 px-8 relative z-10 animate-in fade-in duration-500">
        <button onClick={() => setScreen('HOME')} className="mb-12 text-slate-500 hover:text-white transition-colors flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em]">
          <i className="fa-solid fa-arrow-left"></i> Cancel Order
        </button>

        <div className="text-center mb-10">
           <div className="w-24 h-12 bg-white rounded-xl mx-auto flex items-center justify-center mb-6 shadow-xl overflow-hidden">
              <span className="text-pink-600 font-black text-2xl tracking-tighter">Ozow</span>
           </div>
           <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{t.payWithOzow}</h2>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Instant EFT Security Hub</p>
        </div>

        <div className="frosted-glass p-8 bg-white/[0.03] border-white/10 shadow-2xl">
           <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-8">
              <div>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Pay To</p>
                 <p className="text-white font-bold">ShopSnap Aurora</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total</p>
                 <p className="text-2xl font-black text-white">{formatPrice(pendingPlan.price)}</p>
              </div>
           </div>

           {paymentStatus === 'IDLE' ? (
             <div className="space-y-6">
                <p className="text-xs text-slate-400 font-medium text-center mb-6">{t.selectBank}</p>
                <div className="grid grid-cols-2 gap-3 mb-10">
                   {['FNB', 'ABSA', 'Nedbank', 'Standard Bank', 'Capitec', 'TymeBank'].map(bank => (
                     <button key={bank} className="py-4 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs hover:bg-white/10 transition-colors">
                        {bank}
                     </button>
                   ))}
                </div>
                <button 
                  onClick={handleOzowPayment}
                  className="w-full py-6 rounded-2xl modern-gradient text-white font-black text-lg shadow-xl shadow-cyan-400/10 active:scale-95 transition-all"
                >
                  Proceed to Secure Login
                </button>
             </div>
           ) : (
             <div className="py-20 flex flex-col items-center justify-center gap-8">
                <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-cyan-400 animate-spin"></div>
                <p className="text-white font-black text-sm tracking-widest uppercase">{t.ozowWaiting}</p>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderEFTGateway = () => {
    if (!pendingPlan) return null;
    return (
      <div className="min-h-screen pt-24 pb-40 px-8 relative z-10 animate-in fade-in duration-500">
        <button onClick={() => setScreen('HOME')} className="mb-12 text-slate-500 hover:text-white transition-colors flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em]">
          <i className="fa-solid fa-arrow-left"></i> Back
        </button>

        <div className="text-center mb-10">
           <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{t.payWithEFT}</h2>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manual Node Verification</p>
        </div>

        <div className="frosted-glass p-8 bg-white/[0.03] border-white/10">
           <p className="text-sm text-slate-400 mb-8 leading-relaxed">{t.eftInstructions}</p>
           
           <div className="space-y-4 mb-10">
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5">
                 <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Bank</p>
                 <p className="text-white font-bold">Local Network Bank</p>
              </div>
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                 <div>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Account Number</p>
                    <p className="text-white font-bold">627 999 777 00</p>
                 </div>
                 <button className="text-cyan-400"><i className="fa-solid fa-copy"></i></button>
              </div>
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                 <div>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Reference</p>
                    <p className="text-cyan-400 font-black">SNAP-{Math.floor(Math.random() * 999999)}</p>
                 </div>
                 <button className="text-cyan-400"><i className="fa-solid fa-copy"></i></button>
              </div>
           </div>

           <button 
             onClick={() => { if (pendingPlan) setUserTier(pendingPlan.id); setScreen('HOME'); setShowConfetti(true); }}
             className="w-full py-6 rounded-2xl border border-white/20 text-white font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all"
           >
             I Have Paid
           </button>
        </div>
      </div>
    );
  };

  const renderCardGateway = () => {
    if (!pendingPlan) return null;
    return (
      <div className="min-h-screen pt-24 pb-40 px-8 relative z-10 animate-in fade-in duration-500">
        <button onClick={() => setScreen('HOME')} className="mb-12 text-slate-500 hover:text-white transition-colors flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em]">
          <i className="fa-solid fa-arrow-left"></i> Cancel
        </button>

        <div className="text-center mb-10">
           <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{t.secureCheckout}</h2>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{pendingPlan.name} Node Activation</p>
        </div>

        <div className="frosted-glass p-8 border-white/5 bg-white/[0.03] shadow-2xl">
           <div className="flex justify-between items-center mb-10">
              <div className="flex gap-4 items-center">
                 <i className={`fa-brands fa-cc-visa text-3xl transition-opacity ${cardBrand === 'visa' ? 'text-white' : 'opacity-20'}`}></i>
                 <i className={`fa-brands fa-cc-mastercard text-3xl transition-opacity ${cardBrand === 'mastercard' ? 'text-white' : 'opacity-20'}`}></i>
                 <i className={`fa-brands fa-cc-amex text-3xl transition-opacity ${cardBrand === 'amex' ? 'text-white' : 'opacity-20'}`}></i>
                 <i className={`fa-brands fa-cc-discover text-3xl transition-opacity ${cardBrand === 'discover' ? 'text-white' : 'opacity-20'}`}></i>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total</p>
                <p className="text-2xl font-black text-white tracking-tighter">{formatPrice(pendingPlan.price)}</p>
              </div>
           </div>

           <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.cardName}</p>
                <input 
                  type="text" 
                  value={cardData.name}
                  onChange={(e) => setCardData({...cardData, name: e.target.value})}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-4 text-white focus:border-cyan-400 focus:outline-none transition-colors"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.cardNumber}</p>
                <div className="relative">
                  <input 
                    type="text" 
                    value={cardData.number}
                    onChange={handleCardNumberChange}
                    className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-4 text-white focus:border-cyan-400 focus:outline-none transition-colors pr-12"
                    placeholder="4242 4242 4242 4242"
                  />
                  <i className={`fa-solid fa-credit-card absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 opacity-50`}></i>
                </div>
              </div>
              <div className="flex gap-4">
                 <div className="flex-1 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.expiry}</p>
                    <input 
                      type="text" 
                      value={cardData.expiry}
                      onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-4 text-white focus:border-cyan-400 focus:outline-none transition-colors text-center"
                      placeholder="MM / YY"
                    />
                 </div>
                 <div className="flex-1 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.cvc}</p>
                    <input 
                      type="text" 
                      value={cardData.cvc}
                      onChange={(e) => setCardData({...cardData, cvc: e.target.value})}
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-4 text-white focus:border-cyan-400 focus:outline-none transition-colors text-center"
                      placeholder="123"
                    />
                 </div>
              </div>

              <button 
                onClick={handleManualCardPayment}
                disabled={isProcessing}
                className="w-full mt-10 modern-gradient py-6 rounded-2xl text-white font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isProcessing ? (
                   <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                ) : (
                   <>
                     <span>{t.completePayment}</span>
                     <i className="fa-solid fa-shield-check"></i>
                   </>
                )}
              </button>
           </div>
        </div>
        <p className="text-center mt-12 text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">{t.auroraIntelligence} Secured Processing</p>
      </div>
    );
  };

  const renderCryptoGateway = () => {
    if (!pendingPlan) return null;
    const cryptoAmount = (pendingPlan.price * selectedCrypto.rate).toFixed(2);
    return (
      <div className="min-h-screen pt-24 pb-40 px-8 relative z-10 animate-in fade-in duration-500">
        <button onClick={() => setScreen('HOME')} className="mb-12 text-slate-500 hover:text-white transition-colors flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em]">
          <i className="fa-solid fa-arrow-left"></i> Cancel Order
        </button>
        <div className="text-center mb-12">
           <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Market Gateway</h2>
           <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Network Verified: Node Secure</p>
           </div>
        </div>
        <div className="frosted-glass p-8 mb-8 border-cyan-400/20 bg-cyan-400/5">
           <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Total Due</p>
                <h3 className="text-5xl font-black text-white tracking-tighter">${pendingPlan.price}.00</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Exchange</p>
                <h3 className="text-3xl font-black text-cyan-400 tracking-tighter">{cryptoAmount} {selectedCrypto.symbol}</h3>
              </div>
           </div>
           <div className="grid grid-cols-5 gap-2 mb-8">
             {CRYPTO_ASSETS.map(asset => (
               <button key={asset.id} onClick={() => setSelectedCrypto(asset)} className={`aspect-square rounded-2xl flex items-center justify-center transition-all ${selectedCrypto.id === asset.id ? 'modern-gradient text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>
                 <i className={`${asset.icon} text-xl`}></i>
               </button>
             ))}
           </div>
           {paymentStatus === 'IDLE' ? (
             <div className="space-y-6">
                <div className="aspect-square w-full max-w-[200px] mx-auto bg-white rounded-3xl p-4 shadow-2xl relative group">
                   <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center text-white text-6xl">
                      <i className="fa-solid fa-qrcode opacity-20"></i>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className={`${selectedCrypto.icon} text-cyan-400/80 blur-sm`}></i>
                        <i className={`${selectedCrypto.icon} text-cyan-400 absolute`}></i>
                      </div>
                   </div>
                </div>
                <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-4 group cursor-pointer active:scale-95 transition-all">
                   <p className="text-[10px] font-mono text-slate-400 truncate flex-1">{selectedCrypto.address}</p>
                   <button className="text-cyan-400 hover:text-white transition-colors"><i className="fa-solid fa-copy"></i></button>
                </div>
                <button onClick={handleSimulatedCryptoPayment} className="w-full py-6 rounded-2xl modern-gradient text-white font-black text-xl shadow-xl shadow-cyan-400/20 active:scale-95 transition-all">Confirm Transfer</button>
             </div>
           ) : (
             <div className="py-20 flex flex-col items-center justify-center text-center gap-6">
                <div className="w-20 h-20 rounded-full border-[4px] border-white/5 border-t-cyan-400 animate-spin"></div>
                <div><p className="text-white font-black text-xl mb-2">{paymentStatus === 'WAITING' ? t.waitingForPayment : t.cryptoConfirm}</p></div>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderUpgradeModal = () => (
    <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-3xl bg-slate-950/90 transition-all duration-500 ${showUpgradeModal || isLocked ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black text-white tracking-tighter mb-2">{isLocked ? 'Access Limited' : 'Scale Up'}</h2>
          <p className="text-slate-400 font-medium tracking-wide">{isLocked ? 'Trial expired. Choose a plan to continue snapping.' : 'Unlock deeper market coverage instantly.'}</p>
        </div>
        <div className="space-y-4">
          {SUBSCRIPTION_PLANS.filter(p => p.id !== 'TRIAL').map(plan => (
            <div key={plan.id} className={`frosted-glass p-8 border-2 flex flex-col transition-all ${userTier === plan.id ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/5'}`}>
              <div className="flex justify-between items-center mb-6">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-2xl font-black text-white mb-1">{plan.name}</p>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{plan.storesCount} Suppliers • Unlimited Searches</p>
                </div>
                <div className={`text-right ${isRTL ? 'text-left' : ''}`}>
                  <p className="text-3xl font-black text-cyan-400 tracking-tighter">{formatPrice(plan.price)}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">/ Month</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                 <button onClick={() => startCardCheckout(plan)} className="bg-white text-slate-900 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Card</button>
                 <button onClick={() => startCryptoCheckout(plan)} className="modern-gradient text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Crypto</button>
              </div>

              {currency === 'ZAR' && (
                <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => startOzowCheckout(plan)} className="bg-pink-600 text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Ozow EFT</button>
                   <button onClick={() => startEFTCheckout(plan)} className="bg-slate-800 text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Manual EFT</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {!isLocked && <button onClick={() => setShowUpgradeModal(false)} className="w-full mt-8 py-4 text-slate-500 font-black text-xs uppercase tracking-[0.3em] hover:text-white transition-colors">Not Now</button>}
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="flex flex-col min-h-screen relative px-6 pt-24 z-10">
      <div className="text-center mb-16 slide-in-right">
        <h1 className="text-7xl font-extrabold tracking-tighter mb-4 text-gradient">{t.appName}</h1>
        <p className="text-slate-400 font-medium text-lg tracking-wide opacity-80">{t.auroraIntelligence}</p>
        <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 opacity-60">
           <i className="fa-solid fa-location-dot text-[10px]"></i>
           <span className="text-[10px] font-black uppercase tracking-widest">Nodes Set To: {currency}</span>
        </div>
      </div>
      <div className="space-y-10">
        <div className={`flex justify-between items-center px-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/60">{t.quantumMarketplace}</h3>
          <span className="text-[9px] font-black text-white bg-white/5 px-3 py-1 rounded-full border border-white/10">{userTier === 'TRIAL' ? `${5 - searchCount} Trials Left` : `${currentPlan.storesCount} Nodes Active`}</span>
        </div>
        <div className={`flex gap-6 overflow-x-auto pb-8 -mx-6 px-6 no-scrollbar ${isRTL ? 'flex-row-reverse' : ''}`}>
          {[1, 2, 3].map(i => (
            <div key={i} className="frosted-glass min-w-[280px] p-6 slide-in-right" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="aspect-[1/1] rounded-[1.8rem] overflow-hidden mb-6 bg-slate-900/50 border border-white/5"><img src={`https://picsum.photos/seed/shop-${i}/600/600`} className="w-full h-full object-cover opacity-80" /></div>
              <div className={`flex justify-between items-end ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}><p className="font-bold text-slate-100 text-lg">Curated Node {i}</p><p className="text-gradient font-black text-2xl tracking-tighter mt-1">{formatPrice(49)}</p></div>
                <div className="w-12 h-12 rounded-full modern-gradient flex items-center justify-center text-white shadow-lg"><i className="fa-solid fa-plus text-lg"></i></div>
              </div>
            </div>
          ))}
        </div>
        {userTier === 'TRIAL' && <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-[2rem]"><p className="text-xs text-slate-500 font-medium mb-4">Limited Access Enabled</p><button onClick={() => setShowUpgradeModal(true)} className="modern-gradient px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest text-white shadow-xl">Unlock Full Market</button></div>}
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="min-h-screen pb-52 px-6 pt-16 relative z-10">
      <div className={`flex items-center gap-6 mb-10 slide-in-right ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setScreen('HOME')} className="w-14 h-14 frosted-glass flex items-center justify-center text-slate-300 text-xl"><i className={`fa-solid ${isRTL ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i></button>
        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h2 className="text-3xl font-black text-white truncate tracking-tight">{searchQuery}</h2>
          <div className={`flex items-center gap-3 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}><span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em]">{userTier}</span><div className="h-1 w-1 rounded-full bg-white/20"></div><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{currentPlan.storesCount} Stores</span></div>
        </div>
      </div>
      {loading ? (<div className="flex flex-col items-center justify-center py-32 gap-8"><div className="w-16 h-16 rounded-full border-[3px] border-white/5 border-t-cyan-400 animate-spin"></div></div>) : results && (
        <div className="space-y-4">
          {results.listings.map((l, idx) => (
            <div key={l.id} onClick={() => { setSelectedListing(l); setScreen('COMPARE'); }} className={`frosted-glass p-4 flex items-center gap-5 slide-in-right ${isRTL ? 'flex-row-reverse' : ''} ${idx === 0 ? 'border-cyan-400/30 bg-cyan-400/5 pulse-aura' : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}>
              <ProductThumbnail src={l.image} storeLogo={l.store.logo} />
              <div className={`flex-1 min-w-0 flex flex-col justify-center ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-center gap-2 mb-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}><p className="font-bold text-slate-200 truncate text-sm leading-tight">{l.store.name}</p></div>
                <p className={`text-3xl font-black tracking-tighter leading-none my-1.5 ${idx === 0 ? 'text-cyan-400' : 'text-white'}`}>{formatPrice(l.price)}</p>
                <div className={`flex items-center gap-1.5 mb-1 opacity-80 ${isRTL ? 'flex-row-reverse' : ''}`}><i className="fa-solid fa-star text-[10px] text-cyan-400"></i><span className="text-[10px] text-slate-300 font-bold">{l.rating}</span></div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em]">{t.deliveryIn.replace('{n}', l.shippingDays.toString())}</p>
              </div>
            </div>
          ))}
          {userTier !== 'ELITE' && (<div onClick={() => setShowUpgradeModal(true)} className="frosted-glass p-10 text-center border-dashed border-white/10 mt-10 hover:bg-white/[0.02] cursor-pointer"><i className="fa-solid fa-eye-slash text-slate-700 text-3xl mb-4"></i><p className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">{currentPlan.storesCount < 30 ? 'Nodes Locked' : 'Coverage Limit'}</p><button className="mt-4 text-cyan-400 font-black text-[10px] uppercase tracking-widest">Upgrade to View All 30 Stores</button></div>)}
        </div>
      )}
    </div>
  );

  const renderCompare = () => {
    if (!selectedListing) return null;
    const isWatched = watchlist.find(w => w.productId === selectedListing.productId);
    return (
      <div className="min-h-screen px-8 pt-16 pb-64 z-10 animate-in fade-in slide-in-from-bottom duration-500">
        <div className={`flex items-center justify-between mb-12 ${isRTL ? 'flex-row-reverse' : ''}`}><button onClick={() => setScreen('RESULTS')} className="w-14 h-14 frosted-glass flex items-center justify-center text-slate-300 text-xl"><i className={`fa-solid ${isRTL ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i></button><div className="text-center"><h2 className="text-xl font-black text-white tracking-tighter uppercase">{selectedListing.store.name}</h2></div><div className="w-14 h-14"></div></div>
        <div className="text-center mb-16"><div className="w-48 h-48 bg-white rounded-[3rem] shadow-2xl p-6 mx-auto mb-10 border border-white/10 overflow-hidden relative"><img src={selectedListing.image} className="w-full h-full object-cover" alt="Product" /></div><h1 className="text-8xl font-black text-white tracking-tighter mb-2">{formatPrice(selectedListing.price)}</h1><p className="text-cyan-400/60 font-black uppercase text-[11px] tracking-[0.4em] animate-pulse">Comparison Active</p></div>
        <div className={`grid grid-cols-2 gap-5 mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}><div className="frosted-glass p-8 text-center bg-white/[0.02]"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{t.transitLag}</p><p className="text-3xl font-black text-white">{selectedListing.shippingDays}</p></div><div className="frosted-glass p-8 text-center bg-white/[0.02]"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{t.socialTrust}</p><p className="text-3xl font-black text-white">{selectedListing.rating}</p></div></div>
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md z-[100] animate-in slide-in-from-bottom-20 duration-700">
          <div className={`frosted-glass p-3 flex items-center justify-between gap-3 shadow-[0_40px_100px_rgba(0,0,0,0.6)] border-white/20 bg-white/[0.08] backdrop-blur-3xl rounded-[2.5rem] ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={() => toggleWatch(selectedListing.productId)} className={`flex-1 h-20 rounded-[1.8rem] flex flex-col items-center justify-center transition-all ${isWatched ? 'bg-cyan-400 text-slate-900' : 'bg-white/5 text-slate-400'}`}><i className={`fa-solid ${isWatched ? 'fa-bell-on' : 'fa-bell-plus'} text-xl mb-1`}></i><span className="text-[9px] font-black uppercase tracking-widest">{isWatched ? t.tracking : t.watch}</span></button>
            <button onClick={() => window.open(selectedListing.url, '_blank')} className="flex-[3] h-20 rounded-[1.8rem] modern-gradient text-white flex items-center justify-center gap-3"><span className="font-black text-lg uppercase tracking-wider">{t.buyNow}</span><i className="fa-solid fa-cart-shopping-fast text-lg"></i></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`max-w-screen-sm mx-auto min-h-screen relative overflow-x-hidden pb-52 ${isRTL ? 'font-arabic' : ''}`}>
      {screen === 'HOME' && renderHome()}
      {screen === 'RESULTS' && renderResults()}
      {screen === 'COMPARE' && renderCompare()}
      {screen === 'CRYPTO_PAY' && renderCryptoGateway()}
      {screen === 'CARD_PAY' && renderCardGateway()}
      {screen === 'OZOW_PAY' && renderOzowGateway()}
      {screen === 'EFT_PAY' && renderEFTGateway()}
      
      {(screen === 'HOME' || screen === 'RESULTS') && !isLocked && (
        <div className="search-island">
          <div className={`frosted-glass p-2 flex items-center shadow-2xl bg-white/[0.03] ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 relative"><input type="text" placeholder={t.searchPlaceholder} className={`w-full bg-transparent py-6 text-xl font-medium text-white focus:outline-none placeholder:text-slate-600 ${isRTL ? 'pr-14 pl-6 text-right' : 'pl-14 pr-6 text-left'}`} onKeyDown={(e) => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)} /><i className={`fa-solid fa-magnifying-glass absolute top-1/2 -translate-y-1/2 text-white/20 text-xl ${isRTL ? 'right-6' : 'left-6'}`}></i></div>
            <div className={`flex gap-2 pr-2 ${isRTL ? 'pr-0 pl-2' : ''}`}><button onClick={() => setIsVoiceOpen(true)} className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-cyan-400 border border-white/10"><i className="fa-solid fa-microphone-lines"></i></button><button onClick={() => alert('Vision scan active')} className="w-16 h-16 rounded-full modern-gradient text-white flex items-center justify-center shadow-2xl"><i className="fa-solid fa-qrcode"></i></button></div>
          </div>
        </div>
      )}

      {screen !== 'COMPARE' && screen !== 'CRYPTO_PAY' && screen !== 'CARD_PAY' && screen !== 'OZOW_PAY' && screen !== 'EFT_PAY' && !isLocked && (
        <nav className={`nav-dock h-24 flex justify-around items-center px-10 animate-in fade-in duration-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setScreen('HOME')} className={`p-5 rounded-full transition-all ${screen === 'HOME' ? 'text-cyan-400 scale-125' : 'text-slate-600'}`}><i className="fa-solid fa-home-alt text-2xl"></i></button>
          <button onClick={() => setShowUpgradeModal(true)} className="p-5 rounded-full transition-all text-slate-600"><i className="fa-solid fa-sparkles text-2xl"></i></button>
          <button onClick={() => setShowUpgradeModal(true)} className="p-5 rounded-full transition-all text-slate-600"><i className="fa-solid fa-wallet text-2xl"></i></button>
        </nav>
      )}

      {(showUpgradeModal || isLocked) && screen === 'HOME' ? renderUpgradeModal() : null}
      
      {showLangMenu && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/90">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.languageSelect}</h2><button onClick={() => setShowLangMenu(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button></div>
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto no-scrollbar">{Object.keys(translations).map((l) => (<button key={l} onClick={() => { setLang(l as LanguageCode); setShowLangMenu(false); }} className={`p-5 rounded-2xl border transition-all flex items-center gap-3 ${lang === l ? 'border-cyan-400 bg-cyan-50 font-bold text-slate-900' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}><span className="capitalize">{new Intl.DisplayNames([l], { type: 'language' }).of(l)}</span></button>))}</div>
          </div>
        </div>
      )}

      <VoiceAssistant isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} onSearchResult={handleSearch} currentLang={lang} />
      {showConfetti && <Confetti />}

      {/* Non-intrusive truth banner */}
      <footer className="truth-banner">
        All prices pulled live. We don't stock, we don't sell – just showing the truth.
      </footer>

      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; } 
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .truth-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          background: white;
          color: #94a3b8;
          font-size: 10pt;
          text-align: center;
          padding: 8px 0;
          z-index: 100;
          font-weight: 500;
          opacity: 0;
          animation: subtleFadeIn 1s ease-out forwards;
          animation-delay: 1.5s;
          pointer-events: none;
        }

        @keyframes subtleFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
