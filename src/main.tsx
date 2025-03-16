
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Mount the app with strict mode disabled to avoid double-rendering issues with Supabase auth
createRoot(document.getElementById("root")!).render(<App />);
