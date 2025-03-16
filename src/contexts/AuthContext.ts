
import { createContext } from 'react';

interface AuthContextType {
  user: any | null;
  profile: any | null;
  isLoading: boolean;
  error: Error | null;
  signOut?: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: false,
  error: null
});
