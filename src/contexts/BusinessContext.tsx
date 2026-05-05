import { createContext, useContext, useState, ReactNode } from 'react';

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
  const [businessName, setBusinessName] = useState('GastroAnalytics');
  const [logo, setLogo] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(21); // Default to 21%

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
