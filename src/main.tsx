import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { BusinessProvider } from './contexts/BusinessContext.tsx';
import { AlertProvider } from './contexts/AlertContext.tsx';
import { StoreProvider } from './contexts/StoreContext.tsx';
import { LoggerService } from './lib/LoggerService';
import './index.css';

// Global Error Catching
window.onerror = (message, source, lineno, colno, error) => {
  LoggerService.error(`Unhandled Error: ${message}`, `${source}:${lineno}:${colno}`);
};

window.onunhandledrejection = (event) => {
  LoggerService.error(`Unhandled Promise Rejection: ${event.reason}`);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <BusinessProvider>
        <AlertProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </AlertProvider>
      </BusinessProvider>
    </BrowserRouter>
  </StrictMode>
);
