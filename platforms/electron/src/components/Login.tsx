import { FormEvent, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { ShieldCheck, UserPlus, Zap } from 'lucide-react';
import { auth, db } from '../lib/firebase';

interface LoginProps {
  onLogin: () => void;
}

type AuthMode = 'login' | 'register';

const inputClass =
  'w-full rounded-lg border border-slate-700/90 bg-slate-950/55 px-4 py-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400/70 focus:ring-4 focus:ring-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60';

export function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const nextEmail = email.trim();
    const nextPassword = password.trim();
    const nextDisplayName = displayName.trim();

    if (isRegister && !nextDisplayName) {
      setError('Nama lengkap wajib diisi.');
      return;
    }
    if (!nextEmail || !nextPassword) {
      setError('Email dan password wajib diisi.');
      return;
    }
    if (isRegister && nextPassword.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, nextEmail, nextPassword);
        const uid = userCredential.user.uid;

        await updateProfile(userCredential.user, {
          displayName: nextDisplayName,
        });

        await update(ref(db, `users/${uid}`), {
          email: nextEmail,
          displayName: nextDisplayName,
          role: 'user',
          created_at: new Date().getTime(),
        });
      } else {
        await signInWithEmailAndPassword(auth, nextEmail, nextPassword);
      }

      setError('');
      onLogin();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('auth/invalid-credential')) {
        setError('Email atau password tidak sesuai.');
      } else if (errorMessage.includes('auth/wrong-password')) {
        setError('Password salah. Coba lagi.');
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        setError('Email sudah terdaftar. Silakan login.');
      } else if (errorMessage.includes('auth/weak-password')) {
        setError('Password terlalu lemah. Gunakan minimal 8 karakter.');
      } else if (errorMessage.includes('auth/invalid-email')) {
        setError('Format email tidak valid.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#05070b] px-4 py-10 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(37,99,235,0.12),_transparent_28%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <section className="w-full max-w-[460px] rounded-xl border border-slate-700/80 bg-slate-900/72 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-9">
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-sky-400/35 bg-gradient-to-br from-sky-400 to-blue-700 text-white shadow-[0_18px_45px_rgba(14,165,233,0.28)]">
              <Zap className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-black tracking-tight text-white">
              IoT Listrik Monitor
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-400">
              Alat Deteksi Kebocoran Arus Berbasis IoT
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-lg border border-slate-700/80 bg-slate-950/45 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              disabled={loading}
              className={`min-h-10 rounded-md text-sm font-black transition ${
                mode === 'login'
                  ? 'bg-slate-700/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              disabled={loading}
              className={`min-h-10 rounded-md text-sm font-black transition ${
                mode === 'register'
                  ? 'bg-slate-700/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {isRegister && (
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.09em] text-slate-300">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  disabled={loading}
                  className={inputClass}
                  placeholder="Nama Anda"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.09em] text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="email@contoh.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.09em] text-slate-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder={isRegister ? 'Minimal 8 karakter' : 'Masukkan password'}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold leading-6 text-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-sky-300/35 bg-gradient-to-r from-sky-500 to-blue-700 px-4 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(14,165,233,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRegister ? <UserPlus className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? 'Memproses...' : isRegister ? 'Daftar Akun Baru' : 'Masuk'}
            </button>
          </form>

          {isRegister && (
            <p className="mx-auto mt-5 max-w-xs text-center text-sm leading-6 text-slate-400">
              Akun baru akan memiliki role <span className="font-black text-slate-200">User</span>.
              Hubungi admin untuk upgrade ke Admin.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
