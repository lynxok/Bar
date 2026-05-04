import { createContext, useContext, useState, ReactNode } from 'react';

interface AlertContextType {
  lowStockCount: number;
  setLowStockCount: (count: number) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [lowStockCount, setLowStockCount] = useState(0);

  return (
    <AlertContext.Provider value={{ lowStockCount, setLowStockCount }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}
