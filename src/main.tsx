import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { BusinessProvider } from './contexts/BusinessContext.tsx';
import { AlertProvider } from './contexts/AlertContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <BusinessProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </BusinessProvider>
    </BrowserRouter>
  </StrictMode>
);
