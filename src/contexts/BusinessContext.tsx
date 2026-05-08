import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface BusinessContextType {
  businessName: string;
  setBusinessName: (name: string) => void;
  logo: string | null;
  setLogo: (logo: string | null) => void;
  taxRate: number;
  setTaxRate: (rate: number) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('bar_businessName') || 'GastroAnalytics');
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem('bar_logo'));
  const [taxRate, setTaxRate] = useState(() => Number(localStorage.getItem('bar_taxRate')) || 21);

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
    localStorage.setItem('bar_taxRate', taxRate.toString());
  }, [taxRate]);

  return (
    <BusinessContext.Provider value={{ businessName, setBusinessName, logo, setLogo, taxRate, setTaxRate }}>
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
