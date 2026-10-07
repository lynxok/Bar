import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PRICES_INCLUDE_TAX_KEY, TAX_RATE_KEY, readTaxSettings } from '../lib/pricing';

interface BusinessContextType {
  businessName: string;
  setBusinessName: (name: string) => void;
  logo: string | null;
  setLogo: (logo: string | null) => void;
  taxRate: number;
  setTaxRate: (rate: number) => void;
  /** true: los precios de la carta ya incluyen el impuesto (precio final) */
  pricesIncludeTax: boolean;
  setPricesIncludeTax: (v: boolean) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('bar_businessName') || 'GastroAnalytics');
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem('bar_logo'));
  // (antes `|| 21` impedía guardar 0%)
  const [taxRate, setTaxRate] = useState(() => readTaxSettings().taxRate);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(() => readTaxSettings().pricesIncludeTax);

  useEffect(() => {
    localStorage.setItem('bar_businessName', businessName);
  }, [businessName]);

  useEffect(() => {
    if (logo) {
      localStorage.setItem('bar_logo', logo);
    } else {
      localStorage.removeItem('bar_logo');
    }
  }, [logo]);

  useEffect(() => {
    localStorage.setItem(TAX_RATE_KEY, taxRate.toString());
  }, [taxRate]);

  useEffect(() => {
    localStorage.setItem(PRICES_INCLUDE_TAX_KEY, String(pricesIncludeTax));
  }, [pricesIncludeTax]);

  return (
    <BusinessContext.Provider value={{ businessName, setBusinessName, logo, setLogo, taxRate, setTaxRate, pricesIncludeTax, setPricesIncludeTax }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
