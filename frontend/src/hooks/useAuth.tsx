import { createContext, useContext } from 'react';

import type { AppUser } from '../types';

export type AuthContextValue = {
  user: AppUser;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthContext.Provider');
  }

  return context;
}
