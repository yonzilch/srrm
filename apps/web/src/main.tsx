import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { I18nProvider } from './contexts/I18nContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Fetch runtime config (background URL) before rendering
async function initApp() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const config = await res.json() as { backgroundUrl?: string };
      if (config.backgroundUrl) {
        document.documentElement.classList.add('has-bg');
        document.documentElement.style.setProperty('--bg-image-url', `url(${config.backgroundUrl})`);
      }
    }
  } catch {
    // Silently ignore — background is optional
  }

  const queryClient = new QueryClient();
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <I18nProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </I18nProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

initApp();