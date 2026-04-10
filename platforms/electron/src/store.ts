import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  notifications: boolean;
  toggleNotifications: () => void;
}

export const useStore = create<AppState>((set) => ({
  theme: 'light',
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
  notifications: true,
  toggleNotifications: () =>
    set((state) => ({
      notifications: !state.notifications,
    })),
}));