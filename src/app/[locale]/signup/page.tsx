'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';

function SignupForm() {
  const t = useTranslations('auth');
  const tNav = useTranslations('nav');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      const targetUrl = callbackUrl || '/';
      window.location.href = targetUrl;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
      <div className="flex justify-center mb-4">
        <img src="/imgs/logo.png" alt="Zahra's Page Logo" className="h-16 md:h-20 w-auto object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-2 text-amber-500">{t('createAccount')}</h1>
      <p className="text-slate-400 text-sm text-center mb-6">{t('signupSubtext')}</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1">{t('nameLabel')}</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1">{t('emailLabel')}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1">Phone Number (Optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            placeholder="+2519..."
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1">{t('passwordLabel')}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 font-semibold text-slate-950 py-2.5 rounded text-sm transition disabled:opacity-50 mt-2"
        >
          {loading ? t('creatingAccount') : t('createAccount')}
        </button>
      </form>

      <p className="text-xs text-slate-500 text-center mt-6">
        {t('alreadyAccount')}{' '}
        <Link
          href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login'}
          className="text-amber-500 hover:underline font-semibold"
        >
          {tNav('logIn')}
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-amber-500 font-mono text-sm animate-pulse">Loading signup form...</div>}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
