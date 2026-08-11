'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslations } from 'next-intl';
import { Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Plan {
  id: string;
  name: string;
  price: string | number;
  duration_days: number;
}

export default function MembershipPage() {
  const t = useTranslations('membership');
  const tNav = useTranslations('nav');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amountClaimed, setAmountClaimed] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    fetch('/api/membership-plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) {
          setPlans(data.plans);
          if (data.plans.length > 0) {
            setSelectedPlanId(data.plans[0].id);
            setAmountClaimed(data.plans[0].price.toString());
          }
        }
      });

    fetch(`/api/auth/me?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserStatus(data.user.membershipStatus);
        } else {
          window.location.href = '/login?callbackUrl=/membership';
        }
      })
      .catch(() => {
        window.location.href = '/login?callbackUrl=/membership';
      })
      .finally(() => setPageLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          reference_number: referenceNumber,
          amount_claimed: amountClaimed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payment');
      }

      setMessage({
        type: 'success',
        text: t('successMessage'),
      });
      setReferenceNumber('');
      // Immediately update local state to pending so form disappears on this session
      setUserStatus('pending_verification');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const navHeader = (
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
      <div>
        <h1 className="text-3xl font-bold text-amber-500">{t('title')}</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {t('subtitle')}
        </p>
      </div>
      <div className="flex items-center space-x-3">
        <LanguageSwitcher />
        <ThemeToggle />
        <Link
          href="/"
          className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 px-3 py-1.5 rounded transition"
        >
          ← {tNav('home')}
        </Link>
      </div>
    </div>
  );

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-200">
        <div className="max-w-3xl mx-auto space-y-8">
          {navHeader}
          <div className="text-amber-500 font-mono text-sm animate-pulse text-center py-16">Loading...</div>
        </div>
      </main>
    );
  }

  // ── ALREADY AN ACTIVE MEMBER ─────────────────────────────────────────────────
  if (userStatus === 'active') {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-200">
        <div className="max-w-3xl mx-auto space-y-8">
          {navHeader}
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-xl p-8 shadow-md dark:shadow-xl flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">You're already a member!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Your membership is currently active. You have full access to all exclusive videos on Zahra's Page.
            </p>
            <Link
              href="/"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-6 py-2.5 rounded-none tracking-wider transition mt-2"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── PENDING REVIEW ────────────────────────────────────────────────────────────
  if (userStatus === 'pending_verification') {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-200">
        <div className="max-w-3xl mx-auto space-y-8">
          {navHeader}
          <div className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-xl p-8 shadow-md dark:shadow-xl flex flex-col items-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payment Under Review</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Your payment submission is currently being reviewed by our team. We'll activate your membership as soon as it's verified — usually within 24 hours.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-4 py-2">
              Please do not resubmit — your payment is already in the queue.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <Link
                href="/account"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-5 py-2.5 rounded-none tracking-wider transition"
              >
                View My Account
              </Link>
              <Link
                href="/"
                className="border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase px-5 py-2.5 rounded-none tracking-wider transition"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── PAYMENT SUBMISSION FORM (free / expired users) ────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {navHeader}

        {/* Bank Transfer Details Section */}
        <div className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-xl p-6 shadow-md dark:shadow-xl space-y-4 transition-colors duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-lg border border-amber-500/30">
              CBE
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Commercial Bank of Ethiopia (CBE) Transfer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pay via bank transfer or CBE Birr app using the details below
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Bank Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Commercial Bank of Ethiopia
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Account Name</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400">
                Zahra Video Platform
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Account Number</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                1000 1234 5678 9
              </span>
            </div>
          </div>
        </div>

        {/* Payment Submission Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-md dark:shadow-xl transition-colors duration-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Submit Bank Transfer Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your CBE transaction reference number after completing the transfer.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`p-4 rounded text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                Select Membership Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  const p = plans.find((x) => x.id === e.target.value);
                  if (p) setAmountClaimed(p.price.toString());
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {plan.price} ETB ({plan.duration_days} Days)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                CBE Transaction Reference Number
              </label>
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                placeholder="FT24..."
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                Amount Claimed (ETB)
              </label>
              <input
                type="number"
                required
                value={amountClaimed}
                onChange={(e) => setAmountClaimed(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 font-bold text-slate-950 py-3 rounded-none text-xs uppercase tracking-wider transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Submitting Reference...' : 'Submit Payment Reference'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
