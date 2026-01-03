import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  settings: Record<string, unknown>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.login(email, password);
          api.setToken(data.access_token);
          set({
            user: data.user,
            token: data.access_token,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Login failed",
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.register(email, password, name) as {
            access_token: string;
            user: User;
          };
          api.setToken(data.access_token);
          set({
            user: data.user,
            token: data.access_token,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Registration failed",
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, token: null });
      },

      loadUser: async () => {
        const { token } = get();
        if (!token) return;

        api.setToken(token);
        try {
          const user = await api.getMe() as User;
          set({ user });
        } catch {
          set({ user: null, token: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
);

