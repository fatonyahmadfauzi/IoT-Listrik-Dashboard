import { create } from 'zustand';
import { auth, db } from './firebase';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';

interface UserStore {
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
  error: string | null;
  initAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<UserStore>((set) => {
  let unsubscribeAuth: (() => void) | null = null;
  let unsubscribeRole: (() => void) | null = null;

  return {
    user: null,
    role: null,
    loading: true,
    error: null,

    initAuth: () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeRole) unsubscribeRole();

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        set({ user, error: null });

        if (user) {
          // Get user role from RTDB
          const roleRef = ref(db, `users/${user.uid}/role`);
          unsubscribeRole = onValue(
            roleRef,
            (snapshot) => {
              const role = snapshot.val() || 'user';
              set({ role: role as 'admin' | 'user', loading: false });
            },
            (error) => {
              console.error('Error fetching role:', error);
              set({ role: 'user', loading: false });
            }
          );
        } else {
          set({ role: null, loading: false });
        }
      });
    },

    logout: async () => {
      try {
        await signOut(auth);
        set({ user: null, role: null, error: null });
        if (unsubscribeRole) {
          unsubscribeRole();
          unsubscribeRole = null;
        }
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Logout failed' });
      }
    },
  };
});

// RTDB Data Store
interface ListrikData {
  arus: number;
  tegangan: number;
  apparent_power: number;
  relay: boolean;
  status: 'NORMAL' | 'WARNING' | 'LEAKAGE' | 'DANGER';
  updated_at: number;
}

interface DataStore {
  currentData: ListrikData | null;
  logs: any[];
  settings: any | null;
  users: any[];
  loading: boolean;
  unsubscribeAll: () => void;
  subscribeToData: () => void;
  subscribeLogs: (limit?: number) => void;
  subscribeSettings: () => void;
  subscribeUsers: () => void;
}

export const useDataStore = create<DataStore>((set) => {
  const unsubscribers: (() => void)[] = [];

  return {
    currentData: null,
    logs: [],
    settings: null,
    users: [],
    loading: true,

    unsubscribeAll: () => {
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers.length = 0;
    },

    subscribeToData: () => {
      const dataRef = ref(db, 'listrik');
      const unsub = onValue(
        dataRef,
        (snapshot) => {
          const data = snapshot.val();
          set({ currentData: data || null, loading: false });
        },
        (error) => {
          console.error('Error fetching data:', error);
          set({ loading: false });
        }
      );
      unsubscribers.push(() => off(dataRef));
    },

    subscribeLogs: (limit = 100) => {
      const logsRef = ref(db, `logs`);
      const unsub = onValue(
        logsRef,
        (snapshot) => {
          const data = snapshot.val();
          const logsArray = data
            ? Object.entries(data)
                .map(([key, val]) => ({
                  id: key,
                  ...(val as any),
                }))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, limit)
            : [];
          set({ logs: logsArray, loading: false });
        },
        (error) => {
          console.error('Error fetching logs:', error);
          set({ loading: false });
        }
      );
      unsubscribers.push(() => off(logsRef));
    },

    subscribeSettings: () => {
      const settingsRef = ref(db, 'settings');
      const unsub = onValue(
        settingsRef,
        (snapshot) => {
          const data = snapshot.val();
          set({ settings: data || null });
        },
        (error) => {
          console.error('Error fetching settings:', error);
        }
      );
      unsubscribers.push(() => off(settingsRef));
    },

    subscribeUsers: () => {
      const usersRef = ref(db, 'users');
      const unsub = onValue(
        usersRef,
        (snapshot) => {
          const data = snapshot.val();
          const usersArray = data
            ? Object.entries(data).map(([uid, val]) => ({
                uid,
                ...(val as any),
              }))
            : [];
          set({ users: usersArray });
        },
        (error) => {
          console.error('Error fetching users:', error);
        }
      );
      unsubscribers.push(() => off(usersRef));
    },
  };
});
