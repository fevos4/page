'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslations } from 'next-intl';
import { User, Lock, AlertTriangle, LogOut, CheckCircle } from 'lucide-react';
import LoadingLogo from '@/components/LoadingLogo';
import { motion, AnimatePresence } from 'framer-motion';

interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: string;
  membershipStatus: string;
}

export default function SettingsPage() {
  const t = useTranslations('account');
  const tNav = useTranslations('nav');

  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Name
  const [name, setName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Membership Cancellation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetch(`/api/auth/me?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setName(data.user.name);
        } else {
          router.push('/login?callbackUrl=/account/settings');
        }
      })
      .catch(() => {
        router.push('/login?callbackUrl=/account/settings');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMsg(null);
    setNameLoading(true);

    try {
      const res = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update name');

      setNameMsg({ type: 'success', text: 'Name updated successfully!' });
      if (user) setUser({ ...user, name: data.user.name });
    } catch (err: any) {
      setNameMsg({ type: 'error', text: err.message });
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setPassLoading(true);

    try {
      const res = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message });
    } finally {
      setPassLoading(false);
    }
  };

  const handleConfirmCancelMembership = async () => {
    setCancelMsg(null);
    setCancelLoading(true);

    try {
      const res = await fetch('/api/account/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_membership' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel membership');

      setShowCancelModal(false);
      setCancelMsg({ type: 'success', text: 'Membership cancelled.' });
      if (user) setUser({ ...user, membershipStatus: 'expired' });
    } catch (err: any) {
      setCancelMsg({ type: 'error', text: err.message });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center font-sans">
        <div className="text-amber-500 font-mono text-sm animate-pulse">Loading settings...</div>
      </div>
    );
  }

  if (!user) return null;

  const renderMembershipSection = () => {
    switch (user.membershipStatus) {
      case 'active':
        return (
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-red-600 dark:text-red-400 block">{t('cancelMembership')}</span>
              <span className="text-[11px] text-slate-500">
                {t('cancelConfirmBody')}
              </span>
            </div>
            <button
              onClick={() => setShowCancelModal(true)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/30 text-xs font-bold px-4 py-2 rounded transition flex-shrink-0"
            >
              {t('cancelMembership')}
            </button>
          </div>
        );

      case 'pending_verification':
        return (
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded border border-amber-500/30">
              {t('pendingMessage')}
            </p>
          </div>
        );

      case 'expired':
        return (
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-500 block">{tNav('becomeMember')}</span>
              <span className="text-[11px] text-slate-500">
                {t('freeMessage')}
              </span>
            </div>
            <Link
              href="/membership"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-4 py-2 rounded-none tracking-wider transition flex-shrink-0"
            >
              {tNav('becomeMember')}
            </Link>
          </div>
        );

      case 'free':
      default:
        return (
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{tNav('becomeMember')}</span>
              <span className="text-[11px] text-slate-500">
                {t('freeMessage')}
              </span>
            </div>
            <Link
              href="/membership"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-4 py-2 rounded-none tracking-wider transition flex-shrink-0"
            >
              {tNav('becomeMember')}
            </Link>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 font-sans transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-amber-500 font-display uppercase tracking-wide">
              {t('settings')}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/account"
              className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded transition"
            >
              ← {t('title')}
            </Link>
          </div>
        </div>

        {/* 1. Edit Name Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
            <User className="w-4 h-4 text-amber-500" />
            <span>Profile Information</span>
          </div>

          <AnimatePresence mode="wait">
            {nameMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`p-3 rounded text-xs border ${
                  nameMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
                }`}
              >
                {nameMsg.text}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email Address (Read-only)</label>
              <input
                type="text"
                disabled
                value={user.email}
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={nameLoading}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-5 py-2 rounded-none tracking-wider transition disabled:opacity-50"
            >
              {nameLoading ? 'Saving...' : 'Save Name'}
            </button>
          </form>
        </div>

        {/* 2. Change Password Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Security & Password</span>
          </div>

          {passMsg && (
            <div
              className={`p-3 rounded text-xs border ${
                passMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
              }`}
            >
              {passMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Password (Required for verification)
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-5 py-2 rounded-none tracking-wider transition disabled:opacity-50"
            >
              {passLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* 3. Membership Cancellation & Logout Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Session & Membership Actions</h3>
              <p className="text-xs text-slate-500">Manage active login session or cancel membership</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase px-4 py-2 rounded-none tracking-wider transition flex items-center space-x-2"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              <span>Log Out</span>
            </button>
          </div>

          {cancelMsg && (
            <div
              className={`p-3 rounded text-xs border ${
                cancelMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
              }`}
            >
              {cancelMsg.text}
            </div>
          )}

          {renderMembershipSection()}
        </div>
      </div>

      {/* Confirmation Modal for Membership Cancellation */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-500">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold">Confirm Membership Cancellation</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Cancelling immediately ends your access, including any remaining days you&apos;ve already paid for. This cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
              >
                Nevermind, keep active
              </button>
              <button
                onClick={handleConfirmCancelMembership}
                disabled={cancelLoading}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded transition disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, cancel my membership'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
