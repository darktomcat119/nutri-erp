import { create } from 'zustand';
import api from '@/lib/api';
import type { User } from '@/types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('nutri_token') : null,
  isLoading: true,

  login: async (email: string, password: string): Promise<void> => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user } = response.data.data;
    localStorage.setItem('nutri_token', access_token);
    set({ token: access_token, user, isLoading: false });
  },

  logout: (): void => {
    localStorage.removeItem('nutri_token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  loadUser: async (): Promise<void> => {
    try {
      const token = localStorage.getItem('nutri_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const response = await api.get('/auth/me');
      set({ user: response.data.data, isLoading: false });
    } catch {
      localStorage.removeItem('nutri_token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
