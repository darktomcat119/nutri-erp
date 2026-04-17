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
    // Axios interceptor unwraps { data, message: "Success" }, so response.data is the controller payload directly.
    const payload = (response.data?.data ?? response.data) as { access_token: string; user: User };
    const { access_token, user } = payload;
    if (!access_token) throw new Error('Login response missing access_token');
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
      const user = (response.data?.data ?? response.data) as User;
      set({ user, isLoading: false });
    } catch {
      localStorage.removeItem('nutri_token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
