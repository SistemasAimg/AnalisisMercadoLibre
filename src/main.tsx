import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import WebhooksPage from './pages/WebhooksPage.tsx';
import AuthCallback from './components/AuthCallback.tsx';
import { checkSupabaseConnection } from './services/supabase';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Verificar la conexión a Supabase al iniciar la aplicación
checkSupabaseConnection()
  .then(connected => {
    if (!connected) {
      console.error('No se pudo establecer conexión con Supabase');
    }
  })
  .catch(error => {
    console.error('Error al verificar la conexión con Supabase:', error);
  });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<App />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  </StrictMode>
);