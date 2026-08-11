'use client';

import { useState, useEffect } from 'react';
import AdminDashboardClient from './AdminDashboardClient';
import AdminLoginForm from './AdminLoginForm';

export default function AdminPage() {
  const [session, setSession] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAdminSession = async () => {
    try {
      const res = await fetch(`/api/admin/me?_=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.user && (data.user.role === 'admin' || data.user.role === 'super_admin')) {
        setSession(data.user);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminSession();
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      window.location.href = '/admin-login';
    }
  }, [loading, session]);

  if (loading || !session) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-500 font-mono text-sm animate-pulse">Checking authorization...</div>
      </main>
    );
  }

  return (
    <AdminDashboardClient
      onLogout={() => {
        window.location.href = '/admin-login';
      }}
    />
  );
}
