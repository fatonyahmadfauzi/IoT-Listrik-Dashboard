import { create } from 'zustand';

interface AppState {
  notifications: boolean;
  toggleNotifications: () => void;
}

export const useStore = create<AppState>((set) => ({
  notifications: true,
  toggleNotifications: () =>
    set((state) => ({
      notifications: !state.notifications,
    })),
}));
