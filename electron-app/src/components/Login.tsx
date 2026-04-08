import { FormEvent, useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { ref, set } from 'firebase/database';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Create user profile with 'user' role by default
        await set(ref(db, `users/${uid}`), {
          email: email,
          role: 'user',
          created_at: new Date().getTime(),
        });

        setError('');
        onLogin();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setError('');
        onLogin();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      if (errorMessage.includes('auth/user-not-found')) {
        setError('Email tidak terdaftar. Buat akun terlebih dahulu.');
      } else if (errorMessage.includes('auth/wrong-password')) {
        setError('Password salah. Coba lagi.');
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        setError('Email sudah terdaftar. Silakan login.');
      } else if (errorMessage.includes('auth/weak-password')) {
        setError('Password terlalu lemah. Gunakan minimal 6 karakter.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          {isRegister ? 'Daftar Akun' : 'Login'} IoT Dashboard
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 transition"
          >
            {loading ? 'Loading...' : isRegister ? 'Daftar' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            disabled={loading}
            className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Admin akan upgrade akun Anda jika diperlukan.
        </p>
      </div>
    </div>
  );
}

