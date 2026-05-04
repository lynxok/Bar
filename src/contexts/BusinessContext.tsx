import { createContext, useContext, useState, ReactNode } from 'react';

interface BusinessContextType {
  businessName: string;
  setBusinessName: (name: string) => void;
  logo: string | null;
  setLogo: (logo: string | null) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businessName, setBusinessName] = useState('GastroAnalytics');
  const [logo, setLogo] = useState<string | null>(null);

  return (
    <BusinessContext.Provider value={{ businessName, setBusinessName, logo, setLogo }}>
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
