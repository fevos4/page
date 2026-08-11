'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from '@/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { User, Shield, Key, AlertCircle, Trash2, ArrowLeft, MoreVertical } from 'lucide-react';
import LoadingLogo from '@/components/LoadingLogo';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  membership_status?: string;
  created_at: string;
}

export default function ManageAdminsClient() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openAdminMenuId, setOpenAdminMenuId] = useState<string | null>(null);

  // Custom confirmation modal state for Manage Admins
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    isOpen: boolean;
    type: 'toggle' | 'terminate';
    adm: AdminAccount | null;
    loading: boolean;
  }>({
    isOpen: false,
    type: 'toggle',
    adm: null,
    loading: false,
  });

  const triggerAdminActionModal = (type: 'toggle' | 'terminate', adm: AdminAccount) => {
    setOpenAdminMenuId(null);
    setActionConfirmModal({
      isOpen: true,
      type,
      adm,
      loading: false,
    });
  };

  const handleConfirmAdminAction = async () => {
    if (!actionConfirmModal.adm) return;
    const { type, adm } = actionConfirmModal;

    setActionConfirmModal((prev) => ({ ...prev, loading: true }));

    try {
      if (type === 'terminate') {
        const res = await fetch(`/api/admin/members/${adm.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to terminate admin account');
        }
      } else {
        const isDeactivating = adm.membership_status !== 'expired';
        const action = isDeactivating ? 'deactivate' : 'activate';
        const res = await fetch(`/api/admin/members/${adm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update admin account status');
        }
      }

      setActionConfirmModal({ isOpen: false, type: 'toggle', adm: null, loading: false });
      fetchAdmins();
    } catch (err: any) {
      alert(err.message);
      setActionConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

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
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{adm.name}</td>
                    <td className="p-3 font-mono text-slate-500">{adm.email}</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold ${
                            adm.role === 'super_admin'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              : 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20'
                          } border`}
                        >
                          {adm.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'}
                        </span>
                        {adm.membership_status === 'expired' && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-500/20 text-red-500 rounded border border-red-500/30">
                            DEACTIVATED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(adm.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenAdminMenuId(openAdminMenuId === adm.id ? null : adm.id);
                        }}
                        className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition"
                        title="Account options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openAdminMenuId === adm.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenAdminMenuId(null)}
                          />
                          <div className="absolute right-3 top-10 z-20 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 text-left">
                            <button
                              onClick={() => triggerAdminActionModal('toggle', adm)}
                              className="w-full px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center space-x-2 transition border-b border-slate-100 dark:border-slate-800"
                            >
                              <span>{adm.membership_status === 'expired' ? 'Activate Account' : 'Deactivate Account'}</span>
                            </button>
                            <button
                              onClick={() => triggerAdminActionModal('terminate', adm)}
                              className="w-full px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center space-x-2 transition"
                            >
                              <span>Terminate Account</span>
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Action Modal for Manage Admins */}
      {actionConfirmModal.isOpen && actionConfirmModal.adm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>
                  {actionConfirmModal.type === 'terminate'
                    ? 'Terminate Admin Account'
                    : actionConfirmModal.adm.membership_status === 'expired'
                    ? 'Activate Admin Account'
                    : 'Deactivate Admin Account'}
                </span>
              </h3>
              <button
                onClick={() =>
                  setActionConfirmModal({ isOpen: false, type: 'toggle', adm: null, loading: false })
                }
                className="text-slate-400 hover:text-slate-100 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 py-1">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {actionConfirmModal.type === 'terminate' ? (
                  <>
                    Are you sure you want to permanently terminate the admin account for{' '}
                    <strong className="text-amber-500">{actionConfirmModal.adm.name}</strong> (
                    <span className="font-mono text-slate-400">{actionConfirmModal.adm.email}</span>)?
                    <span className="block mt-2 text-red-500 font-semibold">
                      This action cannot be undone and will permanently revoke administrator rights.
                    </span>
                  </>
                ) : actionConfirmModal.adm.membership_status === 'expired' ? (
                  <>
                    Are you sure you want to <strong className="text-emerald-500">REACTIVATE</strong> the admin account for{' '}
                    <strong className="text-amber-500">{actionConfirmModal.adm.name}</strong> (
                    <span className="font-mono text-slate-400">{actionConfirmModal.adm.email}</span>)?
                    <span className="block mt-2 text-slate-400">
                      This administrator will regain access to the admin portal immediately.
                    </span>
                  </>
                ) : (
                  <>
                    Are you sure you want to <strong className="text-amber-500">DEACTIVATE</strong> the admin account for{' '}
                    <strong className="text-amber-500">{actionConfirmModal.adm.name}</strong> (
                    <span className="font-mono text-slate-400">{actionConfirmModal.adm.email}</span>)?
                    <span className="block mt-2 text-amber-500/90 font-medium">
                      They will be blocked from logging into the admin portal until reactivated.
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setActionConfirmModal({ isOpen: false, type: 'toggle', adm: null, loading: false })
                }
                disabled={actionConfirmModal.loading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAdminAction}
                disabled={actionConfirmModal.loading}
                className={`px-5 py-2 text-xs font-bold text-slate-950 rounded transition disabled:opacity-50 ${
                  actionConfirmModal.type === 'terminate'
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : actionConfirmModal.adm.membership_status === 'expired'
                    ? 'bg-emerald-400 hover:bg-emerald-300'
                    : 'bg-amber-400 hover:bg-amber-300'
                }`}
              >
                {actionConfirmModal.loading
                  ? 'Processing...'
                  : actionConfirmModal.type === 'terminate'
                  ? 'Confirm Termination'
                  : actionConfirmModal.adm.membership_status === 'expired'
                  ? 'Confirm Activation'
                  : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
