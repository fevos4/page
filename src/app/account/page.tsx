'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { User, Shield, CreditCard, LogOut, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: string;
  membershipStatus: string;
  membershipExpiryDate?: string | null;
}

export default function AccountPage() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login?callbackUrl=/account');
        }
      })
      .catch(() => {
        router.push('/login?callbackUrl=/account');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center font-sans">
        <div className="text-amber-500 font-mono text-sm animate-pulse">Loading account profile...</div>
      </div>
    );
  }

  if (!user) return null;

  const isActive = user.membershipStatus === 'active';
  const isPending = user.membershipStatus === 'pending_verification';

  const formattedExpiry = user.membershipExpiryDate
    ? new Date(user.membershipExpiryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 font-sans transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-amber-500 font-display uppercase tracking-wide">
              My Account
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Manage your membership status and personal profile
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Link
              href="/"
              className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded transition"
            >
              ← Back to Library
            </Link>
          </div>
        </div>

        {/* Account Details Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-full bg-amber-400/10 text-amber-500 border border-amber-400/30 flex items-center justify-center font-bold text-xl">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold uppercase px-3 py-1 bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-400/20">
              {user.role}
            </span>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Membership Status
              </span>
              <div className="flex items-center space-x-2">
                {isActive ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Active Member</span>
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending Verification</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Not an Active Member</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Membership Expiry
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {isActive && formattedExpiry ? `Active until ${formattedExpiry}` : '—'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/membership"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-6 py-2.5 rounded-none tracking-wider transition flex items-center space-x-2 shadow"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isActive ? 'Renew Membership' : 'Become a Member'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/account/settings"
                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase px-5 py-2.5 rounded-none tracking-wider transition flex items-center space-x-2"
              >
                <span>Account Settings</span>
              </Link>
            </div>

            <button
              onClick={handleLogout}
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase px-5 py-2.5 rounded-none tracking-wider transition flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
