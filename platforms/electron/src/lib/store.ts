import { create } from 'zustand';
import { auth, db } from './firebase';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  ref,
  onValue,
  query,
  orderByKey,
  limitToLast,
  Query,
} from 'firebase/database';
import { startHybridListrik } from './hybridListrik';

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
  daya: number;
  apparent_power: number;
  energi_kwh: number;
  frekuensi: number;
  power_factor: number;
  relay: boolean;
  status: 'NORMAL' | 'WARNING' | 'LEAKAGE' | 'DANGER';
  updated_at: number;
}

interface DataStore {
  currentData: ListrikData | null;
  connectionMeta: Record<string, unknown> | null;
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
    connectionMeta: null,
    logs: [],
    settings: null,
    users: [],
    loading: true,

    unsubscribeAll: () => {
      unsubscribers.forEach((unsub) => unsub());
      unsubscribers.length = 0;
      set({ connectionMeta: null });
    },

    subscribeToData: () => {
      const unsub = startHybridListrik(db, {
        onData: (d) => {
          set({
            currentData: {
              arus: d.arus,
              tegangan: d.tegangan,
              daya: d.daya_w,
              apparent_power: d.daya,
              energi_kwh: d.energi_kwh,
              frekuensi: d.frekuensi,
              power_factor: d.power_factor,
              relay: d.relay === 1,
              status: d.status as ListrikData['status'],
              updated_at: d.updated_at ?? Date.now(),
            },
            loading: false,
          });
        },
        onMeta: (m) => set({ connectionMeta: m }),
      });
      unsubscribers.push(unsub);
    },

    subscribeLogs: (limit = 100) => {
      const logsRef = ref(db, `logs`);
      const logsQuery: Query = query(logsRef, orderByKey(), limitToLast(limit));
      const unsub = onValue(
        logsQuery,
        (snapshot) => {
          const data = snapshot.val();
          const logsArray = data
            ? Object.entries(data)
                .map(([key, val]) => {
                  const raw = val as any;

                  const arus = Number(raw?.arus ?? 0);
                  const tegangan = Number(raw?.tegangan ?? 0);

                  // RTDB ESP32 uses `waktu = millis()` (string or number).
                  const rawWaktu = raw?.timestamp ?? raw?.waktu ?? raw?.waktu_ms;
                  let timestamp = Number(rawWaktu);
                  if (!Number.isFinite(timestamp) || timestamp <= 0) {
                    // Handle ISO-like strings just in case.
                    const parsed = Date.parse(String(rawWaktu));
                    timestamp = Number.isFinite(parsed) ? parsed : 0;
                  }

                  // ESP32 stores relay as 0/1 (int). Normalize to boolean.
                  const relayRaw = raw?.relay ?? 0;
                  const relay =
                    typeof relayRaw === 'boolean'
                      ? relayRaw
                      : Number(relayRaw) === 1;

                  // Your analytics/chart expects `apparent_power`.
                  const pf = Number(raw?.power_factor ?? 0.85);
                  const apparent_power = arus * tegangan;
                  const daya = apparent_power * pf;

                  return {
                    id: key,
                    ...raw,
                    arus,
                    tegangan,
                    timestamp,
                    relay,
                    apparent_power,
                    daya,
                  };
                })
                // Prefer sorting by real timestamp, fallback to key order.
                .sort((a, b) => {
                  const ta = Number(a.timestamp || 0);
                  const tb = Number(b.timestamp || 0);
                  if (ta !== tb) return tb - ta;
                  return String(b.id).localeCompare(String(a.id));
                })
            : [];
          set({ logs: logsArray, loading: false });
        },
        (error) => {
          console.error('Error fetching logs:', error);
          set({ loading: false });
        }
      );
      unsubscribers.push(unsub);
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
          set({ settings: null });
        }
      );
      unsubscribers.push(unsub);
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
      unsubscribers.push(unsub);
    },
  };
});
