import { create } from 'zustand';
import { AuthUser } from '../types';
import { connectSocket, disconnectSocket } from '../services/socketClient';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth(user, token) {
    localStorage.setItem('ps_crm_token', token);
    localStorage.setItem('ps_crm_user', JSON.stringify(user));
    connectSocket(user.tenantId, user._id);
    // Store name globally for SMS simulation toasts
    (window as any).__ps_user_name = user.name;
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  clearAuth() {
    localStorage.removeItem('ps_crm_token');
    localStorage.removeItem('ps_crm_user');
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setLoading(isLoading) {
    set({ isLoading });
  },

  hydrate() {
    const token = localStorage.getItem('ps_crm_token');
    const userStr = localStorage.getItem('ps_crm_user');
    if (token && userStr) {
      try {
        const user: AuthUser = JSON.parse(userStr);
        connectSocket(user.tenantId, user._id);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));