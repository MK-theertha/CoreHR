import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import App from './App';
import { ThemeProvider } from './hooks/useTheme';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
