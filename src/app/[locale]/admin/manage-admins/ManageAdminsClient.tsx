'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from '@/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { User, Shield, Key, AlertCircle, Trash2, ArrowLeft } from 'lucide-react';
import LoadingLogo from '@/components/LoadingLogo';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

export default function ManageAdminsClient() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New admin form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');

  const router = useRouter();

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`/api/admin/create-admin-account?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
      });

      if (res.status === 403) {
        // Forbidden: Redirect back to home
        router.push('/');
        return;
      }

      const data = await res.json();
      if (data.admins) {
        setAdmins(data.admins);
      }
    } catch (err) {
      console.error('Error fetching admin accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitLoading(true);

    try {
      const res = await fetch('/api/admin/create-admin-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create admin account');
      }

      setSuccess(`Admin account "${name}" created successfully!`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('admin');
      fetchAdmins();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-sans">
        <LoadingLogo />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 space-y-6 transition-colors duration-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <img src="/imgs/logo.png" alt="Zahra's Page Logo" className="h-12 md:h-14 w-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-amber-500">Manage Admin Accounts</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create and manage platform administrators
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link
            href="/admin"
            className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded transition flex items-center space-x-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">
            Create Admin Account
          </h3>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 text-xs p-3 rounded flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Temporary Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Administrator Tier
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="admin">Admin (General Permissions)</option>
                <option value="super_admin">Super Admin (All permissions + Create Admins)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold py-2 rounded-none uppercase tracking-wider transition disabled:opacity-50"
            >
              {submitLoading ? 'Creating admin account...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Admins Table/List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">
            Registered Administrators
          </h3>

          <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{adm.name}</td>
                    <td className="p-3 font-mono text-slate-500">{adm.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold ${
                          adm.role === 'super_admin'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            : 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20'
                        } border`}
                      >
                        {adm.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(adm.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
