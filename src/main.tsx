import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeColorsProvider } from './providers/ThemeColorsProvider';
import { ToastProvider } from './components/Toast';
import { initLogoPreload } from './api/branding';
import { initTelegramWebApp } from './hooks/useTelegramWebApp';
import './i18n';
import './styles/globals.css';

// Initialize Telegram WebApp (expand, disable swipes)
initTelegramWebApp();

// Preload logo from cache immediately on page load
initLogoPreload();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeColorsProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeColorsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
