
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App.tsx';
import './index.css';
import { Toaster } from './components/ui/toaster';

// Mount the app with strict mode disabled to avoid double-rendering issues with Supabase auth
createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
    <Toaster />
  </AuthProvider>
);
